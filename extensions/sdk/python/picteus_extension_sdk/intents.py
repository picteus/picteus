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
    imageIds: Optional[List[str]] = None


@dataclass
class BasisIntent(SuperDataClass):
    identity: Optional[IntentIdentity] = None


@dataclass
class WithContextIntent(BasisIntent):
    context: Optional[IntentContext] = None


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
    details: Optional[str] = None


@dataclass(kw_only=True)
class IntentDialogIconContent(IntentDialogContent):
    icon: Optional[IntentResource] = None


@dataclass
class IntentDialogIconSizeContent(IntentDialogIconContent):
    size: Optional[Literal["auto", "xs", "s", "m", "l", "xl"]] = None


@dataclass
class IntentFormContent(SuperDataClass):
    parameters: Json
    dialogContent: Optional[IntentDialogIconSizeContent] = None


@dataclass(kw_only=True)
class FormIntent(WithContextIntent):
    form: IntentFormContent


class IntentUiAnchor(StrEnum):
    MODAL = "modal",
    SIDEBAR = "sidebar",
    WINDOW = "window",
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
    dialogContent: Optional[IntentDialogIconContent]


@dataclass(kw_only=True)
class UiIntent(WithContextIntent):
    ui: IntentUi


class IntentDialogType(StrEnum):
    ERROR = "error",
    INFO = "info",
    QUESTION = "question"


@dataclass
class IntentFrame(SuperDataClass):
    content: IntentFrameContent
    height: int


@dataclass
class IntentDialogButtons(SuperDataClass):
    yes: str
    no: Optional[str] = None


@dataclass(kw_only=True)
class IntentDialog(IntentDialogIconSizeContent):
    type: IntentDialogType
    frame: Optional[IntentFrame] = None
    buttons: IntentDialogButtons


@dataclass(kw_only=True)
class DialogIntent(WithContextIntent):
    dialog: IntentDialog


@dataclass
class IntentImage(SuperDataClass):
    imageId: str
    dialogContent: Optional[IntentDialogContent] = None


@dataclass
class IntentImages(SuperDataClass):
    images: List[IntentImage]
    dialogContent: Optional[IntentDialogIconContent] = None


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


@dataclass(kw_only=True)
class IntentServeBundle(SuperDataClass):
    content: bytearray
    settings: Optional[Json] = None


@dataclass(kw_only=True)
class ServeBundleIntent(BasisIntent):
    serveBundle: IntentServeBundle


Intent = Union[
    FormIntent, UiIntent, DialogIntent, ImagesIntent, ShowIntent, ServeBundleIntent]
