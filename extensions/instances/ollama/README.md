# Purpose

This extension resorts to a Ollama instance to compute the textual description of an image. You must install the [Ollama](https://ollama.com) before using this extension.

It will download the "[llava](https://ollama.com/library)" models through Ollama if not already present, but you may download it yourself via the `ollama run <model>` command, which ensures that the model as been downloaded.

# Parameters

The extension may be customized as far as the Ollama port number listens to. Open the extensions and customize its
port number, which is set to `http://127.0.0.1:11434` by default.
