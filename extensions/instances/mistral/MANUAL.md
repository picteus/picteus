# Summary

This extension connects Picteus to Mistral AI vision models — including Pixtral Large, Pixtral 12B, and Mistral Small —
to compute image captions and eligible tags. It reports available model identifiers to Picteus, then processes the
models, prompts, and candidate tags supplied with Picteus image-computation requests. Generated captions are stored as
Markdown image caption features under the technical model identifier, and selected tags are submitted to Picteus for the
image.

The extension runs as part of Picteus and requires a Mistral API key; it does not provide separate manual commands. If
the API key is not configured, image computations are skipped and a diagnostic is sent to the Picteus activity log.

# Settings

- **Mistral API Key** (`apiKey`): the secret API key from Mistral AI used to authenticate requests;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated responses, from `256` to `16384`; defaults to
  `2048`.

Picteus supplies the model and prompt for each caption request, as well as the model, prompt, and candidate tags for
each eligible tag request. When an API key is configured, the extension queries the Mistral API to discover available
vision-capable models dynamically, falling back to standard curated models when unconfigured or offline.
