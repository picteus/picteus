# API

Picteus extension SDKs embed the entirety of the back-end REST web services API, completely generated from OpenAPI specifications. Extensions can interact with any back-end resource — images, repositories, collections, tags, features, secrets — without requiring manual HTTP request configuration.

For a comprehensive functional description of the underlying API, its endpoints, and data contracts, refer to the [Web services API](../../manual/webservicesapi.md) documentation.

---

## Full back-end API embedded in the SDK

A core strength of the extension SDK is that it embeds the entirety of the back-end REST API, generated directly from the official OpenAPI specifications.

> [!TIP]
> **Zero manual API configuration**
> : when your extension runs, the `PicteusExtension` base class automatically initializes all REST clients with the server's base URL and authentication credentials (`apiKey`). You do not need to configure HTTP headers, tokens, serialization, or base URLs manually — every back-end service is instantly accessible through typed methods and models.

Your extension can interact with any capability and resource provided by the back-end:
- search, filter, sort, and paginate through image libraries ;
- download binary image blobs in various formats (`JPEG`, `PNG`, `WEBP`, `GIF`, `AVIF`, `HEIC`) with on-the-fly resizing and metadata stripping ;
- ingest and store new images into repositories, preserving parent/child transformation lineages ;
- extract, attach, and query structured features, tags, and vector embeddings ;
- inspect and manage collections and storage repositories ;
- access secure third-party credentials managed within the application via the API Secret service.

For the full functional description of all available endpoints and services, see the [Web services API](../../manual/webservicesapi.md) documentation.

---

## Available API clients and capabilities

The `PicteusExtension` base class exposes preconfigured getters for all back-end API clients:

| API getter (TypeScript) | API getter (Python) | Capabilities & scope |
|:---|:---|:---|
| `this.getImageApi()` | `self.get_image_api()` | **Images**: query image metadata, search with complex filters and pagination, download image binary blobs — with resizing and formatting options —, update or delete tags, and set custom extracted features. |
| `this.getRepositoryApi()` | `self.get_repository_api()` | **Repositories**: list registered image repositories and store newly created or processed image blobs into specific repositories with optional parent image linkage. |
| `this.getCollectionApi()` | `self.get_collection_api()` | **Collections**: query, create, inspect, and organize user collections of images. |
| `this.getExtensionApi()` | `self.get_extension_api()` | **Extensions**: manage extension-related state and query user settings stored on the server. |
| `this.getApiSecretApi()` | `self.get_api_secret_api()` | **API Secrets**: securely retrieve encrypted API keys and external access tokens configured in the UI. |
| `this.getImageAttachmentApi()` | `self.get_image_attachment_api()` | **Attachments**: upload, download, and manage arbitrary binary attachment files associated with images. |
| `this.getMiscellaneousApi()` | `self.get_miscellaneous_api()` | **System & Diagnostics**: query system health, runtime parameters, and server utility endpoints. |

---

## API usage examples (TypeScript and Python)

### 1. Searching images and querying metadata

````carousel
```typescript
// TypeScript example: searching recent images
const summaries = await this.getImageApi().imageSearchSummaries({
  searchParameters: {
    filter: {
      sorting: { property: "importDate", isAscending: false }
    },
    range: { take: 10, skip: 0 }
  }
});

for (const summary of summaries.items)
{
  this.logger.info(`Found image ${summary.id} with title '${summary.name}'`);
}
```
<!-- slide -->
```python
# Python example: searching recent images
from picteus_ws_client import SearchParameters, SearchFilter, SearchSorting, SearchSortingProperty, SearchRange

summaries = self.get_image_api().image_search_summaries(
    search_parameters=SearchParameters(
        filter=SearchFilter(
            sorting=SearchSorting(property=SearchSortingProperty.IMPORTDATE, isAscending=False)
        ),
        range=SearchRange(take=10, skip=0)
    )
)

for summary in summaries.items:
    self.logger.info(f"Found image {summary.id} with title '{summary.name}'")
```
````

### 2. Downloading blobs and ingesting transformed images

````carousel
```typescript
// TypeScript example: downloading, resizing, and storing a new image
import { ImageFormat, ImageResizeRender } from "@picteus/extension-sdk";

// 1. Download image as a processed JPEG blob
const imageBlob: Blob = await this.getImageApi().imageDownload({
  id: sourceImageId,
  format: ImageFormat.Jpeg,
  width: 1024,
  height: 1024,
  resizeRender: ImageResizeRender.Inbox,
  stripMetadata: true
});

// 2. Ingest the new image into the repository, linked to the parent
const newImage = await this.getRepositoryApi().repositoryStoreImage({
  id: repositoryId,
  parentId: sourceImageId,
  body: imageBlob
});

this.logger.info(`Stored new converted image with ID: ${newImage.id}`);
```
<!-- slide -->
```python
# Python example: downloading, resizing, and storing a new image
from picteus_ws_client import ImageFormat, ImageResizeRender

# 1. Download image bytes
image_bytes: bytearray = self.get_image_api().image_download(
    id=source_image_id,
    format=ImageFormat.JPEG,
    width=1024,
    height=1024,
    resize_render=ImageResizeRender.INBOX,
    strip_metadata=True
)

# 2. Ingest the new image into the repository, linked to the parent
new_image = self.get_repository_api().repository_store_image(
    id=repository_id,
    parent_id=source_image_id,
    body=image_bytes
)

self.logger.info(f"Stored new converted image with ID: {new_image.id}")
```
````

### 3. Setting tags and custom extracted features

````carousel
```typescript
// TypeScript example: updating tags and features
import { ImageFeatureType, ImageFeatureFormat } from "@picteus/extension-sdk";

// Attach tags to an image
await this.getImageApi().imageSetTags({
  id: imageId,
  extensionId: this.extensionId,
  requestBody: ["nature", "landscape", "sunset"]
});

// Attach structured features
await this.getImageApi().imageSetFeatures({
  id: imageId,
  extensionId: this.extensionId,
  imageFeature: [
    {
      type: ImageFeatureType.Other,
      format: ImageFeatureFormat.String,
      name: "dominantColor",
      value: "#FF5733"
    }
  ]
});
```
<!-- slide -->
```python
# Python example: updating tags and features
from picteus_ws_client import ImageFeature, ImageFeatureType, ImageFeatureFormat, ImageFeatureValue

# Attach tags to an image
self.get_image_api().image_set_tags(
    id=image_id,
    extension_id=self.extension_id,
    request_body=["nature", "landscape", "sunset"]
)

# Attach structured features
self.get_image_api().image_set_features(
    id=image_id,
    extension_id=self.extension_id,
    image_feature=[
        ImageFeature(
            type=ImageFeatureType.OTHER,
            format=ImageFeatureFormat.STRING,
            name="dominantColor",
            value=ImageFeatureValue("#FF5733")
        )
    ]
)
```
````
