import asyncio
import io
import logging
import ssl
import threading
from typing import Any, Optional

# noinspection PyPackageRequirements
import clip
import torch
from PIL import Image
from PIL.ImageFile import ImageFile
from picteus_extension_sdk import PicteusExtension
from picteus_extension_sdk.picteus_extension import NotificationEvent, Communicator
from picteus_ws_client import ImageEmbeddings, ImageFormat


class Embeddings(PicteusExtension):

    def __init__(self) -> None:
        super().__init__()
        self.model_lock = threading.Lock()
        self.device: Optional[str] = None
        self.model = None
        self.preprocess = None

    async def on_event(self, communicator: Communicator, event, value) -> Any | None:
        if event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED or event == NotificationEvent.IMAGE_COMPUTE_EMBEDDINGS:
            image_id: str = value["id"]
            return await self._handle_image(communicator, image_id)
        elif event == NotificationEvent.TEXT_COMPUTE_EMBEDDINGS:
            text: str = value["text"]
            return await self._handle_text(communicator, text)

        return None

    async def _handle_image(self, communicator: Communicator, image_id: str) -> None:
        image: bytearray = self.get_image_api().image_download(image_id, ImageFormat.PNG, None, None, None, True)
        pil_image: ImageFile = Image.open(io.BytesIO(image))
        image_embeddings: list[float] = await self.run_in_executor(
            lambda: self._compute_image_embeddings(communicator, pil_image))
        self.get_image_api().image_set_embeddings(image_id, self.extension_id,
                                                  ImageEmbeddings.from_dict({"values": image_embeddings}))

    async def _handle_text(self, communicator: Communicator, text: str) -> list[float]:
        return await self.run_in_executor(lambda: self._compute_text_embeddings(communicator, text))

    def _compute_image_embeddings(self, communicator: Communicator, image: ImageFile) -> list[float]:
        communicator.send_log(f"Computing image embeddings for an image of size {image.size}", "info")
        self._ensure_models()
        image_preprocess = self.preprocess(image).unsqueeze(0).to(self.device)
        image_features = self.model.encode_image(image_preprocess)
        return image_features.cpu().detach().numpy().tolist()[0]

    def _compute_text_embeddings(self, communicator: Communicator, text: str) -> list[float]:
        communicator.send_log(f"Computing text embeddings for the text {text}", "info")
        self._ensure_models()
        tokens = clip.tokenize([text]).to(self.device)
        text_features = self.model.encode_text(tokens)
        return text_features.cpu().detach().numpy().tolist()[0]

    def _ensure_models(self) -> None:
        with self.model_lock:
            if self.model is None:
                torch.no_grad()
                self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.mps.is_available() else "cpu")
                # We need to go through this horrible monkey-patch inspired from https://stackoverflow.com/a/28052583/808618, because the location of the CLIP tensor files causes issue as far as their SSL certificate are concerned
                save_create_default_https_context = ssl._create_default_https_context
                ssl._create_default_https_context = ssl._create_unverified_context
                model_name = "ViT-B/32"
                try:
                    logging.info(f"Loading the '{model_name}' model")
                    self.model, self.preprocess = clip.load(model_name, device=self.device,
                                                            download_root=PicteusExtension.get_cache_directory_path())
                finally:
                    ssl._create_default_https_context = save_create_default_https_context


asyncio.run(Embeddings().run())
