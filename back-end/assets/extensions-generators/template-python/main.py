import asyncio
import json
from typing import Dict, Any, List

from picteus_extension_sdk import PicteusExtension
from picteus_extension_sdk.picteus_extension import NotificationEvent, Communicator


class PythonExtension(PicteusExtension):

    async def on_event(self, communicator: Communicator, event: str, value: Dict[str, Any]) -> Any | None:
        if event == NotificationEvent.IMAGE_CREATED or event == NotificationEvent.IMAGE_UPDATED or event == NotificationEvent.IMAGE_DELETED:
            image_id: str = value["id"]
            communicator.send_log(f"The image with id '{image_id}' was touched", "info")
        elif event == NotificationEvent.IMAGE_RUN_COMMAND:
            command_id: str = value["commandId"]
            image_ids: List[str] = value["imageIds"]
            parameters: Dict[str, Any] = value["parameters"]
            communicator.send_log(
                f"Received an image command with id '{command_id}' for the image with ids '{json.dumps(image_ids)}'",
                "debug")

        return None


asyncio.run(PythonExtension().run())
