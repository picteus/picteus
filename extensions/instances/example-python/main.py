import asyncio
import json
from typing import Dict, Any, List, Optional

from picteus_extension_sdk import PicteusExtension
from picteus_extension_sdk.picteus_extension import NotificationEvent, NotificationReturnedError, Communicator, \
    NotificationsUiAnchor, NotificationsDialogType, NotificationsParametersIntent, NotificationsUiIntent, \
    NotificationsUi, NotificationsDialogIntent, NotificationsDialog, NotificationsDialogButtons, NotificationsImage, \
    NotificationsImagesIntent, NotificationsImages, NotificationsShowIntent, NotificationsShow, NotificationsShowType, \
    SettingsValue
from picteus_ws_client import Image, ImageResizeRender, ImageFormat, ImageFeature, ImageFeatureType, ImageFeatureFormat


class PythonExtension(PicteusExtension):

    async def initialize(self) -> bool:
        self.logger.debug(f"The {self.to_string()} with name '{PicteusExtension.get_manifest().name}' is initializing")
        result = await super().initialize()
        self.logger.debug(f"The {self.to_string()} has the following settings: '{self.get_settings}'")
        return result

    async def on_terminate(self) -> None:
        self.logger.debug(f"The {self.to_string()} is terminating")

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        communicator.send_log(f"The {self.to_string()} is ready", "info")
        communicator.send_notification({"key": "value"})

    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        communicator.send_log(
            f"The extension with id '{self.extension_id}' was notified that the settings have been set", "debug")

    async def on_event(self, communicator: Communicator, event: str, value: Dict[str, Any]) -> Any | None:
        if event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED or event == NotificationEvent.IMAGE_DELETED or NotificationEvent.IMAGE_COMPUTE_TAGS or NotificationEvent.IMAGE_COMPUTE_FEATURES:
            image_id: str = value["id"]
            is_created_or_updated: bool = event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED
            if is_created_or_updated or event == NotificationEvent.IMAGE_DELETED:
                communicator.send_log(f"The image with id '{image_id}' was touched", "info")
            if is_created_or_updated or event == NotificationEvent.IMAGE_COMPUTE_TAGS:
                communicator.send_log(f"Setting the tags for the image with id '{image_id}'", "debug")
            self.get_image_api().image_set_tags(image_id, self.extension_id, [self.extension_id])
            if is_created_or_updated or event == NotificationEvent.IMAGE_COMPUTE_FEATURES:
                communicator.send_log(f"Setting the features for the image with id '{image_id}'", "debug")
            self.get_image_api().image_set_features(image_id, self.extension_id,
                                                    [ImageFeature(type=ImageFeatureType.OTHER,
                                                                  format=ImageFeatureFormat.STRING,
                                                                  name="example", value="This is a string")])
        elif event == NotificationEvent.PROCESS_RUN_COMMAND:
            command_id: str = value["commandId"]
            parameters: Dict[str, Any] = value["parameters"]
            communicator.send_log(
                f"Received a process command with id '{command_id}' with parameters '{json.dumps(parameters)}'",
                "debug")
            if command_id == "askForSomething":
                intent_parameters: Dict[str, Any] = \
                    {
                        "type": "object",
                        "properties":
                            {
                                "favoriteColor":
                                    {
                                        "title": "Favorite color",
                                        "description": "What is your favorite color?",
                                        "type": "string",
                                        "default": "pink"
                                    },
                                "likeChocolate":
                                    {
                                        "title": "Chocolate?",
                                        "description": "Do you like chocolate?",
                                        "type": "boolean"
                                    }
                            },
                        "required": ["favoriteColor"]
                    }
                try:
                    user_parameters: Dict[str, Any] = await communicator.launch_intent(
                        NotificationsParametersIntent(intent_parameters))
                    communicator.send_log(f"Received the intent result '{json.dumps(user_parameters)}'", "info")
                    if user_parameters["likeChocolate"]:
                        await communicator.launch_intent(
                            NotificationsUiIntent(NotificationsUi(NotificationsUiAnchor.MODAL, "https://www.milka.fr")))
                except NotificationReturnedError as exception:
                    communicator.send_log(
                        f"Received the intent error '{str(exception)}' with reason '{exception.reason}'",
                        "error")
            elif command_id == "dialog":
                result = await communicator.launch_intent(NotificationsDialogIntent(
                    NotificationsDialog(NotificationsDialogType.QUESTION, "Dialog", "This is a dialog question",
                                        "Please, click the right button.", NotificationsDialogButtons("Yes", "No"))))
                button = "Yes" if result == True else "No"
                communicator.send_log(f"The user clicked the '{button}' button", "info")
            elif command_id == "show":
                raw_type = parameters["type"]
                show_type: NotificationsShowType
                show_id: str
                match raw_type:
                    case "extensionSettings":
                        show_type = NotificationsShowType.EXTENSION_SETTINGS
                        show_id = self.extension_id
                    case "image":
                        show_type = NotificationsShowType.IMAGE
                        show_id = self.get_image_api().image_search().entities[0].id
                    case "repository":
                        show_type = NotificationsShowType.REPOSITORY
                        show_id = self.get_repository_api().repository_list()[0].id
                    case _:
                        communicator.send_log(f"Unhandled type '{raw_type}'", "error")
                        return None
                await communicator.launch_intent(
                    NotificationsShowIntent(NotificationsShow(type=show_type, id=show_id)))
        elif event == NotificationEvent.IMAGE_RUN_COMMAND:
            command_id: str = value["commandId"]
            image_ids: List[str] = value["imageIds"]
            parameters: Dict[str, Any] = value["parameters"]
            communicator.send_log(
                f"Received an image command with id '{command_id}' for the image with ids '{json.dumps(image_ids)}'",
                "debug")
            new_images: List[NotificationsImage] = []
            for image_id in image_ids:
                image: Image = self.get_image_api().image_get(image_id)
                if command_id == "logDimensions":
                    communicator.send_log(
                        f"The image with id '{image.id}', URL '{image.url}' has dimensions {image.dimensions.width}x{image.dimensions.height}",
                        "info")
                elif command_id == "convert":
                    image_format: ImageFormat = parameters["format"]
                    strip_metadata: bool = parameters["stripMetadata"]
                    width: int | None = parameters["width"]
                    height: int | None = parameters["height"]
                    resize_render: ImageResizeRender | None = parameters["resizeRender"]
                    if (width is not None or height is not None) and strip_metadata is False:
                        await communicator.launch_intent(NotificationsDialogIntent(
                            NotificationsDialog(NotificationsDialogType.ERROR, "Image Conversion",
                                                "When a dimension is specified, the metadata must be stripped.", None,
                                                NotificationsDialogButtons("OK"))))
                        return None

                    communicator.send_log(f"Converting the image with id '{image.id}' and URL '{image.url}'", "debug")
                    image_bytes: bytearray = self.get_image_api().image_download(image_id, image_format, width, height,
                                                                                 resize_render,
                                                                                 strip_metadata)
                    new_image: Image = self.get_repository_api().repository_store_image(image.repository_id,
                                                                                        image_bytes,
                                                                                        parent_id=image.id)
                    new_images.append(NotificationsImage(new_image.id))

            if command_id == "convert":
                await communicator.launch_intent(NotificationsImagesIntent(
                    NotificationsImages(new_images, "Converted images", "These are the converted images")))

        return None


asyncio.run(PythonExtension().run())
