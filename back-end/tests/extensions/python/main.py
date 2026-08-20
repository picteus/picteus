import asyncio
import json
import os
import sys
from dataclasses import asdict
from typing import Dict, Any, List, Optional

from picteus_extension_sdk import PicteusExtension, Communicator, \
    SettingsValue, Versions, EventValue

blotter_file_path = os.path.join(os.getcwd(), "blotter.json")
blotter_events: List[Dict[str, Any]] = []


def save_blotter_file(id: str, value: Optional[Dict[str, Any]]) -> None:
    entry: Dict[str, Any] = {"id": id, "value": value}
    blotter_events.append(entry)
    print(f"Saving the blotter file '{blotter_file_path}' with new entry {entry}")

    def remove_nones(item: object) -> object:
        if isinstance(item, dict):
            return {
                aKey: remove_nones(aValue) for aKey, aValue in item.items() if aValue is not None
            }
        elif isinstance(item, list):
            return [remove_nones(aValue) for aValue in item if aValue is not None]
        else:
            return item

    with open(blotter_file_path, "w", encoding="utf-8") as file:
        json.dump(remove_nones(blotter_events), file, indent=2)


class TestPythonExtension(PicteusExtension):

    async def initialize(self) -> bool:
        result = await super().initialize()
        save_blotter_file("initialize", None)
        return result

    async def on_upgrade(self, communicator: Communicator, versions: Versions) -> None:
        await super().on_upgrade(communicator, versions)
        save_blotter_file("onUpgrade", asdict(versions))
        if "--failOnUpgrade" in sys.argv:
            raise Exception("onUpgrade")

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        await super().on_ready(communicator)
        save_blotter_file("onReady", None)

    async def on_terminate(self) -> None:
        await super().on_terminate()
        save_blotter_file("onTerminate", None)

    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        await super().on_settings(communicator, value)
        save_blotter_file("onSettings", value)

    async def on_event(self, communicator: Communicator, event: str, value: EventValue) -> Any | None:
        return await super().on_event(communicator, event, value)


asyncio.run(TestPythonExtension().run())
