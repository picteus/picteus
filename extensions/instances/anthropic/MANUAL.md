# Summary

This extension connects Picteus to Anthropic Claude vision models — including Claude 3.7 Sonnet, Claude 3.5 Sonnet,
Claude 3.5 Haiku, and Claude 3 Opus — to compute image captions and eligible tags. It reports available model
identifiers to Picteus, then processes the models, prompts, and candidate tags supplied with Picteus image-computation
requests. Generated captions are stored as Markdown image caption features under the technical model identifier, and
selected tags are submitted to Picteus for the image.

The extension runs as part of Picteus and requires an Anthropic API key; it does not provide separate manual commands.
If the API key is not configured, image computations are skipped and a diagnostic is sent to the Picteus activity log.

# Settings

- **Anthropic API Key** (`apiKey`): the secret API key from Anthropic — starting with `sk-ant-` — used to authenticate
  requests;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated responses, from `64` to `8192`; defaults to
  `1024`.

Picteus supplies the model and prompt for each caption request, as well as the model, prompt, and candidate tags for
each eligible tag request. When an API key is configured, the extension queries the Anthropic API to discover available
models dynamically, falling back to standard curated models when unconfigured or offline.
