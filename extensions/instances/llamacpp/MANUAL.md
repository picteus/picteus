# Summary

This extension connects Picteus to a `llama-server` instance and uses its vision-language models to compute image
captions and eligible tags. It reports model identifiers available from the server to Picteus, then processes the
models, prompts, and tag candidates supplied with Picteus image-computation requests. Generated captions are stored as
image caption features, and selected tags are submitted to Picteus for the image.

The extension runs as part of Picteus and depends on a reachable `llama-server`; it does not provide a separate
question-and-answer command. If the server is unavailable or a requested model cannot be loaded, that computation is
skipped and a diagnostic is sent to the Picteus activity log.

# Prerequisites

Install llama.cpp for your operating system using
the [official installation guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md):

- **macOS**: [Homebrew](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#homebrew-mac-and-linux)
  or [MacPorts](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#macports-mac);
- **Windows**: [WinGet](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#winget-windows)
  or [conda-forge](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#conda-forge-windows-mac-and-linux);
-
**Linux**: [Homebrew](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#homebrew-mac-and-linux), [Nix](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#nix-mac-and-linux),
or [conda-forge](https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md#conda-forge-windows-mac-and-linux).

Then run [`llama-server`](https://github.com/ggml-org/llama.cpp/tree/master/tools/server) with a vision-language model
and its matching multimodal projector so the server can accept image inputs. For example:

```bash
llama-server \
  --model /path/to/model.gguf \
  --mmproj /path/to/mmproj.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  --ctx-size 4096
```

Set the extension's URL to an address reachable from the Picteus back end. The extension checks the server's health and
obtains model identifiers from its `/v1/models` endpoint. In router mode, it requests models through `/models/load`;
with a single-model server, the active model must correspond to the model requested by Picteus.

# Settings

- **llama.cpp URL** (`llamaUrl`): the base URL of the `llama-server` instance; defaults to `http://127.0.0.1:8080`;
- **Temperature** (`temperature`): sampling temperature for caption generation, from `0` to `1`; defaults to `0.2`;
- **Maximum tokens** (`maxTokens`): upper token limit for caption generation, from `256` to `16384`; defaults to `2048`.

Picteus supplies the model and prompt for each caption request, and the model, prompt, and candidate tags for each tag
request. The temperature and maximum-token settings apply to caption generation; tag extraction uses a fixed temperature
and a structured response restricted to the supplied candidates.
