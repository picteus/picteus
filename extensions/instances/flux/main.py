import asyncio
import os
from typing import Dict, Any, Optional

from picteus_extension_sdk import PicteusExtension
from picteus_extension_sdk.picteus_extension import NotificationEvent, Communicator, SettingsValue

os.environ["TRANSFORMERS_CACHE"] = PicteusExtension.get_cache_directory_path()
os.environ["HF_HOME"] = PicteusExtension.get_cache_directory_path()

from huggingface_hub import login
import torch
from diffusers import FluxPipeline


class FluxExtension(PicteusExtension):
    _accessToken: str | None

    async def on_ready(self, communicator: Optional[Communicator]) -> None:
        await super().on_ready(communicator)
        await self._setup(self.get_settings())

    async def on_settings(self, communicator: Communicator, value: SettingsValue) -> None:
        await self._setup(self.get_settings())

    async def on_event(self, communicator: Communicator, event: str, value: Dict[str, Any]) -> Any | None:
        if event == NotificationEvent.PROCESS_RUN_COMMAND:
            command_id: str = value["commandId"]
            if command_id == "generate":
                parameters: Dict[str, Any] = value["parameters"]
                await self._generate(communicator, parameters)

        return None

    async def _generate(self, communicator: Communicator, parameters: Dict[str, Any]) -> None:
        login(token=self._accessToken, add_to_git_credential=False)
        pipe = FluxPipeline.from_pretrained("black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16,
                                            cache_dir=PicteusExtension.get_cache_directory_path())
        pipe.enable_model_cpu_offload()
        # save some VRAM by offloading the model to CPU. Remove this if you have enough GPU power

        prompt = "A cat holding a sign that says hello world"
        image = pipe(
            prompt,
            guidance_scale=0.0,
            num_inference_steps=4,
            max_sequence_length=256,
            generator=torch.Generator("cpu").manual_seed(0)
        ).images[0]
        image.save("flux-schnell.png")

    async def _setup(self, value: SettingsValue) -> None:
        self._accessToken = value["accessToken"]


asyncio.run(FluxExtension().run())
