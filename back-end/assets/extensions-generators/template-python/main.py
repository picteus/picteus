import asyncio
import json
from typing import List

from picteus_extension_sdk import PicteusExtension, CommandParameters
from picteus_extension_sdk.picteus_extension import Communicator


class PythonExtension(PicteusExtension):

    async def on_image_created(self, communicator: Communicator, image_id: str) -> None:
        self._on_image_touched(communicator, image_id)

    async def on_image_updated(self, communicator: Communicator, image_id: str) -> None:
        self._on_image_touched(communicator, image_id)

    async def on_image_deleted(self, communicator: Communicator, image_id: str) -> None:
        self._on_image_touched(communicator, image_id)

    async def on_images_command(self, communicator: Communicator, command_id: str, image_ids: List[str],
                                parameters: CommandParameters) -> None:
        communicator.send_log(
            f"Received an image command with id '{command_id}' for the image with ids {json.dumps(image_ids)} and parameters {json.dumps(parameters)}",
            "debug")

    def _on_image_touched(self, communicator: Communicator, image_id: str) -> None:
        communicator.send_log(f"The image with id '{image_id}' was touched", "info")


asyncio.run(PythonExtension().run())
