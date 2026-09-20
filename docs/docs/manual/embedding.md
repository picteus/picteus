# Embeddings

In Picteus, a **vector embedding** is a high-dimensional numerical representation of an image, computed by a machine learning encoder model and stored in the embedded Chroma DB vector database. Embeddings capture semantic, aesthetic, or perceptual properties of images as floating-point vectors, enabling cross-modal similarity searches — such as finding images matching a text prompt or visually similar to a reference image — that are not achievable with relational keyword-based queries alone. Vector embeddings are part of the image enrichment facets triplet of Picteus — the high-level overview of which is documented in [Facets](facets.md).

---

## The role of vector embeddings

Traditional metadata, tags, and structured features operate on explicitly defined, human-readable values. However, many meaningful image properties — such as visual atmosphere, compositional similarity, or abstract aesthetic qualities — cannot be expressed as discrete categorical labels or exact numeric ranges.

Vector embeddings address this:

- **encoding latent visual meaning**: encoder models such as CLIP, SigLIP, or domain-specific networks compress the full visual content of an image into a compact, structured latent vector, retaining similarity relationships between semantically related images ;
- **enabling natural language image search**: text queries are encoded into the same vector space as images, allowing users to search using arbitrary prompts — such as "a misty forest at dawn" — without any pre-existing text annotation ;
- **powering reverse image search**: given a reference image, Picteus queries Chroma DB using its embedding vector to retrieve visually and semantically similar images within the repository ;
- **supporting multi-encoder architectures**: a single image can carry multiple named embedding vectors produced by different encoder models, each capturing a distinct representational dimension — visual aesthetics, facial identity, color distribution, or domain-specific features.

---

## Storage in Chroma DB

Unlike tags and structured features — which are persisted in the relational SQLite database — vector embeddings are stored in **Chroma DB**, an embedded open-source vector database that ships alongside the Picteus back-end.

### Chroma DB architecture

Chroma DB maintains vector collections indexed using **Hierarchical Navigable Small World (HNSW)** graphs. HNSW graphs allow approximate nearest-neighbor queries to execute in sub-linear time across millions of stored vectors, using cosine distance as the similarity metric.

### Collection naming and isolation

Each embedding collection in Chroma DB is scoped to a specific extension and embedding name combination. This isolation ensures that:

- different extension models do not interfere with each other's vector spaces ;
- each collection maintains a consistent embedding dimensionality — all vectors within a collection must share the same number of dimensions ;
- collections can be queried, updated, or deleted independently per extension.

### Embedding record structure

Each vector entry stored in Chroma DB consists of the following fields:

| Field | Description |
|:---|:---|
| `imageId` | The UUID of the image this vector represents. Serves as the Chroma DB document identifier. |
| `extensionId` | The identifier of the extension that computed and owns the embedding. |
| `name` | A short technical identifier distinguishing multiple embeddings from the same extension (e.g., `"clip"`, `"color"`, `"face"`). |
| `values` | The raw floating-point vector — an array of `float` values whose length is fixed per collection (e.g., 512 for CLIP ViT-B/32, 768 for SigLIP, 256 for a custom color histogram). |

### Persistence mechanics

When an extension calls `setEmbeddings()`:

1. **Collection resolution**: Chroma DB resolves or creates the collection for the given extension and embedding name ;
2. **Upsert operation**: the vector for the image is upserted — created on first insertion, replaced on subsequent calls — ensuring idempotent behavior ;
3. **Event emission**: an `ImageEventAction.EmbeddingsUpdated` event is emitted to notify real-time subscribers and connected front-end clients.

> [!NOTE]
> **Referential integrity and cascade deletion**
> : Because Chroma DB is a vector database, it does not maintain foreign key constraints. When an image is deleted from the relational SQL database, the Picteus back-end explicitly purges corresponding Chroma DB entries across all extension collections for that image. This ensures the vector database does not accumulate orphaned vectors for images that no longer exist.

---

## Anatomy of an embedding

An embedding record submitted by an extension consists of two required fields.

### 1. Embedding name: `name`

The `name` field is a short technical identifier distinguishing different embedding models or strategies within the same extension namespace:
- Must conform to technical identifier conventions (alphanumeric characters, hyphens, underscores) ;
- Maximum 64 characters ;
- Unique per extension — two embeddings from the same extension with the same name are treated as the same vector slot and upserted ;
- Examples: `"clip"`, `"color"`, `"siglip"`, `"face"`.

### 2. Embedding values: `values`

The `values` field is the raw floating-point vector produced by the encoder model:
- A non-empty array of JavaScript `number` values ;
- All embeddings with the same `name` and `extensionId` must share the same fixed vector length — the dimensionality is locked per collection upon first insertion ;
- Common dimensions: 512 (CLIP ViT-B/32), 768 (SigLIP), 1024 (larger CLIP variants), or custom dimensions for specialized encoders.

---

## Extension-driven computation

Embeddings are computed by Picteus extensions that implement a dedicated encoder model. The extension receives lifecycle events, executes the encoder, and writes the resulting vectors to Chroma DB via the SDK.

### Extension capability declaration

An extension capable of computing embeddings declares the `image.embeddings` capability in its `manifest.json`:

```json title="manifest.json"
{
  "$schema": "https://picteus.github.io/picteus/jsonschema/manifest-v3.schema.json",
  "id": "my-embedding-extension",
  "name": "Embeddings Computer",
  "instructions": [
    {
      "events": [
        "image.created",
        "image.updated",
        "image.computeEmbeddings"
      ],
      "capabilities": [
        {
          "id": "image.embeddings"
        }
      ]
    }
  ]
}
```

### Event lifecycle & SDK hooks

Picteus extensions interact with embeddings via standardized lifecycle events and strongly typed SDK methods:

1. **Triggering computation**:
   - When a new image is ingested or modified, or when the user triggers capability runs, Picteus emits the `image.computeEmbeddings` event to registered extensions ;
   - Extensions implement the corresponding hook:
     - **TypeScript SDK**: `protected async onComputeImageEmbeddings(communicator: Communicator, imageId: string): Promise<void>` ;
     - **Python SDK**: `async def on_compute_image_embeddings(self, communicator: Communicator, image_id: str) -> None` ;
2. **Downloading the image**:
   - The extension retrieves the image binary via `imageDownload()`, typically resizing it to the input resolution expected by the encoder (e.g., 224×224 pixels for CLIP, 512×512 for custom color encoders) ;
3. **Running the encoder**:
   - The extension passes the image through its encoder model to produce the floating-point vector ;
4. **Persisting the embedding**:
   - The extension calls `imageSetEmbeddings()` with an array of named `ImageEmbedding` objects ;
5. **Broadcasting updates**:
   - Setting embeddings automatically triggers an `image.embeddings.updated` event across the Picteus event bus, notifying connected front-end clients and other interested extensions via `onImageEmbeddingsUpdated()`.

---

## Similarity search integration

### How the front-end leverages embeddings

The Picteus web interface exposes embedding-powered search through the main search bar and the similarity search feature:

- **Text-to-image search**: when a user types a natural language prompt in the search bar, the front-end issues a search request with an `embeddings` query criteria; the back-end encodes the text using the configured encoder and queries Chroma DB for nearest neighbors ;
- **Image-to-image search**: when a user triggers a "search similar images" action from the contextual image menu, the stored embedding vector for that image is retrieved and used as the query vector for a Chroma DB nearest-neighbor lookup ;
- **Combined search**: embedding similarity results can be combined with tag filters and structured feature conditions using `AND` or `OR` logical operators in the query builder.

### Cosine distance threshold

Embedding queries in Picteus use **cosine distance** to measure vector similarity — two vectors with cosine distance `0` are identical, while vectors approaching `1` are semantically dissimilar. The API supports a configurable `maxDistance` threshold to control how broadly matched results should be.

---

## OpenAPI web services API

The Picteus back-end exposes dedicated REST web service endpoints for reading, writing, and deleting vector embeddings. These endpoints conform to OpenAPI 3.1 specifications.

### Endpoint reference summary

| Method | Endpoint path | Scope required | Description |
|:---|:---|:---|:---|
| `PUT` | `/image/{id}/setEmbeddings` | `image:embedding:write` | Stores or replaces embedding vectors for an image for a specific extension. |
| `GET` | `/image/{id}/getEmbeddings` | `image:read` | Returns the embedding vectors stored for an image by a specific extension. |
| `PUT` | `/image/{id}/deleteEmbeddings` | `image:embedding:write` | Deletes all embedding vectors stored for an image by a specific extension. |
| `GET` | `/repository/embeddingsNames` | `repository:read` | Returns all distinct extension embedding identifiers and names across the repository. |
| `PUT` | `/image/{id}/runCapabilities` | `image:tag:write`<br/>`image:feature:write`<br/>`image:embedding:write` | Runs all extension capabilities (including `image.embeddings`) against an image. |
| `PUT` | `/image/search/runCapabilities` | `image:tag:write`<br/>`image:feature:write`<br/>`image:embedding:write` | Runs extension capabilities against all images matching search criteria. |

---

### Detailed endpoint specifications

#### 1. Set image embeddings: `PUT /image/{id}/setEmbeddings`

Stores or replaces the embedding vectors for image `{id}` for a specific extension. Each named vector slot is upserted individually — only the named embeddings included in the payload are affected.

- **URL parameters**:
  - `id` (`string`, required): The UUID of the image.
- **Query parameters**:
  - `extensionId` (`string`, required): The identifier of the extension owning the embeddings.
- **Security**: Requires `image:embedding:write` policy scope. If using an extension-scoped API token, `policyContext.extensionId` must match the `extensionId` query parameter.
- **Request body**: `ImageEmbedding[]` (JSON array of objects, each with a `name` string and a `values` number array).
- **HTTP status**: `204 No Content` on success.
- **Emitted event**: `ImageEventAction.EmbeddingsUpdated` (`image.embeddings.updated`).

```bash title="Example request: setEmbeddings"
curl -X PUT "http://localhost:3001/image/3c8f8b89-a29d-4e2a-9418-0518dc3f6293/setEmbeddings?extensionId=com.picteus.clip" \
  -H "Authorization: Bearer <API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "clip",
      "values": [0.023, -0.117, 0.445, 0.031, -0.228]
    }
  ]'
```

#### 2. Get image embeddings: `GET /image/{id}/getEmbeddings`

Returns the embedding vectors stored for image `{id}` by a specific extension.

- **URL parameters**: `id` (`string`, required).
- **Query parameters**: `extensionId` (`string`, required).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `{ embeddings: ImageEmbedding[] }`.

```json title="Example response"
{
  "embeddings": [
    {
      "name": "clip",
      "values": [0.023, -0.117, 0.445, 0.031, -0.228]
    },
    {
      "name": "color",
      "values": [0.12, 0.08, 0.33, 0.21, 0.05, 0.41, 0.09, 0.19]
    }
  ]
}
```

#### 3. Delete image embeddings: `PUT /image/{id}/deleteEmbeddings`

Deletes all embedding vectors for image `{id}` stored by a specific extension across all Chroma DB collections owned by that extension.

- **URL parameters**: `id` (`string`, required).
- **Query parameters**: `extensionId` (`string`, required).
- **Security**: Requires `image:embedding:write`.
- **HTTP status**: `204 No Content` on success.

```bash title="Example request: deleteEmbeddings"
curl -X PUT "http://localhost:3001/image/3c8f8b89-a29d-4e2a-9418-0518dc3f6293/deleteEmbeddings?extensionId=com.picteus.clip" \
  -H "Authorization: Bearer <API_SECRET>"
```

#### 4. Get repository embedding names: `GET /repository/embeddingsNames`

Returns distinct pairs of extension identifiers and embedding names declared across all images in all repositories. This powers the embedding selector in the front-end search UI.

- **Security**: Requires `repository:read`.
- **Response**: `200 OK` with body `ExtensionImageEmbeddingName[]`.

```json title="Example response"
[
  {
    "id": "com.picteus.clip",
    "name": "clip"
  },
  {
    "id": "com.picteus.color",
    "name": "color"
  }
]
```

---

## SDK client usage

Developers building extensions can use the official pre-built SDKs to store and retrieve embedding vectors without manually invoking HTTP endpoints.

### TypeScript extension SDK

```typescript
import {
  Communicator,
  type ImageEmbedding,
  PicteusExtension
} from "@picteus/extension-sdk";

export class MyExtension extends PicteusExtension {

  // React to embedding computation requests
  protected async onComputeImageEmbeddings(communicator: Communicator, imageId: string): Promise<void> {
    // Download the image and run the encoder model
    const embeddingValues: number[] = await this.runEncoder(imageId);

    // Persist the embedding vector
    await this.getImageApi().imageSetEmbeddings({
      id: imageId,
      extensionId: this.extensionId,
      imageEmbedding: [
        {
          name: "clip",
          values: embeddingValues
        }
      ]
    });
  }

  // React to embedding updates from other extensions
  protected async onImageEmbeddingsUpdated(communicator: Communicator, imageId: string): Promise<void> {
    communicator.log(`Embeddings updated for image ${imageId}`);
  }

  private async runEncoder(_imageId: string): Promise<number[]> {
    // Encoder model invocation — returns a fixed-length float array
    return [];
  }
}
```

### Python extension SDK

```python
from picteus_extension_sdk import PicteusExtension, Communicator
from picteus_ws_client.models import ImageEmbedding

class MyPythonExtension(PicteusExtension):

    async def on_compute_image_embeddings(self, communicator: Communicator, image_id: str) -> None:
        # Run the encoder model to produce the embedding vector
        embedding_values: list[float] = await self.run_encoder(image_id)

        embedding = ImageEmbedding(
            name="clip",
            values=embedding_values
        )

        # Persist the embedding via the embedded web services client
        await self.get_image_api().image_set_embeddings(
            id=image_id,
            extension_id=self.extension_id,
            image_embedding=[embedding]
        )

    async def on_image_embeddings_updated(self, communicator: Communicator, image_id: str) -> None:
        communicator.log(f"Embeddings updated on image {image_id}")

    async def run_encoder(self, image_id: str) -> list[float]:
        # Encoder model invocation — returns a fixed-length float list
        return []
```
