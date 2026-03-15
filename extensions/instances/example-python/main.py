import asyncio
import json
import os
from typing import Dict, Any, List, Optional

from picteus_extension_sdk import PicteusExtension
from picteus_extension_sdk.picteus_extension import NotificationEvent, NotificationReturnedError, Communicator, \
    NotificationsUiAnchor, NotificationsDialogType, NotificationsParametersIntent, NotificationsUiIntent, \
    NotificationsUi, NotificationsDialogIntent, NotificationsDialog, NotificationsDialogButtons, NotificationsImage, \
    NotificationsImagesIntent, NotificationsImages, NotificationsShowIntent, NotificationsShow, NotificationsShowType, \
    SettingsValue, NotificationDialogContent, NotificationContext, NotificationsServeBundleIntent, \
    NotificationsServeBundle, NotificationsFrame, NotificationsFrameUrlContent, NotificationsFrameHtmlContent
from picteus_ws_client import Image, ImageResizeRender, ImageFormat, ImageFeature, ImageFeatureType, ImageFeatureFormat, \
    ImageFeatureValue, SearchRange, SearchFilter, SearchSorting, SearchSortingProperty, SearchParameters


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
        if event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED or event == NotificationEvent.IMAGE_DELETED or event == NotificationEvent.IMAGE_COMPUTE_TAGS or event == NotificationEvent.IMAGE_COMPUTE_FEATURES:
            image_id: str = value["id"]
            is_created_or_updated: bool = event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED
            if is_created_or_updated or event == NotificationEvent.IMAGE_DELETED:
                communicator.send_log(f"The image with id '{image_id}' was touched", "info")
            if is_created_or_updated or event == NotificationEvent.IMAGE_COMPUTE_TAGS:
                communicator.send_log(f"Setting the tags for the image with id '{image_id}'", "debug")
            self.get_image_api().image_set_tags(id=image_id, extension_id=self.extension_id,
                                                request_body=[self.extension_id])
            if is_created_or_updated or event == NotificationEvent.IMAGE_COMPUTE_FEATURES:
                communicator.send_log(f"Setting the features for the image with id '{image_id}'", "debug")
            self.get_image_api().image_set_features(id=image_id, extension_id=self.extension_id,
                                                    image_feature=[ImageFeature(type=ImageFeatureType.OTHER,
                                                                                format=ImageFeatureFormat.STRING,
                                                                                name="example",
                                                                                value=ImageFeatureValue(
                                                                                    "This is a string"))])
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
                                        "enum": ["pink", "blue", "yellow", "green"],
                                        "default": "pink",
                                        "ui":
                                            {
                                                "widget": "radio",
                                                "inline": True
                                            }
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
                image_ids = [image.id for image in self.get_image_api().image_search_summaries(
                    search_parameters=SearchParameters(range=SearchRange(take=3))).items]
                try:
                    user_parameters: Dict[str, Any] = await communicator.launch_intent(
                        NotificationsParametersIntent(context=NotificationContext(imageIds=image_ids),
                                                      parameters=intent_parameters,
                                                      dialogContent=NotificationDialogContent(
                                                          title="Favorite color and chocolate",
                                                          description="This shows how an extension can input parameters from the user.",
                                                          details="This dialog box has been dynamically generated from the extension source code.")))
                    communicator.send_log(f"Received the intent result '{json.dumps(user_parameters)}'", "info")
                    if user_parameters["likeChocolate"]:
                        await communicator.launch_intent(
                            NotificationsUiIntent(ui=NotificationsUi(anchor=NotificationsUiAnchor.MODAL,
                                                                     url=self.web_services_base_url + "/swaggerui",
                                                                     dialogContent=NotificationDialogContent(
                                                                         title="Website",
                                                                         description="A web site with some chocolate",
                                                                         details="This is to showcase that a modal window may be opened with some title, description and details."))))
                except NotificationReturnedError as exception:
                    communicator.send_log(
                        f"Received the intent error '{str(exception)}' with reason '{exception.reason}'",
                        "error")
            elif command_id == "dialog":
                result = await communicator.launch_intent(NotificationsDialogIntent(
                    context=NotificationContext(
                        imageIds=[image.id for image in self.get_image_api().image_search_summaries(
                            search_parameters=SearchParameters(filter=SearchFilter(
                                sorting=SearchSorting(property=SearchSortingProperty.IMPORTDATE, isAscending=False)),
                                range=SearchRange(take=3))).items]),
                    dialog=NotificationsDialog(
                        type=NotificationsDialogType.QUESTION,
                        title="Dialog",
                        description="This is a dialog question",
                        details="Please, click the right button.",
                        frame=None if parameters.get("type") != "With HTML" else NotificationsFrame(
                            content=NotificationsFrameHtmlContent(
                                html="""<html lang="en"><body>This is an <b>HTML</b> content within a dialog box.</body></html>"""),
                            height=50),
                        buttons=NotificationsDialogButtons(
                            yes="Yes", no="No"))))
                button = "Yes" if result == True else "No"
                communicator.send_log(f"The user clicked the '{button}' button", "info")
            elif command_id == "application":
                summaries = self.get_image_api().image_search_summaries(search_parameters=SearchParameters(
                    filter=SearchFilter(
                        sorting=SearchSorting(property=SearchSortingProperty.IMPORTDATE, isAscending=False)),
                    range=SearchRange(take=20)))
                with open(
                        os.path.join(PicteusExtension.get_extension_home_directory_path(), "application.zip"),
                        mode="rb") as file:
                    content_types: bytes = file.read()
                result: str = await communicator.launch_intent(NotificationsServeBundleIntent(
                    serveBundle=NotificationsServeBundle(content=bytearray(content_types),
                                                         settings={"imageIds": [
                                                             self.web_services_base_url + "/resize/?u=" + image.url for
                                                             image in summaries.items]})))
                await communicator.launch_intent(NotificationsDialogIntent(
                    dialog=NotificationsDialog(
                        type=NotificationsDialogType.INFO,
                        title="Application",
                        description="This dialog box integrates an iframe application.",
                        frame=NotificationsFrame(content=NotificationsFrameUrlContent(url=result + "/index.html"),
                                                 height=70),
                        buttons=NotificationsDialogButtons(yes="Close"))))
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
                        show_id = self.get_image_api().image_search_summaries(
                            search_parameters=SearchParameters(filter=SearchFilter(
                                sorting=SearchSorting(property=SearchSortingProperty.IMPORTDATE, isAscending=False)),
                                range=SearchRange(take=1))).items[0].id
                    case "repository":
                        show_type = NotificationsShowType.REPOSITORY
                        show_id = self.get_repository_api().repository_list()[0].id
                    case _:
                        communicator.send_log(f"Unhandled type '{raw_type}'", "error")
                        return None
                await communicator.launch_intent(
                    NotificationsShowIntent(show=NotificationsShow(type=show_type, id=show_id)))
        elif event == NotificationEvent.IMAGE_RUN_COMMAND:
            command_id: str = value["commandId"]
            image_ids: List[str] = value["imageIds"]
            parameters: Dict[str, Any] = value["parameters"]
            communicator.send_log(
                f"Received an image command with id '{command_id}' for the image with ids '{json.dumps(image_ids)}'",
                "debug")
            new_images: List[NotificationsImage] = []
            for image_id in image_ids:
                image: Image = self.get_image_api().image_get(id=image_id)
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
                        await communicator.launch_intent(NotificationsDialogIntent(dialog=NotificationsDialog(
                            type=NotificationsDialogType.ERROR,
                            title="Image Conversion",
                            description="When a dimension is specified, the metadata must be stripped.",
                            buttons=NotificationsDialogButtons(
                                yes="OK"))))
                        return None

                    communicator.send_log(f"Converting the image with id '{image.id}' and URL '{image.url}'", "debug")
                    image_bytes: bytearray = self.get_image_api().image_download(id=image_id, format=image_format,
                                                                                 width=width, height=height,
                                                                                 resize_render=resize_render,
                                                                                 strip_metadata=strip_metadata)
                    new_image: Image = self.get_repository_api().repository_store_image(id=image.repository_id,
                                                                                        body=image_bytes,
                                                                                        parent_id=image.id)
                    new_images.append(NotificationsImage(imageId=new_image.id))

            if command_id == "convert":
                await communicator.launch_intent(NotificationsImagesIntent(images=
                                                                           NotificationsImages(images=new_images,
                                                                                               dialogContent=NotificationDialogContent(
                                                                                                   title="Converted images",
                                                                                                   description="These are the converted images"))))

        return None


asyncio.run(PythonExtension().run())
