import json
from aiohttp import web

from server import PromptServer
import folder_paths


@PromptServer.instance.routes.post("/picteus/load_workflow")
async def load_workflow(request) -> web.Response:
    try:
        workflow = await request.json()
        PromptServer.instance.send_sync("picteus", workflow)
        return web.Response(status=200, text="")
    except Exception as exception:
        print(exception)
        return web.Response(status=400)


@PromptServer.instance.routes.get("/picteus/get_directory_paths")
async def get_output_directory_path(request) -> web.Response:
    try:
        output_directory_path = folder_paths.get_output_directory()
        input_directory_path = folder_paths.get_input_directory()
        temporary_directory_path = folder_paths.get_temp_directory()
        return web.Response(status=200, text=json.dumps({"outputDirectoryPath": output_directory_path,
                                                         "inputDirectoryPath": input_directory_path,
                                                         "temporaryDirectoryPath": temporary_directory_path}))
    except Exception as exception:
        print(exception)
        return web.Response(status=400)
