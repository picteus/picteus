# Summary

This extension connects Picteus to the [Mistral API](https://docs.mistral.ai/) to compute
image captions and eligible tags with available vision-capable models. It reports model identifiers to Picteus, then
sends the image, prompt, and candidate tags supplied with each image-computation request to Mistral. Generated captions
are stored as Markdown caption features under the model identifier, and selected tags are assigned to the image.

The extension runs as part of Picteus and requires a Mistral API key; it has no standalone commands. If the key is not
configured, image computations are skipped.

# Prerequisites

Create a Mistral API key in the [Mistral console](https://console.mistral.ai/api-keys/) and configure it in the
extension settings.

# Settings

- **Mistral API Key** (`apiKey`): the secret API key from Mistral AI used to authenticate requests;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated responses, from `256` to `16384`; defaults to
  `2048`.

Picteus supplies the model and prompt for each caption request, as well as the model, prompt, and candidate tags for
each eligible tag request. When an API key is configured, the extension queries the Mistral API to discover available
vision-capable models dynamically.
