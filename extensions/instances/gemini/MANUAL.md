# Summary

This extension integrates with Google Gemini to generate images from text prompts, modify existing images, and enhance image organization through automatic captioning and tagging. Generated images and their creation recipes are saved in the extension's Picteus repository for easy access and management.

The extension sends image data to Google's Gemini API for processing. For modification operations, selected images are sent as visual references to guide the generation process.

A sidebar link to [Google Gemini](https://gemini.google.com) is also provided for direct access to the web interface.

# Prerequisites

To use this extension, you need:

1. A [Google AI Studio account](https://aistudio.google.com/) with access to the Gemini API
2. A valid Gemini API key configured in the extension settings
3. Network connectivity to reach the Google Gemini API endpoints

# Settings

- **Google Gemini API Key** (`apiKey`): Required API key used for all operations including image generation, image modification, captions, and eligible-tag computation. Obtain this key from [Google AI Studio](https://aistudio.google.com/api-keys);
- **Maximum tokens** (`maximumTokens`): Maximum output tokens for caption and eligible-tag responses. This setting does not affect image generation. The default is `2048`; the allowed range is `256` to `16384`.

# Commands

## generate

Generates an image from a text prompt using the selected Gemini image model and aspect ratio. The generated image and its complete generation recipe (including model, prompt, and parameters) are saved in the extension's Picteus repository, and the result is displayed when generation completes.

### Details

This command allows you to create entirely new images based on textual descriptions. The process involves sending your prompt along with selected model and aspect ratio parameters to the Gemini API, which then creates and returns the image.

- **Model**: Choose from multiple Gemini models:
  - `gemini-3-pro-image-preview` (highest quality, latest features)
  - `gemini-2.5-flash-image` (fast generation)
  - `gemini-nano-banana-2.1` (specialized nano banana model);
- **Aspect ratio**: Select from standard ratios including square (`1:1`), portrait (`2:3`, `4:5`, `9:16`), landscape (`3:2`, `16:9`, `21:9`), and other common formats (`3:4`, `5:4`);
- **Prompt**: Describe the image you want to generate in detail for best results.

Generated images are automatically stored in the extension's repository with metadata capturing the exact generation parameters for reproducibility.

## modify

Generates an image by combining your textual prompt with one or more selected reference images. The selected images are sent to Gemini as visual references to guide the generation process, allowing for creative transformations and variations.

### Details

This command enables you to use existing images as inspiration for new creations. Selected reference images are preprocessed (resized to fit within 1024×1024 pixels and stripped of sensitive metadata) before being sent to Gemini.

- **Model**: Choose from multiple Gemini models:
  - `gemini-3-pro-image-preview` (highest quality, latest features)
  - `gemini-2.5-flash-image` (fast generation)
  - `gemini-nano-banana-2.1` (specialized nano banana model);
- **Aspect ratio**: Select from standard ratios including square (`1:1`), portrait (`2:3`, `4:5`, `9:16`), landscape (`3:2`, `16:9`, `21:9`), and other common formats (`3:4`, `5:4`);
- **Prompt**: Describe the changes or result you want, referencing the visual style or elements from the selected images.

Before running this command, select one or more images that will serve as visual references. These images influence the style, composition, or specific elements in the generated result.
