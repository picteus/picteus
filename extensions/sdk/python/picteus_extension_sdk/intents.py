import json
from dataclasses import dataclass, asdict, field
from enum import StrEnum
from typing import Dict, Any, Literal, Optional, Union, List

# noinspection PyPackageRequirements

Json = Dict[str, Any]


# In order to benefit from serializable intent structures, taken from https://stackoverflow.com/questions/51286748/make-the-python-json-encoder-support-pythons-new-dataclasses
@dataclass
class SuperDataClass:

    @property
    def __dict__(self):
        """
        get a Python dictionary
        """
        # noinspection PyTypeChecker
        return asdict(self)

    @property
    def json(self):
        """
        get the JSON formated string
        """
        return json.dumps(self.__dict__)


@dataclass(kw_only=True)
class NotificationsIdentity(SuperDataClass):
    id: str


@dataclass(kw_only=True)
class NotificationsContext(SuperDataClass):
    imageIds: Optional[List[str]] = None


@dataclass
class NotificationsBasisIntent(SuperDataClass):
    identity: Optional[NotificationsIdentity] = None


@dataclass
class NotificationsWithContextIntent(NotificationsBasisIntent):
    context: Optional[NotificationsContext] = None


@dataclass
class NotificationsResourceUrl(SuperDataClass):
    url: str


@dataclass
class NotificationsResourceContent(SuperDataClass):
    content: bytearray


NotificationsResource = Union[NotificationsResourceUrl, NotificationsResourceContent]


@dataclass(kw_only=True)
class NotificationsDialogContent(SuperDataClass):
    title: str
    description: str
    details: Optional[str] = None


@dataclass(kw_only=True)
class NotificationsDialogIconContent(NotificationsDialogContent):
    icon: Optional[NotificationsResource] = None


@dataclass
class NotificationsDialogIconSizeContent(NotificationsDialogIconContent):
    size: Optional[Literal["auto", "xs", "s", "m", "l", "xl"]] = None


@dataclass
class NotificationsFormContent(SuperDataClass):
    parameters: Json
    dialogContent: Optional[NotificationsDialogIconSizeContent] = None


@dataclass(kw_only=True)
class NotificationsFormIntent(NotificationsWithContextIntent):
    form: NotificationsFormContent


class NotificationsUiAnchor(StrEnum):
    MODAL = "modal",
    SIDEBAR = "sidebar",
    WINDOW = "window",
    IMAGE_DETAILS = "imageDetail"


@dataclass(kw_only=True)
class NotificationsUISidebarIntegration(SuperDataClass):
    anchor: NotificationsUiAnchor = field(default=NotificationsUiAnchor.SIDEBAR, init=False)
    isExternal: bool


@dataclass(kw_only=True)
class NotificationsUIWindowIntegration(SuperDataClass):
    anchor: NotificationsUiAnchor = field(default=NotificationsUiAnchor.WINDOW, init=False)


@dataclass(kw_only=True)
class NotificationsUIModalIntegration(SuperDataClass):
    anchor: NotificationsUiAnchor = field(default=NotificationsUiAnchor.MODAL, init=False)


NotificationsUIIntegration = Union[
    NotificationsUISidebarIntegration, NotificationsUIWindowIntegration, NotificationsUIModalIntegration]


@dataclass
class NotificationsFrameUrlContent(SuperDataClass):
    url: str


@dataclass
class NotificationsFrameHtmlContent(SuperDataClass):
    html: str


NotificationsFrameContent = Union[NotificationsFrameUrlContent, NotificationsFrameHtmlContent]


@dataclass
class NotificationsUi(SuperDataClass):
    id: str
    integration: NotificationsUIIntegration
    frameContent: NotificationsFrameContent
    dialogContent: Optional[NotificationsDialogIconContent]


@dataclass(kw_only=True)
class NotificationsUiIntent(NotificationsWithContextIntent):
    ui: NotificationsUi


class NotificationsDialogType(StrEnum):
    ERROR = "error",
    INFO = "info",
    QUESTION = "question"


@dataclass
class NotificationsFrame(SuperDataClass):
    content: NotificationsFrameContent
    height: int


@dataclass
class NotificationsDialogButtons(SuperDataClass):
    yes: str
    no: Optional[str] = None


@dataclass(kw_only=True)
class NotificationsDialog(NotificationsDialogIconSizeContent):
    type: NotificationsDialogType
    frame: Optional[NotificationsFrame] = None
    buttons: NotificationsDialogButtons


@dataclass(kw_only=True)
class NotificationsDialogIntent(NotificationsWithContextIntent):
    dialog: NotificationsDialog


@dataclass
class NotificationsImage(SuperDataClass):
    imageId: str
    dialogContent: Optional[NotificationsDialogContent] = None


@dataclass
class NotificationsImages(SuperDataClass):
    images: List[NotificationsImage]
    dialogContent: Optional[NotificationsDialogIconContent] = None


@dataclass(kw_only=True)
class NotificationsImagesIntent(NotificationsWithContextIntent):
    images: NotificationsImages


class NotificationsShowType(StrEnum):
    SIDEBAR = "sidebar"
    EXTENSION_SETTINGS = "extensionSettings"
    IMAGE = "image"
    REPOSITORY = "repository"


@dataclass
class NotificationsShow(SuperDataClass):
    type: NotificationsShowType
    id: str


@dataclass(kw_only=True)
class NotificationsShowIntent(NotificationsBasisIntent):
    show: NotificationsShow


@dataclass(kw_only=True)
class NotificationsServeBundle(SuperDataClass):
    content: bytearray
    settings: Optional[Json] = None


@dataclass(kw_only=True)
class NotificationsServeBundleIntent(NotificationsBasisIntent):
    serveBundle: NotificationsServeBundle


NotificationsIntent = Union[
    NotificationsFormIntent, NotificationsUiIntent, NotificationsDialogIntent, NotificationsImagesIntent, NotificationsShowIntent, NotificationsServeBundleIntent]
