# Summary
This extension connects Picteus with [Replicate](https://replicate.com), enabling the generation and modification of images using cloud-hosted machine learning models through predictions.

It provides three primary capabilities:
- dynamic execution of arbitrary Replicate models by identifier, with automated OpenAPI input schema introspection and interactive dialog form generation ;
- text-to-image generation via the Flux Pro model (`black-forest-labs/flux-kontext-pro`) ;
- image-to-image modification using a selected reference image via Flux Pro.

Upon initialization, the extension automatically provisions and watches a dedicated repository named "Replicate". All generated images are downloaded, stored in this repository, tagged with `replicate`, annotated with generation recipe metadata (model tags, prediction URL, input arguments) and prompt descriptions, and displayed directly in the image viewer. In addition, the extension embeds the Replicate web platform directly into the Picteus sidebar for convenient model discovery.

This extension operates against Replicate's cloud web services and requires third-party API credentials along with an active internet connection.

# Prerequisites
To use this extension, the following prerequisites must be met:
- an active account on [Replicate](https://replicate.com) with billing or prediction credits configured ;
- an API token created from your [Replicate account settings](https://replicate.com/account/api-tokens) ;
- an active internet connection allowing communication with Replicate web services and asset downloads.

# Settings
The extension declares the following configuration setting:
- `API token` specifies the [Replicate API token](https://replicate.com/account/api-tokens) used to authenticate web service requests when inspecting model schemas and executing prediction jobs. The token is stored securely as a masked password field.

# Commands

## run
Executes any public or accessible private Replicate model by providing its identifier, automatically querying its input parameters to generate an interactive configuration dialog.

- `Model Identifier`: the identifier of the Replicate model to execute, specified in `owner/name` or `owner/name:version` format (defaults to `bytedance/seedream-4`).

1. The extension validates the model identifier format and queries Replicate for model details and its OpenAPI input schema.
2. It dynamically parses the schema components, resolves references, and renders a native input form inside Picteus asking for the model's required and optional arguments — such as prompts, dimensions, aspect ratios, or sampling steps.
3. Upon form submission, the prediction is initiated on Replicate and monitored until completion.
4. Once completed, the output image is downloaded — supporting `.png`, `.jpeg`, `.jpg`, `.webp`, and `.avif` formats —, stored in the "Replicate" repository under the prediction identifier, tagged with `replicate`, and annotated with its generation recipe and prompt features.
5. The generated image is displayed immediately in an image viewer dialog.

## generate
Generates a new image from scratch using the Flux Pro model (`black-forest-labs/flux-kontext-pro`) hosted on Replicate.

1. The extension queries Replicate for the current input schema of `black-forest-labs/flux-kontext-pro`.
2. An interactive dialog prompts for generation instructions and parameters — including the prompt, aspect ratio, guidance, and output quality settings.
3. The extension submits the prediction to Replicate and waits for processing to complete.
4. The resulting image is downloaded and saved in the "Replicate" repository.
5. A generation recipe containing the model details, prediction URL, and prompt instructions is attached as an image feature, alongside the `replicate` extension tag.
6. The resulting image is displayed in the image viewer dialog.

## modify
Transforms an existing image from the Picteus library using the Flux Pro model (`black-forest-labs/flux-kontext-pro`) on Replicate.

1. The command operates on the currently selected image in the Picteus interface.
2. The extension downloads the selected image, normalizes it to a 1024x1024 PNG asset with stripped metadata, and assigns it as the reference image.
3. An interactive configuration dialog prompts for modification instructions and guidance parameters — with the reference image parameter handled automatically.
4. The extension submits the image-to-image prediction to Replicate.
5. The resulting image is stored in the "Replicate" repository with its `parentId` linked to the source image, preserving creation lineage in Picteus.
6. The source image identifier is recorded in the generation recipe's `inputAssets` array, accompanied by the recipe feature, prompt feature, and `replicate` tag.
7. The modified image is displayed in the image viewer dialog.
