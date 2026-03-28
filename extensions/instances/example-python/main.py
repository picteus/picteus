import asyncio
import base64
import json
import os
from typing import Dict, Any, List, Optional, Literal

from picteus_extension_sdk import PicteusExtension, NotificationEvent, NotificationReturnedError, Communicator, \
    NotificationsDialogType, NotificationsUiIntent, \
    NotificationsUi, NotificationsDialogIntent, NotificationsDialog, NotificationsDialogButtons, NotificationsImage, \
    NotificationsImagesIntent, NotificationsImages, NotificationsShowIntent, NotificationsShow, NotificationsShowType, \
    SettingsValue, NotificationsContext, NotificationsServeBundleIntent, \
    NotificationsServeBundle, NotificationsFrame, NotificationsFrameUrlContent, NotificationsFrameHtmlContent, \
    NotificationsFormContent, NotificationsDialogIconContent, NotificationsFormIntent, NotificationsResourceContent, \
    NotificationsDialogIconSizeContent, NotificationsUISidebarIntegration, NotificationsUIModalIntegration, \
    NotificationsUIWindowIntegration
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
        if event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED or event == NotificationEvent.IMAGE_TAGS_UPDATED or event == NotificationEvent.IMAGE_FEATURES_UPDATED or event == NotificationEvent.IMAGE_DELETED or event == NotificationEvent.IMAGE_COMPUTE_TAGS or event == NotificationEvent.IMAGE_COMPUTE_FEATURES:
            await self._handle_image_event(communicator, event, value)
        elif event == NotificationEvent.PROCESS_RUN_COMMAND:
            command_id: str = value["commandId"]
            parameters: Dict[str, Any] = value["parameters"]
            communicator.send_log(
                f"Received a process command with id '{command_id}' with parameters '{json.dumps(parameters)}'",
                "debug")
            if command_id == "askForSomething":
                await self._handle_ask_for_something(communicator, parameters)
            elif command_id == "dialog":
                await self._handle_dialog(communicator, parameters)
            elif command_id == "ui":
                await self._handle_ui(communicator, parameters)
            elif command_id == "show":
                await self._handle_show(communicator, parameters)
            elif command_id == "application":
                await self._handle_application(communicator)
        elif event == NotificationEvent.IMAGE_RUN_COMMAND:
            command_id: str = value["commandId"]
            image_ids: List[str] = value["imageIds"]
            parameters: Dict[str, Any] = value["parameters"]
            await self._handle_run_command(communicator, command_id, image_ids, parameters)
        return None

    async def _handle_image_event(self, communicator: Communicator, event: Literal[
        NotificationEvent.IMAGE_CREATED, NotificationEvent.IMAGE_UPDATED, NotificationEvent.IMAGE_TAGS_UPDATED, NotificationEvent.IMAGE_FEATURES_UPDATED, NotificationEvent.IMAGE_DELETED, NotificationEvent.IMAGE_COMPUTE_TAGS, NotificationEvent.IMAGE_COMPUTE_FEATURES],
                                  value: dict[str, Any]) -> None:
        image_id: str = value["id"]
        is_created_or_updated: bool = event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED
        if is_created_or_updated or event == NotificationEvent.IMAGE_DELETED:
            communicator.send_log(f"The image with id '{image_id}' was touched", "info")
        if event == NotificationEvent.IMAGE_TAGS_UPDATED or event == NotificationEvent.IMAGE_FEATURES_UPDATED:
            communicator.send_log(f"The tags or features of the image with id '{image_id}' were updated", "info")
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

    async def _handle_ask_for_something(self, communicator: Communicator, parameters: dict[str, Any]) -> None:
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
                NotificationsFormIntent(context=NotificationsContext(imageIds=image_ids),
                                        form=NotificationsFormContent(parameters=intent_parameters,
                                                                      dialogContent=NotificationsDialogIconSizeContent(
                                                                          title="Favorite color and chocolate",
                                                                          description="This shows how an extension can input parameters from the user.",
                                                                          details=f"""This dialog box has been dynamically generated from the extension source code, based on the previous dialog box answer with value '{parameters["age"]}'.""",
                                                                          icon=NotificationsResourceContent(
                                                                              content=bytearray(base64.b64decode(
                                                                                  "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"))),
                                                                          size="m"))
                                        ))
            communicator.send_log(
                f"""You picked the '{user_parameters["favoriteColor"]}' color and {"declared that you like chocolate" if user_parameters["likeChocolate"] == True else "did not mention that you liked chocolate"}""",
                "info")
        except NotificationReturnedError as exception:
            communicator.send_log(
                f"Received the intent error '{str(exception)}' with reason '{exception.reason}'",
                "error")

    async def _handle_dialog(self, communicator: Communicator, parameters: dict[str, Any]) -> None:
        result = await communicator.launch_intent(NotificationsDialogIntent(
            context=NotificationsContext(
                imageIds=[image.id for image in self.get_image_api().image_search_summaries(
                    search_parameters=SearchParameters(filter=SearchFilter(
                        sorting=SearchSorting(property=SearchSortingProperty.IMPORTDATE, isAscending=False)),
                        range=SearchRange(take=3))).items]),
            dialog=NotificationsDialog(
                type=NotificationsDialogType.QUESTION,
                size="m",
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

    async def _handle_ui(self, communicator: Communicator, parameters: dict[str, Any]) -> None:
        anchor: str = parameters["anchor"]
        nature: str = parameters["nature"]
        is_url: bool = nature == "URL"
        title: str = f"{anchor} UI"
        with open(os.path.join(PicteusExtension.get_extension_home_directory_path(),
                               "swaggerui.png" if is_url == True else "icon.png"),
                  mode="rb") as file:
            icon_content: bytes = file.read()
        frame_content = NotificationsFrameUrlContent(
            url=self.web_services_base_url + "/swaggerui") if is_url == True else NotificationsFrameHtmlContent(
            html=f"""<html lang="en"><head><title>${title}</title></head><body style="border: 0; width: 100vw; height: 100vh; background: beige; display: flex; justify-content: center; align-items: center;"><div style="font-size: x-large;">This is an <b>HTML</b> content with a "{anchor}" UI element.</div></body></html>""")
        await communicator.launch_intent(
            NotificationsUiIntent(ui=NotificationsUi(id=f"ui-{anchor}-{nature}",
                                                     integration=NotificationsUIModalIntegration() if (
                                                             anchor == "Modal") else (
                                                         NotificationsUISidebarIntegration(
                                                             isExternal=anchor == "SidebarExternal") if (
                                                                 anchor == "Sidebar" or anchor == "SidebarExternal") else NotificationsUIWindowIntegration()),
                                                     frameContent=frame_content,
                                                     dialogContent=NotificationsDialogIconContent(
                                                         title=title,
                                                         description="Demonstrates how to open a dedicated UI.",
                                                         icon=NotificationsResourceContent(
                                                             content=bytearray(icon_content))
                                                     ))))

    async def _handle_show(self, communicator: Communicator, parameters: dict[str, Any]) -> None:
        raw_type = parameters["type"]
        show_type: NotificationsShowType
        show_id: str
        match raw_type:
            case "sidebar":
                show_type = NotificationsShowType.SIDEBAR
                show_id = self.extension_id + "-" + "main"
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
        return None

    async def _handle_application(self, communicator: Communicator) -> None:
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
                                                 settings={"imageIds": [image.id for image in summaries.items]})))
        await communicator.launch_intent(NotificationsDialogIntent(
            dialog=NotificationsDialog(
                type=NotificationsDialogType.INFO,
                title="Application",
                description="This dialog box integrates an iframe application.",
                size="l",
                frame=NotificationsFrame(content=NotificationsFrameUrlContent(url=result + "/index.html"),
                                         height=70),
                buttons=NotificationsDialogButtons(yes="Close"))))

    async def _handle_run_command(self, communicator: Communicator, command_id: str, image_ids: list[str],
                                  parameters: dict[str, Any]) -> None:
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
                                                                                           dialogContent=NotificationsDialogIconContent(
                                                                                               title="Converted images",
                                                                                               description="These are the converted images"))))
        return None


asyncio.run(PythonExtension().run())
