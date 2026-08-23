import asyncio
import datetime
import json
import logging
import os
import signal
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, is_dataclass, dataclass
from enum import StrEnum
from logging import getLogger, basicConfig
from typing import Dict, Any, Literal, TypeVar, Callable, Optional, Never, List

import aiohttp
import socketio
import urllib3
from socketio import SimpleClient

import picteus_ws_client
from picteus_extension_sdk import get_version, ToastIntent, IntentToastType
from picteus_extension_sdk.intents import Intent, IntentToast
from picteus_ws_client import Manifest

basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s.%(msecs)03d | %(process)d | %(threadName)s [%(levelname)5s]: %(message)s",
    datefmt="%H:%M:%S")

T = TypeVar("T")

LogLevel = Literal["debug", "info", "warn", "error"]

EventValue = Dict[str, Any]


class InstructionReturnedErrorCause(StrEnum):
    CANCEL = "cancel"
    ERROR = "error"


class InstructionReturnedError(Exception):

    def __init__(self, message: str, reason: InstructionReturnedErrorCause) -> None:
        super().__init__(message)
        self.reason: InstructionReturnedErrorCause = reason


CommandParameters = Dict[str, Any]


class CommandError(Exception):

    def __init__(self, error: str | Exception) -> None:
        super().__init__(str(error) if isinstance(error, Exception) else error)


class EventName(StrEnum):
    PROCESS_RUN_COMMAND = "process.runCommand"
    IMAGE_CREATED = "image.created"
    IMAGE_UPDATED = "image.updated"
    IMAGE_TAGS_UPDATED = "image.tags.updated"
    IMAGE_FEATURES_UPDATED = "image.features.updated"
    IMAGE_DELETED = "image.deleted"
    IMAGE_COMPUTE_FEATURES = "image.computeFeatures"
    IMAGE_COMPUTE_EMBEDDINGS = "image.computeEmbeddings"
    IMAGE_COMPUTE_TAGS = "image.computeTags"
    IMAGE_RUN_COMMAND = "image.runCommand"
    TEXT_COMPUTE_EMBEDDINGS = "text.computeEmbeddings"


extension_versions_channel: str = "extension.versions"
extension_ready_channel: str = "extension.ready"
extension_settings_channel: str = "extension.settings"

instructions_event: str = "instructions"


class Helper:
    GENERATION_RECIPE_SCHEMA_VERSION: int = 1


class _ExtensionParameters:

    def __init__(self, parameters: Dict[str, Any]):
        super().__init__()
        self._parameters: Dict[str, Any] = parameters
        self.extension_id: str = parameters.get("extensionId", "")
        self.web_services_base_url: str = parameters.get("webServicesBaseUrl", "")
        self.api_key: str = parameters.get("apiKey", "")


def _scrub_bytes(an_object: Any) -> Any:
    if is_dataclass(an_object) == True:
        an_object = asdict(an_object)
    if isinstance(an_object, dict):
        return {key: _scrub_bytes(value) for key, value in an_object.items()}
    elif isinstance(an_object, list):
        return [_scrub_bytes(index) for index in an_object]
    elif isinstance(an_object, (bytes, bytearray)):
        return "<bytes>"
    return an_object


class _MessageSender:

    def __init__(self, logger: logging.Logger, parameters: _ExtensionParameters, sio: socketio.AsyncClient,
                 to_string: Callable[[], str], context_id: Optional[str]) -> None:
        super().__init__()
        self.logger: logging.Logger = logger
        self.parameters: _ExtensionParameters = parameters
        self.sio: socketio.AsyncClient = sio
        self.to_string: Callable[[], str] = to_string
        self.context_id: Optional[str] = context_id
        self._maximum_payload_size_in_bytes: Optional[int] = None

    @property
    def maximum_payload_size_in_bytes(self):
        return self._maximum_payload_size_in_bytes

    @maximum_payload_size_in_bytes.setter
    def maximum_payload_size_in_bytes(self, value):
        self._maximum_payload_size_in_bytes = value

    async def send_log(self, message: str, level: LogLevel) -> None:
        if level == "debug":
            log_level = logging.DEBUG
        elif level == "info":
            log_level = logging.INFO
        elif level == "warn":
            log_level = logging.WARN
        elif level == "error":
            log_level = logging.ERROR
        else:
            raise RuntimeError(f"Unhandled log level '{level}'")
        self.logger.log(log_level, message)
        await self.send_message(instructions_event, {"log": {"message": message, "level": level}})

    async def send_notification(self, value: Dict[str, Any]) -> None:
        await self.send_message(instructions_event, {"notification": value})

    async def launch_intent(self, intent: Intent, future: Optional[asyncio.Future]) -> None:
        def callback(the_value: Dict[str, Any]) -> T:
            self.logger.debug(
                f"Received a result related to the intent '{_scrub_bytes(intent)}' for {self.to_string()}")
            if future is not None:
                if "cancel" in the_value:
                    future.set_exception(
                        InstructionReturnedError(the_value["cancel"],
                                                 InstructionReturnedErrorCause.CANCEL))
                elif "error" in the_value:
                    future.set_exception(
                        InstructionReturnedError(the_value["error"],
                                                 InstructionReturnedErrorCause.ERROR))
                else:
                    future.set_result(the_value.get("value", None))

        # Removes recursively the "None" values, taken from https://stackoverflow.com/questions/20558699/python-how-to-recursively-remove-none-values-from-a-nested-data-structure-list
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
        await self.send_message(instructions_event, body, callback)

    async def send_acknowledgment(self, success: bool) -> None:
        await self.send_message(instructions_event, {"acknowledgment": {"success": success}})

    async def send_message(self, event: str, body: Dict[str, Any],
                           callback: Optional[Callable[[Dict[str, Any]], T]] = None) -> None:
        context_id = self.context_id
        self.logger.debug(
            f"Sending the message {_scrub_bytes(body)} through the '{event}' event for {self.to_string()}" + (
                f" attached to the context with id '{context_id}'" if context_id is not None else "") + (
                " and waiting for a callback" if callback is not None else ""))
        value: Dict[str, Any] = {"apiKey": self.parameters.api_key, "extensionId": self.parameters.extension_id,
                                 **body}
        if context_id is not None:
            value["contextId"] = context_id
        await self.sio.emit(event=event, data=value, namespace=None, callback=callback)


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

    async def launch_intent(self, intent: Intent) -> T:
        loop = asyncio.get_event_loop()
        future: asyncio.Future = loop.create_future()
        await self._queue.put({"sender": self._sender, "type": "intent", "intent": intent, "future": future})
        # We wait for the future to be set by the callback
        value = await future
        return value

    async def _send_message(self, event: str, body: Dict[str, Any],
                            callback: Optional[Callable[[Dict[str, Any]], T]] = None) -> None:
        await self._sender.send_message(event, body, callback)


SettingsValue = Dict[str, Any]


@dataclass
class Versions:
    current: str
    previous: Optional[str] = None


class PicteusExtension:

    @staticmethod
    def get_manifest() -> Manifest:
        with open(os.path.join(PicteusExtension.get_extension_home_directory_path(), "manifest.json"), "r") as file:
            string = file.read()
            manifest = Manifest.from_json(string)
            if manifest is None:
                raise RuntimeError("Could not load the manifest properly")
            return manifest

    @staticmethod
    def get_sdk_version() -> str:
        return get_version()

    @staticmethod
    def get_cache_directory_path() -> str:
        return os.path.abspath(os.path.join(PicteusExtension.get_extension_home_directory_path(), ".cache"))

    @staticmethod
    def get_extension_home_directory_path() -> str:
        return os.path.abspath(os.path.join(os.getcwd(), "."))

    SOFTWARE: str = "picteus"

    def __init__(self) -> None:
        self.logger: logging.Logger = getLogger(__name__)
        self.logger.info(
            f"Instantiating the {self.to_string()} through the process with id '{os.getpid()}' relying on the SDK version '{PicteusExtension.get_sdk_version()}'")
        self.executor: Optional[ThreadPoolExecutor] = None
        self.parameters: _ExtensionParameters = _ExtensionParameters(self._get_parameters())
        if self.parameters.web_services_base_url.startswith("https://localhost"):
            # This prevents the warning "InsecureRequestWarning: Unverified HTTPS request is being made.", because we are invoking a local HTTPS endpoint with a self-signed certificate
            urllib3.disable_warnings()
        self.extension_id: str = self.parameters.extension_id
        self.web_services_base_url: str = self.parameters.web_services_base_url
        self.api_key: Optional[str] = self.parameters.api_key
        self.api_client: picteus_ws_client.ApiClient = self._get_api_web_services_client()
        self.sio: Optional[socketio.AsyncClient] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.socket: Optional[SimpleClient] = None
        self.terminating: bool = False

    async def run(self) -> None:
        self.logger.info(f"Running the {self.to_string()}")
        self.terminating = False

        self.executor = ThreadPoolExecutor(max_workers=os.cpu_count())
        # We resort to a FIFO queue, so that messages are handled in creation order, and which is asynchronous so that the event loop is not blocked
        queue: asyncio.Queue = asyncio.Queue()

        def exception_handler(_loop, context):
            message = context["message"]
            # This is inspired from articles https://superfastpython.com/asyncio-task-exception-was-never-retrieved/ and https://superfastpython.com/asyncio-event-loop-exception-handler
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
                except Exception as inner_exception:
                    self.logger.error(
                        f"An error occurred while exiting the {self.to_string()}. Reason: '{str(inner_exception)}'")
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
                    data = await queue.get()
                    data_type: str = data["type"]
                    try:
                        sender: _MessageSender = data["sender"]
                        if data_type == "log":
                            await sender.send_log(data["log"], data["level"])
                        elif data_type == "notification":
                            await sender.send_notification(data["notification"])
                        elif data_type == "intent":
                            await sender.launch_intent(data["intent"], data.get("future", None))
                        elif data_type == "acknowledgment":
                            await sender.send_acknowledgment(data["acknowledgment"])
                        else:
                            self.logger.error(f"Unknown queue message with type '{data_type}'")
                    except Exception as inner_exception:
                        self.logger.error(
                            f"An error occurred while pumping the queue message of type {data_type}. Reason: '{str(inner_exception)}")
                except Exception as exception:
                    self.logger.error(f"An error occurred while pumping the queue message. Reason: '{str(exception)}")

        asyncio.get_running_loop().create_task(pump_log_and_notifications_messages())

        async def inner_initialize() -> None:
            if await self.initialize():
                try:
                    await self._connect_socket(queue)
                except Exception as inner_exception:
                    self.exit(2, inner_exception, "the connection failed")
            else:
                await self.on_ready(None)

        try:
            await inner_initialize()
        except Exception as initialize_exception:
            self.exit(1, initialize_exception, "the initialization failed")
        finally:
            self.logger.info(f"The {self.to_string()} is now over")

    def to_string(self) -> str:
        return "extension" + ("" if hasattr(self, 'extension_id') == False else (
            f" with id '{self.extension_id}'")) + f" of class '{self.__class__.__name__}'"

    # noinspection PyMethodMayBeStatic
    async def initialize(self) -> bool:
        return True

    async def on_upgrade(self, communicator: Communicator, versions: Versions) -> None:
        pass

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        pass

    async def on_terminate(self) -> None:
        pass

    # noinspection PyMethodMayBeStatic,unused-parameter
    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        return None

    # noinspection PyMethodMayBeStatic
    async def on_event(self, communicator: Communicator, event: EventName, value: EventValue) -> Any | None:
        if event == EventName.IMAGE_CREATED:
            image_id: str = value["id"]
            return await self.on_image_created(communicator, image_id)
        elif event == EventName.IMAGE_UPDATED:
            image_id: str = value["id"]
            return await self.on_image_updated(communicator, image_id)
        elif event == EventName.IMAGE_DELETED:
            image_id: str = value["id"]
            return await self.on_image_deleted(communicator, image_id)
        elif event == EventName.IMAGE_TAGS_UPDATED:
            image_id: str = value["id"]
            return await self.on_image_tags_updated(communicator, image_id)
        elif event == EventName.IMAGE_FEATURES_UPDATED:
            image_id: str = value["id"]
            return await self.on_image_features_updated(communicator, image_id)
        elif event == EventName.IMAGE_COMPUTE_TAGS:
            image_id: str = value["id"]
            return await self.on_compute_image_tags(communicator, image_id)
        elif event == EventName.IMAGE_COMPUTE_FEATURES:
            image_id: str = value["id"]
            return await self.on_compute_image_features(communicator, image_id)
        elif event == EventName.IMAGE_COMPUTE_EMBEDDINGS:
            image_id: str = value["id"]
            return await self.on_compute_image_embeddings(communicator, image_id)
        elif event == EventName.IMAGE_RUN_COMMAND:
            command_id: str = value["commandId"]
            image_ids: List[str] = value["imageIds"]
            parameters: CommandParameters = value.get("parameters", {})
            return await self.on_images_command(communicator, command_id, image_ids, parameters)
        elif event == EventName.PROCESS_RUN_COMMAND:
            command_id: str = value["commandId"]
            parameters: CommandParameters = value.get("parameters", {})
            return await self.on_process_command(communicator, command_id, parameters)
        elif event == EventName.TEXT_COMPUTE_EMBEDDINGS:
            text: str = value["text"]
            return await self.on_compute_text_embeddings(communicator, text)
        return None

    async def on_image_created(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_image_updated(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_image_deleted(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_image_tags_updated(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_image_features_updated(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_compute_image_tags(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_compute_image_features(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_compute_image_embeddings(self, communicator: Communicator, image_id: str) -> None:
        pass

    async def on_images_command(self, communicator: Communicator, command_id: str, image_ids: List[str],
                                parameters: CommandParameters) -> None:
        pass

    async def on_process_command(self, communicator: Communicator, command_id: str,
                                 parameters: CommandParameters) -> None:
        pass

    # noinspection PyMethodMayBeStatic,unused-parameter
    async def on_compute_text_embeddings(self, communicator: Communicator, text: str) -> list[float]:
        return []

    async def run_in_executor(self, function: Callable) -> Any | None:
        return await asyncio.get_event_loop().run_in_executor(self.executor, function)

    def get_repository_api(self) -> picteus_ws_client.RepositoryApi:
        return picteus_ws_client.RepositoryApi(self.api_client)

    def get_collection_api(self) -> picteus_ws_client.CollectionApi:
        return picteus_ws_client.CollectionApi(self.api_client)

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
        return picteus_ws_client.ExtensionApi(self.api_client).extension_get_settings(id=self.extension_id).value

    # noinspection PyMethodMayBeStatic
    def _get_parameters(self) -> Dict[str, str]:
        with open(os.path.join(PicteusExtension.get_extension_home_directory_path(), "parameters.json"), "r") as file:
            parameters = json.load(file)
            return parameters

    async def _connect_socket(self, queue) -> None:
        self.logger.info(f"Connecting the {self.to_string()} to the server")
        # The Socket.io Python documentation is available at https://python-socketio.readthedocs.io/en/latest/client.html
        use_ssl: bool = self.web_services_base_url.startswith("https")
        tcp_connector = aiohttp.TCPConnector(ssl=use_ssl, verify_ssl=False if use_ssl else True)
        self.session = aiohttp.ClientSession(connector=tcp_connector)
        sio: socketio.AsyncClient = socketio.AsyncClient(logger=self.logger, http_session=self.session)
        self.sio = sio
        global_sender = _MessageSender(self.logger, self.parameters, sio, self.to_string, None)

        @sio.event
        async def connect() -> None:
            self.logger.info(f"The {self.to_string()} socket is connected")

            async def handle_response(result: Dict[str, Any]) -> None:
                maximum_payload_size_in_bytes: int = result.get("maximumPayloadSizeInBytes", -1)
                self.logger.debug(
                    f"The {self.to_string()} socket has a maximum payload size of {maximum_payload_size_in_bytes} bytes")
                global_sender.maximum_payload_size_in_bytes = maximum_payload_size_in_bytes

            await global_sender.send_message("connection",
                                             {
                                                 "isOpen": True,
                                                 "sdkVersion": PicteusExtension.get_sdk_version(),
                                                 "environment": "python"
                                             }, handle_response)

        @sio.event
        def connect_error(_data) -> None:
            self.logger.warning(f"The {self.to_string()} socket connection failed")

        @sio.event
        def disconnect() -> None:
            self.logger.info(f"The {self.to_string()} socket is disconnected")

        @sio.on("events")
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
            sender = _MessageSender(self.logger, self.parameters, sio, self.to_string, context_id)
            sender.maximum_payload_size_in_bytes = global_sender.maximum_payload_size_in_bytes
            communicator = Communicator(self.logger, sender, queue)

            async def handle_event() -> Any | None:
                requires_result: bool = channel != extension_settings_channel
                success: bool = False
                event_name: EventName | None = None
                try:
                    if channel == extension_settings_channel:
                        result: None = await self.on_settings(communicator, value["value"])
                    elif channel == extension_versions_channel:
                        previous: Optional[str] = value.get("previous", None)
                        current: str = value["current"]
                        upgrade: bool = value["upgrade"]
                        if upgrade:
                            await self.on_upgrade(communicator, Versions(current, previous))
                            result: bool = True
                        else:
                            result: bool = True
                    elif channel == extension_ready_channel:
                        try:
                            await self.on_ready(communicator)
                            result: bool = True
                        except Exception as inner_exception:
                            self.exit(3, inner_exception,
                                      "an error occurred during the execution of the 'onReady()' method: stopping the process")
                    else:
                        regular_event_name = EventName(channel)
                        event_name = regular_event_name
                        result: Any | None = await self.on_event(communicator, regular_event_name, value)
                    success = True
                    if requires_result is True and result is not None:
                        return result
                except Exception as inner_exception:
                    # We want the process to continue even if an exception occurs
                    self.logger.exception(f"An error occurred during the handling of the event on channel '{channel}'")
                    # We use the synchronous variant because we want the events to be handled in creation order
                    is_run_command = event_name == EventName.IMAGE_RUN_COMMAND or event_name == EventName.PROCESS_RUN_COMMAND
                    if is_run_command and isinstance(inner_exception, CommandError):
                        queue.put_nowait({"sender": sender, "type": "intent", "intent": ToastIntent(
                            toast=IntentToast(type=IntentToastType.ERROR, subtitle=str(inner_exception)))})
                    else:
                        communicator.send_log(f"The handling of the event failed. Reason: '{str(inner_exception)}'",
                                              "error")
                finally:
                    # We use the synchronous variant because we want the events to be handled in creation order
                    communicator.send_acknowledgment(success)

            return await handle_event()

        await sio.connect(self.web_services_base_url, transports=["websocket"])

        try:
            # We wait forever
            await sio.wait()
        except Exception as exception:
            # This is expected and this happens when the process is terminated
            if self.terminating:
                pass
            else:
                self.logger.error(
                    f"An error occurred while listening to the server events. Reason: '{str(exception)}'")
        finally:
            if not self.terminating:
                try:
                    await self.on_terminate()
                finally:
                    await self._disconnect_socket()
            self.logger.debug(f"The {self.to_string()} socket loop is over")

    async def _disconnect_socket(self) -> None:
        self.logger.info(f"Disconnecting the {self.to_string()} from the server")
        if self.sio is not None:
            await self.sio.disconnect()
            self.sio = None
            if self.session is not None:
                await self.session.close()
                self.session = None

    def exit(self, code: int, exception: Exception, message: str) -> Never:
        self.logger.error(f"For the {self.to_string()}, {message}. Reason: '{str(exception)}'")
        sys.exit(code)

    def _get_api_web_services_client(self) -> picteus_ws_client.ApiClient:
        # If there is no API key, we do not set it
        configuration = picteus_ws_client.Configuration(host=self.web_services_base_url,
                                                        api_key={"api-key": self.api_key} if self.api_key else None)
        configuration.verify_ssl = False
        return picteus_ws_client.ApiClient(configuration)
