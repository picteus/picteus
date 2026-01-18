import asyncio
import datetime
import json
import logging
import os
import signal
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from enum import StrEnum
from logging import getLogger, basicConfig
from typing import Dict, Any, Literal, TypeVar, Callable, Optional, Union, List

import aiohttp
import requests
import socketio
# noinspection PyPackageRequirements
import urllib3
from socketio import SimpleClient

import picteus_ws_client
from picteus_extension_sdk import get_version
from picteus_ws_client import Manifest

basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s.%(msecs)03d | %(process)d | %(threadName)s [%(levelname)5s]: %(message)s",
    datefmt="%H:%M:%S")

T = TypeVar("T")

LogLevel = Literal["debug", "info", "warn", "error"]


class NotificationReturnedErrorCause(StrEnum):
    CANCEL = "cancel",
    ERROR = "error"


class NotificationReturnedError(Exception):

    def __init__(self, message: str, reason: NotificationReturnedErrorCause) -> None:
        super().__init__(message)
        self.reason: NotificationReturnedErrorCause = reason


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


@dataclass
class NotificationsParametersIntent(SuperDataClass):
    parameters: Json


class NotificationsUiAnchor(StrEnum):
    MODAL = "modal",
    SIDEBAR = "sidebar",
    IMAGE_DETAILS = "imageDetail"


@dataclass
class NotificationsUi(SuperDataClass):
    anchor: NotificationsUiAnchor
    url: str


@dataclass
class NotificationsUiIntent(SuperDataClass):
    ui: NotificationsUi


class NotificationsDialogType(StrEnum):
    ERROR = "Error",
    INFO = "Info",
    QUESTION = "Question"


@dataclass
class NotificationsDialogButtons(SuperDataClass):
    yes: str
    no: Optional[str] = None


@dataclass
class NotificationsDialog(SuperDataClass):
    type: NotificationsDialogType
    title: str
    description: str
    details: Optional[str]
    buttons: NotificationsDialogButtons


@dataclass
class NotificationsDialogIntent(SuperDataClass):
    dialog: NotificationsDialog


@dataclass
class NotificationsImage(SuperDataClass):
    imageId: str
    title: Optional[str] = None
    description: Optional[str] = None
    details: Optional[str] = None


@dataclass
class NotificationsImages(SuperDataClass):
    images: List[NotificationsImage]
    title: Optional[str] = None
    description: Optional[str] = None
    details: Optional[str] = None


@dataclass
class NotificationsImagesIntent(SuperDataClass):
    images: NotificationsImages


class NotificationsShowType(StrEnum):
    EXTENSION_SETTINGS = "ExtensionSettings"
    IMAGE = "Image"
    REPOSITORY = "Repository"


@dataclass
class NotificationsShow(SuperDataClass):
    type: NotificationsShowType
    id: str


@dataclass
class NotificationsShowIntent(SuperDataClass):
    show: NotificationsShow


NotificationsIntent = Union[
    NotificationsParametersIntent, NotificationsUiIntent, NotificationsDialogIntent, NotificationsImagesIntent, NotificationsShowIntent]


class NotificationEvent(StrEnum):
    PROCESS_RUN_COMMAND = "process.runCommand",
    IMAGE_CREATED = "image.created",
    IMAGE_UPDATED = "image.updated",
    IMAGE_DELETED = "image.deleted",
    IMAGE_COMPUTE_FEATURES = "image.computeFeatures",
    IMAGE_COMPUTE_EMBEDDINGS = "image.computeEmbeddings"
    IMAGE_COMPUTE_TAGS = "image.computeTags",
    IMAGE_RUN_COMMAND = "image.runCommand",
    TEXT_COMPUTE_EMBEDDINGS = "text.computeEmbeddings"


extension_settings_event: str = "extension.settings"

notificationsChannel: str = "notifications"


class Helper:
    GENERATION_RECIPE_SCHEMA_VERSION: int = 1


class _ExtensionParameters:

    def __init__(self, parameters: Dict[str, Any]):
        super().__init__()
        self._parameters: Dict[str, Any] = parameters
        self.extension_id: str = parameters.get("extensionId")
        self.web_services_base_url: str = parameters.get("webServicesBaseUrl")
        self.api_key: str = parameters.get("apiKey")


class _MessageSender:

    def __init__(self, logger: logging.Logger, parameters: _ExtensionParameters,
                 sio: Optional[socketio.AsyncClient], socket: Optional[SimpleClient],
                 to_string: Callable[[], str], context_id: Optional[str]) -> None:
        super().__init__()
        self.logger: logging.Logger = logger
        self.parameters: _ExtensionParameters = parameters
        self.sio: Optional[socketio.AsyncClient] = sio
        self.socket: Optional[SimpleClient] = socket
        self.to_string: Callable[[], str] = to_string
        self.context_id: Optional[str] = context_id

    async def send_log(self, message: str, level: LogLevel) -> None:
        if level == "debug":
            log_level = logging.DEBUG
        elif level == "info":
            log_level = logging.INFO
        elif level == "warn":
            log_level = logging.WARN
        elif level == "error":
            log_level = logging.ERROR
        # noinspection PyUnboundLocalVariable
        self.logger.log(log_level, message)
        await self.send_message(notificationsChannel, {"log": {"message": message, "level": level}})

    async def send_notification(self, value: Dict[str, Any]) -> None:
        await self.send_message(notificationsChannel, {"notification": value})

    async def launch_intent(self, intent: NotificationsIntent, future: asyncio.Future) -> None:
        def callback(the_value: [Dict[str, Any]]) -> T:
            self.logger.debug(f"Received a result related to the intent '{intent}' for {self.to_string()}")
            if "cancel" in the_value:
                # noinspection PyUnresolvedReferences
                future.set_exception(
                    NotificationReturnedError(the_value["cancel"],
                                              NotificationReturnedErrorCause.CANCEL))
            elif "error" in the_value:
                # noinspection PyUnresolvedReferences
                future.set_exception(
                    NotificationReturnedError(the_value["error"],
                                              NotificationReturnedErrorCause.ERROR))
            else:
                # noinspection PyUnresolvedReferences
                future.set_result(the_value["value"])

        # Removes recursively the "None" values, faken from https://stackoverflow.com/questions/20558699/python-how-to-recursively-remove-none-values-from-a-nested-data-structure-list
        def remove_none(an_object: T) -> T:
            if isinstance(an_object, (list, tuple, set)):
                return type(an_object)(
                    remove_none(object_property) for object_property in an_object if
                    object_property is not None)
            elif isinstance(an_object, dict):
                return type(an_object)(
                    (remove_none(object_key), remove_none(object_value)) for
                    object_key, object_value in
                    an_object.items() if
                    object_key is not None and object_value is not None)
            else:
                return an_object

        # We use the "SuperDataClass.__dict__()" method to turn the dataclass instance into a dictionary
        intent_dictionary: Dict[str, Any] = intent.__dict__
        intent_dictionary = remove_none(intent_dictionary)
        body: Dict[str, Any] = {"intent": intent_dictionary}
        await self.send_message(notificationsChannel, body, callback)

    async def send_acknowledgment(self, success: bool) -> None:
        await self.send_message(notificationsChannel, {"acknowledgment": {"success": success}})

    async def send_message(self, channel: str, body: Dict[str, Any],
                           callback: Callable[[Dict[str, Any]], T] = None) -> None:
        context_id = self.context_id
        self.logger.debug(f"Sending the message {body} on channel '{channel}' for {self.to_string()}" + (
            f" attached to the context with id '{context_id}'" if context_id is not None else "") + (
                              " and waiting for a callback" if callback is not None else ""))
        value: Dict[str, Any] = {"apiKey": self.parameters.api_key, "extensionId": self.parameters.extension_id,
                                 **body}
        if context_id is not None:
            value["contextId"] = context_id
        # noinspection PySimplifyBooleanCheck
        if self.sio is not None:
            await self.sio.emit(event=channel, data=value, namespace=None, callback=callback)
        else:
            await self.socket.emit(channel, value)


class Communicator:

    def __init__(self, logger: logging.Logger, sender: _MessageSender, queue: asyncio.Queue) -> None:
        super().__init__()
        self.logger: logging.Logger = logger
        self._sender: _MessageSender = sender
        self._queue: asyncio.Queue = queue

    def send_log(self, log: str, level: LogLevel) -> None:
        self._queue.put_nowait({"sender": self._sender, "type": "log", "log": log, "level": level})

    def send_notification(self, value: Dict[str, Any]) -> None:
        self._queue.put_nowait({"sender": self._sender, "type": "notification", "notification": value})

    def send_acknowledgment(self, success: bool) -> None:
        self._queue.put_nowait({"sender": self._sender, "type": "acknowledgment", "acknowledgment": success})

    async def launch_intent(self, intent: NotificationsIntent) -> T:
        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()
        await self._queue.put({"sender": self._sender, "type": "intent", "intent": intent, "future": future})
        # We wait for the future to be set by the callback
        value = await future
        return value

    async def _send_message(self, channel: str, body: Dict[str, Any],
                            callback: Callable[[Dict[str, Any]], T] = None) -> None:
        await self._sender.send_message(channel, body, callback)


SettingsValue = Dict[str, Any]


class PicteusExtension:
    __notifications = "notifications"

    @staticmethod
    def get_manifest() -> Manifest:
        with open(os.path.join(PicteusExtension.get_extension_home_directory_path(), "manifest.json"), "r") as file:
            string = file.read()
            return Manifest.from_json(string)

    @staticmethod
    def get_sdk_version() -> str:
        return get_version()

    @staticmethod
    def get_cache_directory_path() -> str:
        return os.path.abspath(os.path.join(PicteusExtension.get_extension_home_directory_path(), ".cache"))

    @staticmethod
    def get_extension_home_directory_path() -> str:
        return os.path.abspath(os.path.join(os.getcwd(), "."))

    def __init__(self) -> None:
        self.logger: logging.Logger = getLogger(__name__)
        self.logger.info(
            f"Instantiating the {self.to_string()} through the process with id '{os.getpid()}' relying on the SDK version '{PicteusExtension.get_sdk_version()}'")
        self.executor: Optional[ThreadPoolExecutor] = None
        self.queue: Optional[asyncio.Queue] = None
        self.use_event_driven: bool = True
        self.parameters: _ExtensionParameters = _ExtensionParameters(self._get_parameters())
        # noinspection PySimplifyBooleanCheck
        if self.parameters.web_services_base_url.startswith("https://localhost") == True:
            # This prevents the warning "InsecureRequestWarning: Unverified HTTPS request is being made.", because we are invoking a local HTTPS endpoint with a self-signed certificate
            urllib3.disable_warnings()
        self.extension_id: str = self.parameters.extension_id
        self.web_services_base_url: str = self.parameters.web_services_base_url
        self.api_key: str | None = self.parameters.api_key
        self.api_client: picteus_ws_client.ApiClient = self._get_api_web_services_client()
        self.sio: Optional[socketio.AsyncClient] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.socket: Optional[SimpleClient] = None
        self.global_communicator: Optional[Communicator] = None
        self.terminating: bool = False

    async def run(self) -> None:
        self.logger.info(f"Running the {self.to_string()}")
        self.terminating = False

        self.executor = ThreadPoolExecutor(max_workers=os.cpu_count())
        # We resort to a FIFO queue, so that messages are handled in creation order, and which is asynchronous so that the event loop is not blocked
        self.queue = asyncio.Queue()

        def exception_handler(_loop, context):
            message = context["message"]
            # This is inpired from articles https://superfastpython.com/asyncio-task-exception-was-never-retrieved/ and https://superfastpython.com/asyncio-event-loop-exception-handler
            if message != "Task exception was never retrieved":
                self.logger.error(f"An unexpected exception with message {message} occurred")

        # We set an exception handler on the running loop
        asyncio.get_running_loop().set_exception_handler(exception_handler)

        async def on_internal_terminate(signal_number, _stack_frame):
            self.logger.info(f"Received the termination signal '{signal_number}' regarding the {self.to_string()}")
            self.terminating = True
            try:
                await self.on_terminate()
            except Exception as exception:
                self.logger.error(
                    f"An error occurred while terminating the {self.to_string()}. Reason: '{str(exception)}'")
            finally:
                try:
                    await self._disconnect_socket()
                except Exception as exception:
                    self.logger.error(
                        f"An error occurred while exiting the {self.to_string()}. Reason: '{str(exception)}'")
                finally:
                    self.logger.info(f"Exiting from the {self.to_string()}")
                    sys.exit()

        # We set a "SIGTERM" signal handler
        signal.signal(signal.SIGTERM, lambda signal_number, stack_frame: asyncio.create_task(
            on_internal_terminate(signal_number, stack_frame)))

        async def pump_log_and_notifications_messages() -> None:
            while True:
                try:
                    # We wait in an asynchronous way, i.e. without active polling, in order not to consume CPU cycles
                    data = await self.queue.get()
                    data_type: str = data["type"]
                    try:
                        sender: _MessageSender = data["sender"]
                        if data_type == "log":
                            await sender.send_log(data["log"], data["level"])
                        elif data_type == "notification":
                            await sender.send_notification(data["notification"])
                        elif data_type == "intent":
                            await sender.launch_intent(data["intent"], data["future"])
                        elif data_type == "acknowledgment":
                            await sender.send_acknowledgment(data["acknowledgment"])
                        else:
                            self.logger.error(f"Unknown queue message with type '{data_type}'")
                    except Exception as exception:
                        self.logger.error(
                            f"An error occurred while pumping the queue message of type {data_type}. Reason: '{str(exception)}")
                except Exception as exception:
                    self.logger.error(f"An error occurred while pumping the queue message. Reason: '{str(exception)}")

        asyncio.get_running_loop().create_task(pump_log_and_notifications_messages())

        async def inner_initialize() -> None:
            # noinspection PySimplifyBooleanCheck
            if (await self.initialize()) == True:
                # noinspection PySimplifyBooleanCheck
                if self.use_event_driven == True:
                    await self._connect_socket_event_driven()
                else:
                    await self._connect_socket_simple_client()
            else:
                await self.on_ready(None)

        try:
            await inner_initialize()
        finally:
            self.logger.info(f"The {self.to_string()} is now over")

    def to_string(self) -> str:
        return "extension" + ("" if hasattr(self, 'extension_id') == False else (
            f" with id '{self.extension_id}'")) + f" of class '{self.__class__.__name__}'"

    # noinspection PyMethodMayBeStatic
    async def initialize(self) -> bool:
        return True

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        pass

    async def on_terminate(self) -> None:
        pass

    # noinspection PyMethodMayBeStatic
    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        return None

    # noinspection PyMethodMayBeStatic
    async def on_event(self, communicator: Communicator, event: str, value: Dict[str, Any]) -> Any | None:
        return None

    async def run_in_executor(self, function: Callable) -> Any | None:
        # noinspection PyTypeChecker
        return await asyncio.get_event_loop().run_in_executor(self.executor, function)

    def get_repository_api(self) -> picteus_ws_client.RepositoryApi:
        return picteus_ws_client.RepositoryApi(self.api_client)

    def get_image_api(self) -> picteus_ws_client.ImageApi:
        return picteus_ws_client.ImageApi(self.api_client)

    def get_miscellaneous_api(self) -> picteus_ws_client.MiscellaneousApi:
        return picteus_ws_client.MiscellaneousApi(self.api_client)

    def get_api_secret_api(self) -> picteus_ws_client.ApiSecretApi:
        return picteus_ws_client.ApiSecretApi(self.api_client)

    def get_extension_api(self) -> picteus_ws_client.ExtensionApi:
        return picteus_ws_client.ExtensionApi(self.api_client)

    def get_image_attachment_api(self) -> picteus_ws_client.ImageAttachmentApi:
        return picteus_ws_client.ImageAttachmentApi(self.api_client)

    def get_settings(self) -> SettingsValue:
        # noinspection PyUnresolvedReferences
        return picteus_ws_client.ExtensionApi(self.api_client).extension_get_settings(self.extension_id).value

    # noinspection PyMethodMayBeStatic
    def _get_parameters(self) -> Dict[str, str]:
        with open(os.path.join(PicteusExtension.get_extension_home_directory_path(), "parameters.json"), "r") as file:
            parameters = json.load(file)
            return parameters

    async def _connect_socket_event_driven(self) -> None:
        self.logger.info(f"Connecting the {self.to_string()} to the server")
        # The Socket.io Python documentation is available at https://python-socketio.readthedocs.io/en/latest/client.html
        use_ssl: bool = self.web_services_base_url.startswith("https")
        tcp_connector = aiohttp.TCPConnector(ssl=use_ssl, verify_ssl=False if use_ssl else None)
        self.session = aiohttp.ClientSession(connector=tcp_connector)
        self.sio = socketio.AsyncClient(logger=self.logger, http_session=self.session)
        global_sender = _MessageSender(self.logger, self.parameters, self.sio, None, self.to_string, None)
        self.global_communicator = Communicator(self.logger, global_sender, self.queue)

        @self.sio.event
        async def connect() -> None:
            self.logger.info(f"The {self.to_string()} socket is connected")
            await self.on_ready(self.global_communicator)

        @self.sio.event
        def connect_error(_data) -> None:
            self.logger.warning(f"The {self.to_string()} socket connection failed")

        @self.sio.event
        def disconnect() -> None:
            self.logger.info(f"The {self.to_string()} socket is disconnected")

        @self.sio.on("events")
        async def on_message(event: Dict[str, Any]) -> Any | None:
            command: Dict[str, Any] = event
            channel: str = command["channel"]
            milliseconds: int = command["milliseconds"]
            context_id: str = command["contextId"]
            value: Dict[str, Any] = command["value"]
            # noinspection PyTypeHints
            timestamp: datetime = datetime.datetime.fromtimestamp(milliseconds / 1000.0, tz=datetime.timezone.utc)
            timestamp_string = timestamp.strftime("%H:%M:%S.%f")[:-3]
            self.logger.info(
                f"The {self.to_string()} received at {timestamp_string} the command {command} on channel '{channel}' attached to the context with id '{context_id}'")
            sender = _MessageSender(self.logger, self.parameters, self.sio, None, self.to_string, context_id)
            communicator = Communicator(self.logger, sender, self.queue)

            async def handle_event() -> Any | None:
                is_regular_event: bool = channel != extension_settings_event
                success: bool = False
                try:
                    if is_regular_event is True:
                        result: Any | None = await self.on_event(communicator, channel, value)
                    else:
                        result: None = await self.on_settings(communicator, value.get("value"))
                    success = True
                    if is_regular_event is True and result is not None:
                        return result
                except Exception as inner_exception:
                    # We want the process to continue even if an exception occurs
                    self.logger.exception(f"An error occurred during the handling of the event on channel '{channel}'")
                    # We use the synchronous variant because we want the events to be handled in creation order
                    communicator.send_log(
                        f"The handling of the event failed. Reason: '{str(inner_exception)}'",
                        "error")
                finally:
                    # We use the synchronous variant because we want the events to be handled in creation order
                    communicator.send_acknowledgment(success)

            return await handle_event()

        await self.sio.connect(self.web_services_base_url, transports=["websocket"])
        await global_sender.send_message("connection",
                                         {
                                             "isOpen": True,
                                             "sdkVersion": PicteusExtension.get_sdk_version(),
                                             "environment": "python"
                                         })

        # noinspection PyBroadException
        try:
            # We wait forever
            await self.sio.wait()
        except Exception as exception:
            # This is expected and this happens when the process is terminated
            # noinspection PySimplifyBooleanCheck
            if self.terminating == True:
                pass
            else:
                self.logger.error(
                    f"An error occurred while listening to the server events. Reason: '{str(exception)}'")
        finally:
            # noinspection PySimplifyBooleanCheck
            if self.terminating == False:
                try:
                    await self.on_terminate()
                finally:
                    await self._disconnect_socket()
            self.logger.debug(f"The {self.to_string()} socket loop is over")

    async def _connect_socket_simple_client(self) -> None:
        self.logger.info(f"Connecting the {self.to_string()} to the server")
        # The Socket.io Python documentation is available at https://python-socketio.readthedocs.io/en/latest/client.html
        http_session = requests.Session()
        http_session.verify = False
        with SimpleClient(http_session=http_session) as socket:
            socket.connect(self.web_services_base_url, transports=["websocket"])
            self.socket = socket
            global_sender = _MessageSender(self.logger, self.parameters, None, self.socket, self.to_string, None)
            self.global_communicator = Communicator(self.logger, global_sender, self.queue)
            await global_sender.send_message("connection", {"isOpen": True})
            await self.on_ready(self.global_communicator)
            while True:
                try:
                    event = socket.receive()
                except Exception as exception:
                    # noinspection PySimplifyBooleanCheck
                    if self.terminating == True:
                        # This is expected
                        pass
                    else:
                        self.logger.error(
                            f"An error occurred while listening to the server events. Reason: '{str(exception)}'")
                    break

                command = event[1]
                channel = command["channel"]
                milliseconds: int = command["milliseconds"]
                context_id: str = command["contextId"]
                self.logger.info(
                    f"The {self.to_string()} received at {milliseconds} the command {command} on channel '{channel}' attached to the context with id '{context_id}'")
                sender = _MessageSender(self.logger, self.parameters, self.sio, None, self.to_string, context_id)
                communicator = Communicator(self.logger, sender, self.queue)
                success: bool = False
                try:
                    await self.on_event(communicator, channel, command["value"])
                    success = True
                except Exception as exception:
                    # We want the process to continue even if an exception occurs
                    self.logger.exception(f"An error occurred during the handling of the event on channel '{channel}'")
                    communicator.send_log(f"The handling of the event failed. Reason: '{str(exception)}'",
                                          "error")
                finally:
                    communicator.send_acknowledgment(success)

    async def _disconnect_socket(self) -> None:
        self.logger.info(f"Disconnecting the {self.to_string()} from the server")
        # noinspection PySimplifyBooleanCheck
        if self.use_event_driven == True:
            if self.sio is not None:
                await self.sio.disconnect()
                self.sio = None
                await self.session.close()
                self.session = None
        else:
            if self.socket is not None:
                self.socket.disconnect()
                self.socket = None

    def _get_api_web_services_client(self) -> picteus_ws_client.ApiClient:
        configuration = picteus_ws_client.Configuration(host=self.web_services_base_url)
        configuration.verify_ssl = False
        # If there is no API key, we do not set it
        if self.api_key is not None:
            configuration.api_key["api-key"] = self.api_key
        return picteus_ws_client.ApiClient(configuration)
