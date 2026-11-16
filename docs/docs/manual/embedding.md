# Embeddings

An image embedding is a numerical vector produced by an encoder model. Picteus stores image embeddings in its vector
database and uses them for image similarity search and text-to-image search. Embeddings are one of the enrichment
facets described in [Facets](facets.md).

## Storage and identifiers

Image vectors are stored in Chroma DB. Each collection belongs to an extension and one embedding name, so vectors
produced by different models or extensions are kept in separate vector spaces. A collection uses cosine distance, and
all vectors in it must have the same dimension.

An image embedding contains an `id` and a `values` array:

| Property | Description |
|:---|:---|
| `id` | The embedding identifier within the extension. It is up to 128 characters. |
| `values` | A non-empty array of numbers, with up to 4,096 dimensions. |

Each request can include up to 16 embedding identifiers per extension. In the search selector, an image vector's
identifier is represented by `name`, paired with an `extensionId` to identify the corresponding vector collection.

When an extension writes embeddings, `setEmbeddings` replaces that extension's embeddings for the image with the
submitted vectors. `ensureEmbeddings` adds or updates only the submitted embedding identifiers and preserves other
vectors already stored by the extension. Deleting an image removes its vectors from Chroma DB; uninstalling an extension
removes the extension's collections.

## Model instructions

Extensions can declare AI models and the modalities each model supports, including `image.embeddings` and
`text.embeddings`. In the extension settings, users can enable embedding instructions and choose which declared model
to use. Each instruction identifies an AI model and has `enabled` and `isAuto` flags. An enabled automatic instruction
can run when images are indexed; enabled instructions are also used when the user requests image capability
synchronization.

When Picteus requests image embeddings, the extension receives the requested model information with the
`image.computeEmbeddings` event. Extensions implement the corresponding hook and store vectors through the image API.
For text-to-image search, Picteus sends the query text to an enabled extension that supports `text.embeddings`, then
uses the returned text vector to search the matching image embedding collection.

The image detail view includes an embeddings card for vectors stored on the image. From the image view, users can also
search for images that are similar to the selected image. The main search interface supports text-to-image search when
a compatible text embedding model is available.

See the [manifest reference](../extensions/reference/manifest.md) for capability declarations, the
[extension class reference](../extensions/reference/class.md) for the corresponding hooks, and
[extension synchronization](webservicesapi/extensions.md#extension-synchronization) for how capability runs are
requested.

## Similarity search

Image-to-image search compares an image's stored vector with vectors in the selected collection. Text-to-image search
first computes a text vector with the selected model, then searches the collection associated with that model. Searches
can return fewer results when no matching collection or vectors exist.

The image API exposes these operations:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/image/{id}/closestImages` | Finds images close to an image vector identified by `extensionId` and `name`. |
| `GET` | `/image/textToImages` | Computes text embeddings through a selected extension model and searches for matching images. |
| `PUT` | `/image/closestEmbeddingsImages` | Finds images close to supplied embedding vectors. |
| `GET` | `/repository/embeddingsNames` | Lists available extension and embedding-name pairs. |

For endpoint parameters and security requirements, see [Images — embeddings](webservicesapi/images.md#embeddings).

## Web services API

The image API stores and reads vectors owned by an extension:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/image/{id}/getEmbeddings` | Gets an image's vectors for one extension. |
| `GET` | `/image/{id}/getAllEmbeddings` | Gets an image's vectors for all extensions. |
| `PUT` | `/image/{id}/setEmbeddings` | Replaces the vectors stored by an extension for an image. |
| `PUT` | `/image/{id}/ensureEmbeddings` | Adds or updates supplied vectors without replacing other vectors for the image. |

Each vector in a request body has an `id` and a `values` array. The complete request and response schemas are available
in the [generated API reference](webservicesapi/reference/picteus).

Extensions configure available AI models and embedding instructions through the extension API. See
[Extensions](webservicesapi/extensions.md#ai-models-and-capability-instructions) for those endpoints.
