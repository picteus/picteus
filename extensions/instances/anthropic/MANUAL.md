# Summary

This extension connects Picteus to the [Claude API](https://platform.claude.com/docs/en/home)
to compute image captions and eligible tags with available vision-capable models. It reports model identifiers to
Picteus, then sends the image, prompt, and candidate tags supplied with each image-computation request to Anthropic.
Generated captions are stored as Markdown caption features under the model identifier, and selected tags are assigned
to the image.

The extension runs as part of Picteus and requires an Anthropic API key; it has no standalone commands. If the key is
not configured, image computations are skipped.

# Prerequisites

Create an [Anthropic API key](https://platform.claude.com/settings/keys) and configure it in the extension settings.

# Settings

- **Anthropic API Key** (`apiKey`): the secret API key from Anthropic — starting with `sk-ant-` — used to authenticate
  requests;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated responses, from `256` to `16384`; defaults to
  `2048`.

Picteus supplies the model and prompt for each caption request, as well as the model, prompt, and candidate tags for
each eligible tag request. When an API key is configured, the extension queries the Anthropic API to discover available
vision-capable models dynamically.
