# Summary

This extension connects Picteus to the [Gemini API](https://ai.google.dev/gemini-api/docs)
for image generation, image modification, captioning, and eligible-tag computation. It reports available models to
Picteus and sends image data, prompts, and candidate tags to Google for the requested operation. Captions are stored as
string caption features under the model identifier, and selected tags are assigned to the image. The "Generate" command
creates an image from a text prompt; "Modify" uses selected images as references. Generated images and generation
metadata are stored in the extension's Picteus repository.

The extension also provides a sidebar integration for [Google Gemini](https://gemini.google.com) and tags images whose
metadata identifies them as created with Google AI or Picasa.

# Prerequisites

Create a [Gemini API key](https://aistudio.google.com/api-keys) and configure it in the extension settings.

# Settings

- **Google Gemini API Key** (`apiKey`): the secret [Google Gemini API key](https://aistudio.google.com/api-keys) used
  when interacting with Gemini via web services;
- **Maximum tokens** (`maximumTokens`): upper token limit for generated text and enrichment responses, from `256` to
  `16384`; defaults to `2048`.

# Commands

## Generate

Generates an image from a text prompt using the selected Gemini image model and aspect ratio, then stores the image
with generation metadata in the extension's Picteus repository.

## Modify

Generates an image from a text prompt and the selected images as references using the selected Gemini image model and
aspect ratio, then stores the result with generation metadata in the extension's Picteus repository.
