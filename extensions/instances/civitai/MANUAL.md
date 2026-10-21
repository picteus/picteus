# Summary
This extension offers a bridge between Picteus and [Civitai](https://civitai.com).

It allows to retrieve images from this web site and to store all the information related to it.

# Prerequisites

# Settings

# Commands

## fetchImages
Retrieves a specified quantity of images from Civitai for a given user or post. The images are stored in the extension repository alongside their generation recipe and metadata, tagged with `civitai`.

### Parameters
* `source`: the source of images — either a user identifier (`userName`) or a post identifier (`postId`);
* `count`: the number of images to retrieve — defaults to 10;
* `onlyWithMetadata`: whether to retain only images that include generation metadata — defaults to `true`. When set to `true`, the extension automatically paginates through Civitai results until the requested count is met or no further images are available.
