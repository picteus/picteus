# Summary

This extension connects Picteus to a configured
[Ollama](https://ollama.com) server to compute image captions and eligible tags using vision-language models. It
reports available models to Picteus and pulls a requested model from
the [Ollama model library](https://ollama.com/library)
when needed. Images and prompts are sent to the configured server; generated captions are stored as string caption
features, and selected tags are assigned to the image.

The extension runs as part of Picteus and requires a reachable Ollama server. If the server is unavailable or a model
cannot be pulled, the corresponding image computation is skipped.

# Prerequisites

[Ollama](https://docs.ollama.com/) must be installed and running at a URL reachable from Picteus.

# Settings

- **Ollama URL** (`ollamaUrl`): base URL of the Ollama server; defaults to `http://127.0.0.1:11434`.

Picteus supplies the model, prompt, and candidate tags for each image-computation request. The extension pulls a model
from Ollama when it is requested and not already available locally.
