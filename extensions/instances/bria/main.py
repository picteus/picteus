import asyncio
import io
import os
from typing import Any, List, Optional

from PIL import Image
from PIL.ImageFile import ImageFile
from picteus_extension_sdk import PicteusExtension
from picteus_extension_sdk.picteus_extension import NotificationEvent, Communicator, SettingsValue, NotificationsImage, \
    NotificationsImagesIntent, NotificationsImages, Helper
from picteus_ws_client import Repository, Image as PicteusImage, ImageFeature, ImageFeatureType, ImageFeatureFormat, \
    ImageFormat, ApplicationMetadata, ApplicationMetadataItem, ApplicationMetadataItemValue, GenerationRecipe, \
    InstructionsPrompt, PromptKind, GenerationRecipePrompt

os.environ["HF_HOME"] = PicteusExtension.get_cache_directory_path()
from transformers import pipeline, Pipeline


class BriaExtension(PicteusExtension):

    def __init__(self) -> None:
        super().__init__()
        self._model: str = "briaai/RMBG-1.4"
        self._pipe: Optional[Pipeline] = None

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        await super().on_ready(communicator)
        await self._setup(self.get_settings())

    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        await self._setup(self.get_settings())

    async def on_event(self, communicator: Communicator, event, value) -> Any | None:
        if event == NotificationEvent.IMAGE_RUN_COMMAND:
            image_ids: List[str] = value["imageIds"]
            new_images: List[NotificationsImage] = []
            for image_id in image_ids:
                new_image = await self._handle_image(communicator, image_id)
                if new_image is not None:
                    new_images.append(NotificationsImage(new_image.id))
            if len(new_images) > 0:
                await communicator.launch_intent(NotificationsImagesIntent(
                    NotificationsImages(new_images, "Background-less images",
                                        "These are the images without background")))

        return None

    async def _handle_image(self, communicator: Communicator, image_id: str) -> PicteusImage | None:
        image: PicteusImage = self.get_image_api().image_get(image_id)
        communicator.send_log(f"Removing the background of the image with URL '{image.url}'", "info")

        repository: Repository = self.get_repository_api().repository_get(image.repository_id)
        name_without_extension = os.path.splitext(os.path.basename(image.name))[0]
        relative_directory_path: str = os.path.split(image.url[len(repository.url) + 1:])[0]

        image_bytes: bytearray = self.get_image_api().image_download(image_id, ImageFormat.PNG, None, None, None, True)
        image_file: ImageFile = Image.open(io.BytesIO(image_bytes))
        new_image: ImageFile = await self.run_in_executor(lambda: self._remove_image_background(image_file))
        scaled_image_bytes_array = io.BytesIO()
        new_image.save(scaled_image_bytes_array, format="PNG")
        new_image_bytes = scaled_image_bytes_array.getvalue()
        recipe: GenerationRecipe = GenerationRecipe(schemaVersion=Helper.GENERATION_RECIPE_SCHEMA_VERSION,
                                                    software="picteus",
                                                    modelTags=[self._model], inputAssets=[image.id],
                                                    aspectRatio=image.dimensions.width / image.dimensions.height,
                                                    prompt=GenerationRecipePrompt(
                                                        InstructionsPrompt(kind=PromptKind.INSTRUCTIONS, value={})))
        stored_image: PicteusImage = self.get_repository_api().repository_store_image(repository.id,
                                                                                      new_image_bytes,
                                                                                      name_without_extension=name_without_extension + "_backgroundless",
                                                                                      relative_directory_path=relative_directory_path,
                                                                                      application_metadata=ApplicationMetadata(
                                                                                          items=
                                                                                          [ApplicationMetadataItem(
                                                                                              extensionId=self.extension_id,
                                                                                              value=ApplicationMetadataItemValue(
                                                                                                  recipe))]).to_json(),
                                                                                      parent_id=image.id)
        self.get_image_api().image_set_features(stored_image.id, self.extension_id,
                                                [ImageFeature(type=ImageFeatureType.RECIPE,
                                                              format=ImageFeatureFormat.JSON,
                                                              value=recipe.to_json())])
        return stored_image

    def _remove_image_background(self, pil_image: ImageFile) -> ImageFile:
        self._ensure_pipeline()
        pillow_image: ImageFile = self._pipe(pil_image, return_mask=False)
        return pillow_image

    def _ensure_pipeline(self) -> None:
        if self._pipe is None:
            self._pipe = pipeline("image-segmentation", model=self._model, trust_remote_code=True,
                                  cache_dir=PicteusExtension.get_cache_directory_path())

    async def _setup(self, value: SettingsValue) -> None:
        pass


asyncio.run(BriaExtension().run())
