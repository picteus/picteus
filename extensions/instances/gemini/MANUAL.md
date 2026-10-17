# Summary

This extension connects Picteus with [Google Gemini](https://gemini.google.com) to generate images, analyze images,
compute image captions, and evaluate eligible tags. It reports available Gemini vision models to Picteus, then processes
the models, prompts, and candidate tags supplied with Picteus image-enrichment requests. Generated captions are stored
as string image caption features under the technical model identifier, and selected candidate tags are assigned to
the image.

Whenever an image is created or updated, the extension also inspects image metadata to assess whether the image was
created with Google AI or Picasa, tagging it accordingly.

# Settings

- **Google Gemini API Key** (`apiKey`): the secret [Google Gemini API key](https://aistudio.google.com/api-keys) used
  when interacting with Gemini via web services;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated text and enrichment responses, from `256` to
  `8192`; defaults to `2048`.

# Commands

## Generate

Generates an image from a prompt, following a specified aspect ratio, using image generative models exposed through
Gemini.

## Modify

Generates an image from a prompt combined with reference images, following an aspect ratio, using image generative
models exposed through Gemini.
