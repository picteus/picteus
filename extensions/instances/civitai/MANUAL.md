# Summary
This extension offers a bridge between Picteus and [Civitai](https://civitai.com).

It allows to retrieve images from this web site and to store all the information related to it.

# Prerequisites

# Settings

# Commands

## fetchImages
Retrieves images from Civitai for a given user or post, or retrieves one image by its Civitai image identifier. The images are stored in the extension repository alongside their generation recipe and metadata, tagged with `civitai`.

### Parameters
* `source`: the source of images — a user identifier (`userName`), a post identifier (`postId`), or one image identifier (`imageId`);
* `count`: the number of images to retrieve for a user or post source — not used for a single image source;
* `onlyWithMetadata`: whether to retain only images that include generation metadata. When enabled for a user or post source, the extension paginates through Civitai results until the requested count is met or no further images are available. When enabled for a single image source, an image without metadata is skipped.
