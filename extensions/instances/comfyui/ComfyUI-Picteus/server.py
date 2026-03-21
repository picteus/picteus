import json

from aiohttp import web

import folder_paths
from server import PromptServer

picteus = "picteus"


@PromptServer.instance.routes.get("/%s/ping" % picteus)
async def ping(request) -> web.Response:
    return web.Response(status=204)


@PromptServer.instance.routes.post("/%s/load_workflow" % picteus)
async def load_workflow(request) -> web.Response:
    try:
        workflow = await request.json()
        PromptServer.instance.send_sync("picteus", workflow)
        return web.Response(status=200, text="")
    except Exception as exception:
        print(exception)
        return web.Response(status=400)


@PromptServer.instance.routes.get("/%s/get_directory_paths" % picteus)
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
