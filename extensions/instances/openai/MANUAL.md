# Summary

This extension connects [Picteus](https://www.picteus.com) to the [OpenAI API](https://developers.openai.com/api/docs/)
to compute image captions and eligible tags with available vision-capable models. It reports model identifiers to
Picteus, then sends each requested image, prompt, and candidate tags to OpenAI. Generated captions are stored as
Markdown caption features under the model identifier, and selected tags are assigned to the image.

The extension runs as part of Picteus and requires an OpenAI API key; it has no standalone commands. If the key is not
configured, image computations are skipped.

# Prerequisites

Create an [OpenAI API key](https://platform.openai.com/api-keys) and configure it in the extension settings.

# Settings

- **OpenAI API Key** (`apiKey`): the secret API key from OpenAI — starting with `sk-` — used to authenticate requests;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated responses, from `256` to `16384`; defaults to
  `2048`.

Picteus supplies the model and prompt for each caption request, as well as the model, prompt, and candidate tags for
each eligible tag request. When an API key is configured, the extension queries the OpenAI API to discover available
vision-capable models dynamically.
