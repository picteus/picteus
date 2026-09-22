# Images

The image service provides access to image records, binary representations, metadata, searches, and extension-computed enrichment. All image endpoints are described in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).

## Endpoint summary

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/image/{id}/get` | Gets an image record. |
| `GET` | `/image/{id}/metadata` | Gets immutable image metadata. |
| `GET` | `/image/{id}/download` | Downloads an image with format, size, quality, and metadata options. |
| `GET` | `/image/{id}/mediaUrl` | Gets a media URL for an image. |
| `PUT` | `/image/{id}/modify` | Modifies supported image properties. |
| `DELETE` | `/image/{id}/delete` | Deletes an image. |
| `PUT` | `/image/convert` | Converts an image binary to a requested format. |
| `PUT` | `/image/format` | Computes the format of an image binary. |
| `POST` | `/image/search/ids` | Searches for matching image identifiers. |
| `POST` | `/image/search/images` | Searches for matching image records. |
| `POST` | `/image/search/summaries` | Searches for image summaries. |
| `POST` | `/image/search/mediaUrls` | Searches for image media URLs. |
| `POST` | `/image/search/tags` | Retrieves tags for matching images. |
| `POST` | `/image/search/features` | Retrieves features for matching images. |
| `GET` | `/image/textToImages` | Finds images matching text through an extension embedding. |
| `PUT` | `/image/closestEmbeddingsImages` | Finds images nearest to supplied embeddings. |
| `GET` | `/image/{id}/closestImages` | Finds images closest to a given image. |
| `GET` | `/image/{id}/collectionIds` | Lists collections containing an image. |
| `PUT` | `/image/{id}/runCapabilities` | Runs extension capabilities for one image. |
| `PUT` | `/image/search/runCapabilities` | Runs extension capabilities for matching images. |

## Tags

The tag endpoints replace or extend extension-owned tags, retrieve tags for one image, list repository tags, and search tags:

| Method | Endpoint | Permission |
|:---|:---|:---|
| `PUT` | `/image/{id}/setTags` | `image:tag:write` |
| `PUT` | `/image/{id}/ensureTags` | `image:tag:write` |
| `GET` | `/image/{id}/getTags` | `image:read` |
| `GET` | `/image/{id}/getAllTags` | `image:read` |
| `GET` | `/repository/tags` | `repository:read` |
| `POST` | `/image/search/tags` | `image:read` |

Tags are submitted as a JSON string array. `setTags` replaces the tags owned by the selected extension; `ensureTags` adds missing values without removing existing values. For the data model, validation rules, tombstone behavior, and extension lifecycle, see [Tags](../tags.md).

## Features

The feature endpoints store, extend, retrieve, and search structured image features:

| Method | Endpoint | Permission |
|:---|:---|:---|
| `PUT` | `/image/{id}/setFeatures` | `image:feature:write` |
| `PUT` | `/image/{id}/ensureFeatures` | `image:feature:write` |
| `GET` | `/image/{id}/getFeatures` | `image:read` |
| `GET` | `/image/{id}/getAllFeatures` | `image:read` |
| `GET` | `/image/{id}/getAllRecipes` | `image:read` |
| `GET` | `/repository/featureNames` | `repository:read` |
| `POST` | `/image/search/features` | `image:read` |

Feature request bodies contain typed feature records. `setFeatures` replaces the selected extension's records; `ensureFeatures` upserts supplied records. For supported types, formats, validation rules, recipes, and examples, see [Features](../features.md).

## Embeddings

The embedding endpoints store and retrieve extension-owned vectors and support similarity search:

| Method | Endpoint | Permission |
|:---|:---|:---|
| `PUT` | `/image/{id}/setEmbeddings` | `image:embedding:write` |
| `GET` | `/image/{id}/getEmbeddings` | `image:read` |
| `GET` | `/image/{id}/getAllEmbeddings` | `image:read` |
| `GET` | `/repository/embeddingsNames` | `repository:read` |
| `GET` | `/image/textToImages` | `image:read` |
| `PUT` | `/image/closestEmbeddingsImages` | `image:read` |

Embedding payloads contain named floating-point vectors. For vector storage, dimensionality rules, similarity thresholds, and examples, see [Embeddings](../embedding.md).

## Request and response details

The OpenAPI specification is the authoritative source for every parameter, request body, response schema, status code, and security requirement. Use the interactive Swagger UI described in the [API overview](index.md) to inspect and execute requests.
