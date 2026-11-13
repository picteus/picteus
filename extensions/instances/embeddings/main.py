import asyncio
import io
import logging
import os
import ssl
import threading
from typing import Optional, Callable, List

from PIL import Image
from PIL.ImageFile import ImageFile
from picteus_extension_sdk import PicteusExtension, Communicator, Versions, \
    CommandParameters, ComputeImageEmbedding, SettingsValue
from picteus_ws_client import ImageFormat, ImageEmbedding, ImageResizeRender, SearchParameters, AiModel, AiModelModality

os.environ["HF_HOME"] = PicteusExtension.get_cache_directory_path()


class Embeddings(PicteusExtension):
    clip_technical_id: str = "clip"

    dino_technical_id: str = "dino"

    def __init__(self) -> None:
        super().__init__()
        self.models_lock = threading.Lock()
        self.semaphore: Optional[asyncio.Semaphore] = None
        self.device: Optional[str] = None
        self.clip_model = None
        self.clip_preprocess: Optional[Callable] = None
        self.dino_model = None
        self.dino_processor: Optional[Callable] = None

    async def initialize(self) -> bool:
        self.semaphore = asyncio.Semaphore(1)
        return True

    async def on_upgrade(self, communicator: Communicator, versions: Versions) -> None:
        pass

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        await self._send_available_ai_models()

    async def on_compute_image_embeddings(self, communicator: Communicator, image_id: str,
                                          embeddings: List[ComputeImageEmbedding]) -> None:
        clip_requested = any(
            embedding.get("aiModel", {}).get("technicalId") == Embeddings.clip_technical_id for embedding in embeddings)
        dino_requested = any(
            embedding.get("aiModel", {}).get("technicalId") == Embeddings.dino_technical_id for embedding in embeddings)
        if not clip_requested and not dino_requested:
            return
        await self._compute_image_embeddings(communicator, image_id, clip_requested, dino_requested)
        await self.run_in_executor(self._clean_up_torch)

    async def on_process_command(self, communicator: Communicator, command_id: str,
                                 parameters: CommandParameters) -> None:
        if command_id == "compute":
            collection_id: int = parameters["collectionId"]
            clip_enabled: bool = parameters["clipEnabled"]
            dino_enabled: bool = parameters["dinoEnabled"]
            search_result = await self.run_in_executor(
                lambda: self.get_image_api().image_search_ids(
                    search_parameters=SearchParameters(collection_id=collection_id)))
            items = search_result.items
            communicator.send_log(
                f"Found {len(items)} images in the collection with id '{collection_id}': now, computing their embeddings…",
                "info")
            await self._compute_images_embeddings(communicator, items, clip_enabled, dino_enabled)

    async def on_compute_text_embeddings(self, communicator: Communicator, text: str,
                                         ai_model: Optional[AiModel] = None) -> list[float]:
        result = await self.run_in_executor(lambda: self._compute_clip_text_embedding(communicator, text))
        await self.run_in_executor(self._clean_up_torch)
        return result

    async def _compute_images_embeddings(self, communicator: Communicator, ids: List[str], clip_enabled: bool,
                                         dino_enabled: bool) -> None:
        images_count = len(ids)
        for index, image_id in enumerate(ids):
            percentage = int(((index + 1) / images_count) * 100)
            communicator.for_entity({"type": "image", "id": image_id})
            communicator.send_log(
                f"Processing the image at index {index + 1}/{images_count} ({percentage}%), image",
                "info")
            try:
                await self._compute_image_embeddings(communicator, image_id, clip_enabled, dino_enabled)
            except Exception as exception:
                communicator.send_log(f"Failed to process the image. Reason: '{exception}'",
                                      "error")
        await self.run_in_executor(self._clean_up_torch)

    async def _compute_image_embeddings(self, communicator: Communicator, image_id: str, clip_enabled: bool,
                                        dino_enabled: bool) -> None:
        async with self._get_semaphore():
            image: bytearray = await self.run_in_executor(
                lambda: self.get_image_api().image_download(id=image_id, format=ImageFormat.PNG, width=256,
                                                            height=256, resize_render=ImageResizeRender.OUTBOX,
                                                            strip_metadata=True))
            pil_image: ImageFile = Image.open(io.BytesIO(image))

            await self.run_in_executor(lambda: self._ensure_models(clip_enabled, dino_enabled))

            new_embeddings: List[ImageEmbedding] = []

            if clip_enabled:
                image_embedding: list[float] = await self.run_in_executor(
                    lambda: self._compute_clip_image_embedding(communicator, image_id, pil_image))
                new_embeddings.append(ImageEmbedding(id=Embeddings.clip_technical_id, values=image_embedding))

            if dino_enabled:
                dino_embedding: list[float] = await self.run_in_executor(
                    lambda: self._compute_dino_image_embedding(communicator, image_id, pil_image))
                new_embeddings.append(ImageEmbedding(id=Embeddings.dino_technical_id, values=dino_embedding))

            pil_image.close()

            if len(new_embeddings) > 0:
                await self.run_in_executor(
                    lambda: self.get_image_api().image_ensure_embeddings(id=image_id, extension_id=self.extension_id,
                                                                         image_embedding=new_embeddings))

    async def _compute_text_embeddings(self, communicator: Communicator, text: str) -> list[float]:
        return await self.run_in_executor(lambda: self._compute_clip_text_embedding(communicator, text))

    def _compute_clip_image_embedding(self, communicator: Communicator, image_id: str, image: ImageFile) -> list[float]:
        import torch
        communicator.send_log(f"Computing the CLIP image embeddings for the image", "info")
        image_preprocess = self.clip_preprocess(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            image_features = self.clip_model.encode_image(image_preprocess)
        return image_features.cpu().detach().numpy().tolist()[0]

    def _compute_clip_text_embedding(self, communicator: Communicator, text: str) -> list[float]:
        import clip
        import torch
        communicator.send_log(f"Computing text embeddings for the text {text}", "info")
        self._ensure_models(True, False)
        tokens = clip.tokenize([text]).to(self.device)
        with torch.no_grad():
            text_features = self.clip_model.encode_text(tokens)
        return text_features.cpu().detach().numpy().tolist()[0]

    def _compute_dino_image_embedding(self, communicator: Communicator, image_id: str, image: ImageFile) -> list[float]:
        import torch
        communicator.send_log(f"Computing the DINO image embeddings for the image", "info")
        inputs = self.dino_processor(images=image.convert("RGB"), return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.dino_model(**inputs)
            image_features = outputs.last_hidden_state[:, 0, :]
        return image_features.cpu().detach().numpy().tolist()[0]

    def _ensure_models(self, clip_enabled: bool, dino_enabled: bool) -> None:
        import torch
        with self.models_lock:
            if self.device is None:
                self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.mps.is_available() else "cpu")
            if self.clip_model is None and clip_enabled == True:
                import clip
                # We need to go through this horrible monkey-patch inspired from https://stackoverflow.com/a/28052583/808618, because the location of the CLIP tensor files causes issue as far as their SSL certificate are concerned
                save_create_default_https_context = ssl._create_default_https_context
                ssl._create_default_https_context = ssl._create_unverified_context
                model_name = "ViT-B/32"
                try:
                    logging.info(f"Loading the '{model_name}' model")
                    self.clip_model, self.clip_preprocess = clip.load(name=model_name, device=self.device, jit=False,
                                                                      download_root=PicteusExtension.get_cache_directory_path())
                    self.clip_model.float()
                    self.clip_model.eval()
                finally:
                    ssl._create_default_https_context = save_create_default_https_context
            if self.dino_model is None and dino_enabled == True:
                from transformers import AutoImageProcessor, AutoModel
                model_name = "facebook/dinov2-base"
                logging.info(f"Loading the '{model_name}' model")
                cache_dir = PicteusExtension.get_cache_directory_path()
                self.dino_processor = AutoImageProcessor.from_pretrained(model_name, cache_dir=cache_dir)
                self.dino_model = AutoModel.from_pretrained(model_name, cache_dir=cache_dir).to(self.device)
                self.dino_model.eval()

    def _clean_up_torch(self) -> None:
        if self.device == "mps":
            import torch
            if hasattr(torch, "mps"):
                torch.mps.synchronize()
                torch.mps.empty_cache()

    def _get_semaphore(self) -> asyncio.Semaphore:
        if self.semaphore is None:
            self.semaphore = asyncio.Semaphore(1)
        return self.semaphore

    async def _send_available_ai_models(self) -> None:
        await self.run_in_executor(
            lambda: self.get_extension_api().extension_set_ai_models(
                id=self.extension_id,
                ai_model=[
                    AiModel(
                        technical_id=Embeddings.clip_technical_id,
                        name="CLIP",
                        comment="Computes image and text embeddings with ViT-B/32",
                        modalities=[AiModelModality.IMAGE_DOT_EMBEDDINGS, AiModelModality.TEXT_DOT_EMBEDDINGS]
                    ),
                    AiModel(
                        technical_id=Embeddings.dino_technical_id,
                        name="DINO v2",
                        comment="Computes image embeddings with DINO v2",
                        modalities=[AiModelModality.IMAGE_DOT_EMBEDDINGS]
                    )
                ]
            )
        )


asyncio.run(Embeddings().run())
