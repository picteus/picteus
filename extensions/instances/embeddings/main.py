import asyncio
import io
import logging
import os
import ssl
import threading
from typing import Any, Optional, Callable, List

import clip
import torch
from PIL import Image
from PIL.ImageFile import ImageFile
from picteus_extension_sdk import PicteusExtension, EventName, Communicator, SettingsValue, EventValue, Versions
from picteus_ws_client import ImageFormat, ImageEmbedding, ImageResizeRender, SearchParameters, SearchFilter

os.environ["HF_HOME"] = PicteusExtension.get_cache_directory_path()
from transformers import AutoImageProcessor, AutoModel


class Embeddings(PicteusExtension):

    def __init__(self) -> None:
        super().__init__()
        self.models_lock = threading.Lock()
        self.device: Optional[str] = None
        self.clip_model = None
        self.clip_preprocess: Optional[Callable] = None
        self.dino_model = None
        self.dino_processor: Optional[Callable] = None
        self.clip_enabled: bool = False
        self.dino_enabled: bool = False

    async def on_upgrade(self, communicator: Communicator, versions: Versions) -> None:
        if versions.current == "0.4.0":
            await self._reset_embeddings(communicator)

    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        self._setup(value)

    async def on_event(self, communicator: Communicator, event: EventName, value: EventValue) -> Any | None:
        if event == EventName.PROCESS_RUN_COMMAND:
            command_id = value.get("commandId")
            if command_id == "compute":
                parameters = value.get("parameters", {})
                collection_id = parameters.get("collectionId")
                clip_enabled = parameters.get("clipEnabled", True)
                dino_enabled = parameters.get("dinoEnabled", True)
                if collection_id:
                    return await self._handle_compute_command(communicator, collection_id, clip_enabled, dino_enabled)
                return None
        elif event == EventName.IMAGE_CREATED or event == EventName.IMAGE_UPDATED or event == EventName.IMAGE_COMPUTE_EMBEDDINGS:
            image_id: str = value["id"]
            return await self._compute_image_embeddings(communicator, image_id, self.clip_enabled, self.dino_enabled)
        elif event == EventName.TEXT_COMPUTE_EMBEDDINGS:
            text: str = value["text"]
            return await self._compute_text_embeddings(communicator, text)

        return None

    async def _handle_compute_command(self, communicator: Communicator, collection_id: str, clip_enabled: bool,
                                      dino_enabled: bool) -> None:
        search_result = self.get_image_api().image_search_ids(SearchParameters(collection_id=collection_id))
        items = search_result.items
        communicator.send_log(
            f"Found {len(items)} images in the collection with id '{collection_id}': now, computing their embeddings…",
            "info")
        await self._compute_images_embeddings(communicator, items, clip_enabled, dino_enabled)

    async def _compute_images_embeddings(self, communicator: Communicator, ids: List[str], clip_enabled: bool,
                                         dino_enabled: bool):
        images_count = len(ids)
        for index, image_id in enumerate(ids):
            percentage = int(((index + 1) / images_count) * 100)
            communicator.send_log(
                f"Processing the image at index {index + 1}/{images_count} ({percentage}%), image with id '{image_id}'",
                "info")
            try:
                await self._compute_image_embeddings(communicator, image_id, clip_enabled, dino_enabled)
            except Exception as exception:
                communicator.send_log(f"Failed to process the image with id '{image_id}'. Reason: '{exception}'",
                                      "error")

    async def _compute_image_embeddings(self, communicator: Communicator, image_id: str, clip_enabled: bool,
                                        dino_enabled: bool) -> None:
        image: bytearray = self.get_image_api().image_download(id=image_id, format=ImageFormat.PNG, width=1_000,
                                                               height=1_000, resize_render=ImageResizeRender.OUTBOX,
                                                               strip_metadata=True)
        pil_image: ImageFile = Image.open(io.BytesIO(image))

        self._ensure_models(clip_enabled, dino_enabled)

        try:
            existing_embeddings = self.get_image_api().image_get_embeddings(id=image_id,
                                                                            extension_id=self.extension_id).embeddings
        except Exception as exception:
            communicator.send_log(
                f"Could not retrieve the existing embeddings for image '{image_id}': overwriting its value. Reason: '{exception}'",
                "warn")
            existing_embeddings = []

        embeddings_dict = {embedding.name: embedding for embedding in existing_embeddings}

        if clip_enabled == True:
            image_embedding: list[float] = await self.run_in_executor(
                lambda: self._compute_clip_image_embedding(communicator, image_id, pil_image))
            embeddings_dict["clip"] = ImageEmbedding(name="clip", values=image_embedding)

        if dino_enabled == True:
            dino_embedding: list[float] = await self.run_in_executor(
                lambda: self._compute_dino_image_embedding(communicator, image_id, pil_image))
            embeddings_dict["dino"] = ImageEmbedding(name="dino", values=dino_embedding)

        embeddings = list(embeddings_dict.values())

        if len(embeddings) > 0:
            self.get_image_api().image_set_embeddings(id=image_id, extension_id=self.extension_id,
                                                      image_embedding=embeddings)

    async def _compute_text_embeddings(self, communicator: Communicator, text: str) -> list[float]:
        return await self.run_in_executor(lambda: self._compute_clip_text_embedding(communicator, text))

    def _compute_clip_image_embedding(self, communicator: Communicator, image_id: str, image: ImageFile) -> list[float]:
        communicator.send_log(f"Computing the CLIP image embeddings for the image with id '{image_id}'", "info")
        image_preprocess = self.clip_preprocess(image).unsqueeze(0).to(self.device)
        image_features = self.clip_model.encode_image(image_preprocess)
        return image_features.cpu().detach().numpy().tolist()[0]

    def _compute_clip_text_embedding(self, communicator: Communicator, text: str) -> list[float]:
        communicator.send_log(f"Computing text embeddings for the text {text}", "info")
        self._ensure_models(True, False)
        tokens = clip.tokenize([text]).to(self.device)
        text_features = self.clip_model.encode_text(tokens)
        return text_features.cpu().detach().numpy().tolist()[0]

    def _compute_dino_image_embedding(self, communicator: Communicator, image_id: str, image: ImageFile) -> list[float]:
        communicator.send_log(f"Computing the DINO image embeddings for the image with id '{image_id}'", "info")
        inputs = self.dino_processor(images=image.convert("RGB"), return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.dino_model(**inputs)
            image_features = outputs.last_hidden_state[:, 0, :]
        return image_features.cpu().detach().numpy().tolist()[0]

    def _ensure_models(self, clip_enabled: bool, dino_enabled: bool) -> None:
        with self.models_lock:
            if self.device is None:
                torch.no_grad()
                self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.mps.is_available() else "cpu")
            if self.clip_model is None and clip_enabled == True:
                # We need to go through this horrible monkey-patch inspired from https://stackoverflow.com/a/28052583/808618, because the location of the CLIP tensor files causes issue as far as their SSL certificate are concerned
                save_create_default_https_context = ssl._create_default_https_context
                ssl._create_default_https_context = ssl._create_unverified_context
                model_name = "ViT-B/32"
                try:
                    logging.info(f"Loading the '{model_name}' model")
                    self.clip_model, self.clip_preprocess = clip.load(name=model_name, device=self.device, jit=False,
                                                                      download_root=PicteusExtension.get_cache_directory_path())
                finally:
                    ssl._create_default_https_context = save_create_default_https_context
            if self.dino_model is None and dino_enabled == True:
                model_name = "facebook/dinov2-base"
                logging.info(f"Loading the '{model_name}' model")
                cache_dir = PicteusExtension.get_cache_directory_path()
                self.dino_processor = AutoImageProcessor.from_pretrained(model_name, cache_dir=cache_dir)
                self.dino_model = AutoModel.from_pretrained(model_name, cache_dir=cache_dir).to(self.device)

    async def _reset_embeddings(self, communicator: Communicator):
        self.logger.info("Deleting all existing embeddings")
        extension_settings = self.get_extension_api().extension_reset_settings(id=self.extension_id)
        self._setup(extension_settings.value)
        ids: List[str] = self.get_image_api().image_search_ids(
            search_parameters=SearchParameters(filter=SearchFilter())).items
        for image_id in ids:
            self.get_image_api().image_set_embeddings(id=image_id, extension_id=self.extension_id,
                                                      image_embedding=[])
        await self._compute_images_embeddings(communicator, ids, self.clip_enabled, self.dino_enabled)

    def _setup(self, value: SettingsValue):
        self.clip_enabled = value.get("clipEnabled", False)
        self.dino_enabled = value.get("dinoEnabled", False)


asyncio.run(Embeddings().run())
