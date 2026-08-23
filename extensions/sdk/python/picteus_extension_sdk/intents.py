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
class IntentIdentity(SuperDataClass):
    id: str


@dataclass(kw_only=True)
class IntentContext(SuperDataClass):
    imageIds: Optional[List[str]] = field(default=None)


@dataclass
class BasisIntent(SuperDataClass):
    identity: Optional[IntentIdentity] = field(default=None)


@dataclass
class WithContextIntent(BasisIntent):
    context: Optional[IntentContext] = field(default=None)


@dataclass
class IntentResourceUrl(SuperDataClass):
    url: str


@dataclass
class IntentResourceContent(SuperDataClass):
    content: bytearray


IntentResource = Union[IntentResourceUrl, IntentResourceContent]


@dataclass(kw_only=True)
class IntentDialogContent(SuperDataClass):
    title: str
    description: str
    details: Optional[str] = field(default=None)


@dataclass(kw_only=True)
class IntentDialogIconContent(IntentDialogContent):
    icon: Optional[IntentResource] = field(default=None)


@dataclass
class IntentDialogIconSizeContent(IntentDialogIconContent):
    size: Optional[Literal["auto", "xs", "s", "m", "l", "xl"]] = field(default=None)


@dataclass
class IntentFormContent(SuperDataClass):
    parameters: Json
    dialogContent: Optional[IntentDialogIconSizeContent] = field(default=None)


@dataclass(kw_only=True)
class FormIntent(WithContextIntent):
    form: IntentFormContent


class IntentUiAnchor(StrEnum):
    MODAL = "modal"
    SIDEBAR = "sidebar"
    WINDOW = "window"
    IMAGE_DETAILS = "imageDetail"


@dataclass(kw_only=True)
class IntentUISidebarIntegration(SuperDataClass):
    anchor: IntentUiAnchor = field(default=IntentUiAnchor.SIDEBAR, init=False)
    isExternal: bool


@dataclass(kw_only=True)
class IntentUIWindowIntegration(SuperDataClass):
    anchor: IntentUiAnchor = field(default=IntentUiAnchor.WINDOW, init=False)


@dataclass(kw_only=True)
class IntentUIModalIntegration(SuperDataClass):
    anchor: IntentUiAnchor = field(default=IntentUiAnchor.MODAL, init=False)


IntentUIIntegration = Union[
    IntentUISidebarIntegration, IntentUIWindowIntegration, IntentUIModalIntegration]


@dataclass
class IntentFrameUrlContent(SuperDataClass):
    url: str


@dataclass
class IntentFrameHtmlContent(SuperDataClass):
    html: str


IntentFrameContent = Union[IntentFrameUrlContent, IntentFrameHtmlContent]


@dataclass
class IntentUi(SuperDataClass):
    id: str
    integration: IntentUIIntegration
    frameContent: IntentFrameContent
    dialogContent: Optional[IntentDialogIconContent] = field(default=None)


@dataclass(kw_only=True)
class UiIntent(WithContextIntent):
    ui: IntentUi


class IntentDialogType(StrEnum):
    ERROR = "error"
    INFO = "info"
    QUESTION = "question"


@dataclass
class IntentFrame(SuperDataClass):
    content: IntentFrameContent
    height: int


@dataclass
class IntentDialogButtons(SuperDataClass):
    yes: str
    no: Optional[str] = field(default=None)


@dataclass(kw_only=True)
class IntentDialog(IntentDialogIconSizeContent):
    type: IntentDialogType
    frame: Optional[IntentFrame] = field(default=None)
    buttons: IntentDialogButtons


@dataclass(kw_only=True)
class DialogIntent(WithContextIntent):
    dialog: IntentDialog


@dataclass
class IntentImage(SuperDataClass):
    imageId: str
    dialogContent: Optional[IntentDialogContent] = field(default=None)


@dataclass
class IntentImages(SuperDataClass):
    images: List[IntentImage]
    dialogContent: Optional[IntentDialogIconContent] = field(default=None)


@dataclass(kw_only=True)
class ImagesIntent(WithContextIntent):
    images: IntentImages


class IntentShowType(StrEnum):
    SIDEBAR = "sidebar"
    EXTENSION_SETTINGS = "extensionSettings"
    IMAGE = "image"
    REPOSITORY = "repository"


@dataclass
class IntentShow(SuperDataClass):
    type: IntentShowType
    id: str


@dataclass(kw_only=True)
class ShowIntent(BasisIntent):
    show: IntentShow


class IntentToastType(StrEnum):
    INFO = "info"
    CANCEL = "cancel"
    ERROR = "error"


@dataclass(kw_only=True)
class IntentToast(SuperDataClass):
    type: IntentToastType
    title: Optional[str] = field(default=None)
    subtitle: str


@dataclass(kw_only=True)
class ToastIntent(WithContextIntent):
    toast: IntentToast


@dataclass(kw_only=True)
class IntentNotification(SuperDataClass):
    title: str
    subtitle: str
    body: str
    silent: bool
    icon: Optional[bytearray] = field(default=None)
    isNative: bool


@dataclass(kw_only=True)
class NotificationIntent(WithContextIntent):
    notification: IntentNotification


@dataclass
class IntentProcessCommand(SuperDataClass):
    extensionId: str
    commandId: str


@dataclass(kw_only=True)
class ProcessCommandIntent(WithContextIntent):
    processCommand: IntentProcessCommand


@dataclass
class IntentAction(SuperDataClass):
    intent: Union[ShowIntent, UiIntent, ProcessCommandIntent]
    dialogContent: IntentDialogIconSizeContent
    label: Optional[str] = field(default=None)


@dataclass(kw_only=True)
class ActionIntent(WithContextIntent):
    action: IntentAction


FrontIntent = Union[
    FormIntent, UiIntent, DialogIntent, ImagesIntent, ShowIntent, ToastIntent, NotificationIntent, ActionIntent]


@dataclass(kw_only=True)
class IntentServeBundle(SuperDataClass):
    content: bytearray
    settings: Optional[Json] = field(default=None)


@dataclass(kw_only=True)
class ServeBundleIntent(BasisIntent):
    serveBundle: IntentServeBundle


@dataclass(kw_only=True)
class IntentReadFile(SuperDataClass):
    extensions: Optional[List[str]] = field(default=None)
    message: str


@dataclass(kw_only=True)
class ReadFileIntent(WithContextIntent):
    readFile: IntentReadFile


@dataclass
class IntentWriteFile(SuperDataClass):
    content: bytearray
    name: str
    extension: str
    message: str


@dataclass(kw_only=True)
class WriteFileIntent(WithContextIntent):
    writeFile: IntentWriteFile


BackIntent = Union[
    ServeBundleIntent, ReadFileIntent, WriteFileIntent]

Intent = Union[FrontIntent, BackIntent]
