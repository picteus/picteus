# Tags

In Picteus, an image **tag** is a lightweight, flat, categorical textual label attached to an image and attributed to a specific extension namespace. Tags provide a fast and flexible taxonomic layer that augments the metadata corpus of images, empowering fine-grained categorization, instant front-end filtering, dynamic smart collections, and conditional extension command gating. Categorical tags are part of the image enrichment facets triplet of Picteus — the high-level overview of which is documented in [Facets](facets.md).

---

## The role of image tags

When managing large digital media libraries or AI-generated collections, files often lack consistent, high-level categorical classifications. Intrinsic file headers (such as EXIF or IPTC) are fixed at capture time and may not reflect post-processing classifications, generative AI provenance, or domain-specific semantic concepts.

Image tags address these needs:

- **Augmenting the metadata corpus**: tags attach discrete, searchable labels to images without altering the underlying image binary or file-level headers ;
- **Enabling high-speed filtering**: because tags are simple textual strings indexed in the relational database, they allow instantaneous set-based filtering across millions of records ;
- **Powering dynamic smart collections**: user-defined collections in Picteus store search query specifications rather than static lists of image IDs; collections configured with tag filters automatically populate as new images are tagged ;
- **Gating contextual extension commands**: extensions can restrict commands to images with specific tags, ensuring that specialized workflows (such as editing a ComfyUI workflow or invoking a targeted upscaler) are only presented to users when relevant.

---

## Storage in the SQL database

Image tags are persisted in the relational SQL database (SQLite via Prisma ORM v6) within a dedicated `ImageTag` table.

### Prisma schema definition

The entity is defined in [`back-end/prisma/schema.prisma`](https://github.com/picteus/picteus/blob/main/back-end/prisma/schema.prisma):

```prisma
model ImageTag {
  id          Int    @id @default(autoincrement())
  value       String
  extensionId String
  image       Image  @relation(fields: [imageId], references: [id], onDelete: Cascade)
  imageId     String

  @@index([value])
  @@index([extensionId])
  @@index([imageId])
}
```

### Field specifications & database mechanics

| Field | Type | Description & mechanics |
|:---|:---|:---|
| `id` | `Int` | Auto-incrementing primary key for the tag record. |
| `value` | `String` | The textual tag content. Validated against technical tag format rules (alphanumeric characters, hyphens, underscores, dots, colons, semicolons, pipes, and slashes: `[a-z0-9A-Z-_.:;/]`), with a maximum length of 64 characters (`FieldLengths.technical`). |
| `extensionId` | `String` | The unique identifier of the extension that computed and owns this tag. Scopes the tag namespace to prevent conflicts between different extensions. |
| `imageId` | `String` | Foreign key referencing `Image.id` (UUID format). Cascades on deletion: deleting an image immediately removes all its attached tags. |

### High-performance database indexes

To guarantee sub-millisecond query performance across large libraries containing hundreds of thousands of tagged images, the table maintains three dedicated database indexes:

- `@@index([value])`: Accelerates global tag filtering across all images and powers the distinct tag aggregation used by the front-end ;
- `@@index([extensionId])`: Allows rapid extension-scoped operations, such as replacing or querying tags authored by a specific extension ;
- `@@index([imageId])`: Guarantees instantaneous retrieval of all tags associated with an image when loading thumbnails, detail views, or context menus.

### Guardrails & constraints

The Picteus back-end enforces strict integrity constraints upon tag persistence:
- **Maximum tags per extension**: An extension can assign at most **256 tags** to a single image (`ExtensionImageTag.PER_EXTENSION_TAGS_MAXIMUM`). Exceeding this limit causes `setTags()` or `ensureTags()` to reject the operation with a bad parameter exception ;
- **Uniqueness per call**: Duplicate tag values within a single request payload are rejected ;
- **Format validation**: Tag values must satisfy character set restrictions and cannot be empty strings.

### The empty tag tombstone (`emptyImageTag`)

When an extension executes tag extraction against an image but finds no matching categories, Picteus persists a sentinel tombstone record:
- **Sentinel value**: `ImageService.emptyImageTag` (`"__empty__"`) ;
- **Purpose**: Records that the extension has successfully evaluated the image, preventing redundant duplicate analysis during batch repository scans or capability runs ;
- **Transparent filtering**: The back-end service layer automatically excludes this internal tombstone from all public API outputs, search queries, and UI components.

---

## Extension-driven computation & qualification

Tags are designed primarily to be computed, inferred, and stored by Picteus extensions. Rather than requiring users to manually tag thousands of images, extensions automate image qualification during ingestion or post-processing pipelines.

### Extension capability declaration

An extension capable of computing tags declares the `image.tags` capability in its `manifest.json`:

```json title="manifest.json"
{
  "$schema": "https://picteus.github.io/picteus/jsonschema/manifest-v3.schema.json",
  "id": "my-tagger-extension",
  "name": "Vision AI Tagger",
  "instructions": [
    {
      "events": [
        "image.created",
        "image.updated",
        "image.computeTags"
      ],
      "capabilities": [
        {
          "id": "image.tags"
        }
      ]
    }
  ]
}
```

### Event lifecycle & SDK hooks

Picteus extensions interact with tags via standardized lifecycle events and strongly typed SDK methods:

1. **Triggering computation**:
   - When a new image is ingested or modified, or when the user triggers capability runs, Picteus emits the `image.computeTags` event to registered extensions ;
   - Extensions implement the corresponding hook:
     - **TypeScript SDK**: `protected async onComputeImageTags(communicator: Communicator, imageId: string): Promise<void>` ;
     - **Python SDK**: `async def on_compute_image_tags(self, communicator: Communicator, image_id: str) -> None` ;
2. **Computing tags**:
   - The extension inspects the image metadata (via `imageGetMetadata`), reads image features, or executes vision AI models on the binary file ;
   - The extension deduces descriptive tags (e.g., identifying software, visual motifs, camera brands, or style descriptors) ;
3. **Persisting tags**:
   - The extension calls `imageSetTags` (to replace existing tags for that extension) or `imageEnsureTags` (to add tags without overwriting existing ones) ;
4. **Broadcasting updates**:
   - Setting tags automatically triggers an `image.tags.updated` event across the Picteus event bus, notifying connected front-end clients and other interested extensions via `onImageTagsUpdated()`.

### Real-world extension examples

#### Software provenance tagging (ComfyUI & Automatic1111)
Extensions that interface with AI image generation tools inspect raw image metadata (such as PNG text chunks or EXIF user comments). When recognized, they attach a software provenance tag:
- The **Automatic1111** extension parses generation parameters and assigns the `"automatic1111"` tag ;
- The **ComfyUI** extension parses workflow JSON embeddings and assigns the `"comfyui"` tag ;
- These tags immediately identify the originating generation software in the user interface.

#### Content & classification taggers
Vision taggers (such as WD14, DeepDanbooru, or Florence-2 taggers) analyze image content and assign semantic labels (e.g., `"portrait"`, `"cyberpunk"`, `"night"`, `"monochrome"`, `"wide-angle"`).

---

## Front-end filtering & smart collections

### Front-end filtering interface

The Picteus web interface provides direct support for tag-based filtering:

- **Filter Bar**: In the image gallery view, the **Filters Bar** includes a dedicated **Tags** panel identified by the tags icon (`<IconTags />`) ;
- **Dynamic Tag List**: The panel retrieves all active tags across the media library via the `GET /repository/tags` endpoint, grouping and displaying them with their authoring extension badges ;
- **Multi-select Pills**: Users can select one or more tags. When active, tag pills appear in the filter summary bar, enabling instant tag removal or combination with other search criteria.

### Smart collections

In Picteus, collections are fundamentally **smart collections**:

- **Dynamic queries instead of static lists**: When a user creates or updates a collection, Picteus stores the active `SearchFilter` specification (including repository scope, date ranges, feature queries, and tag criteria) rather than an immutable list of image IDs ;
- **Prisma persistence**: Stored in the `Collection` table under the `filter` JSON column ;
- **Automatic population**: When a collection is saved with a tag filter (for instance, `tags: { values: ["comfyui", "portrait"] }`), any new image added to any repository that is subsequently analyzed and tagged with those keywords will automatically appear in that collection without requiring manual curation.

```json title="Example collection filter specification"
{
  "criteria": {
    "tags": {
      "values": [
        "comfyui",
        "portrait"
      ]
    }
  }
}
```

---

## Contextual extension commands (Tag-based command gating)

One of the most powerful capabilities enabled by image tags is **contextual command gating**. Extensions can expose commands that only appear and operate when an image possesses specific tags.

### Declaring tag-gated commands in the manifest

An extension defines commands in its `manifest.json` under the `commands` array. By supplying the `withTags` property inside the `on` configuration block, the extension specifies that the command requires one or more tags:

```json title="manifest.json snippet (ComfyUI extension)"
{
  "commands": [
    {
      "id": "openInComfyUi",
      "on": {
        "entity": "Image",
        "withTags": [
          "comfyui"
        ]
      },
      "specifications": [
        {
          "locale": "en",
          "label": "Edit",
          "name": "Edit ComfyUI workflow",
          "description": "Loads in the ComfyUI instance the workflow that was used to generate the image."
        }
      ]
    }
  ]
}
```

### Front-end contextual presentation

When a user opens the contextual action menu on an image (via the `ImageItemMenu` component):
1. The front-end queries the image's tags ;
2. For every registered extension command targeting an image, the menu checks whether `withTags` is specified ;
3. If `withTags` is present, the menu verifies whether the image's tags contain at least one of the required tag values:
   ```typescript
   if (withTags?.length) {
     return withTags.some((tag) =>
       imageTags.some((imageTag) => imageTag.value === tag)
     );
   }
   ```
4. If the tag is not present, the command is omitted from the menu.

This eliminates interface clutter: users never see an *"Edit ComfyUI workflow"* action on camera photographs, Midjourney renders, or images lacking ComfyUI metadata.

### Back-end security & execution validation

Tag gating is not merely a UI convenience; it is strictly enforced on the back-end:

When an API client or extension invokes `runCommand` (via `PUT /image/:id/runCommand` or `POST /extension/:id/runCommand`), [`ExtensionService.runCommand()`](https://github.com/picteus/picteus/blob/main/back-end/src/services/extensionServices.ts) fetches the target images and verifies that each image satisfies the command's `withTags` requirement:

```typescript
if (command.on.withTags !== undefined) {
  for (const entity of entities) {
    if (entity.tags.find((tag) => command.on.withTags!.indexOf(tag.value) !== -1) === undefined) {
      parametersChecker.throwBadParameter("imageIds", imageIds, "one or more image do not have the required tags");
    }
  }
}
```

If any targeted image lacks the required tag, the request is rejected with a `400 Bad Request` error.

---

## OpenAPI web services API

The endpoint reference for tags is maintained in [Images — tags](webservicesapi/images.md#tags). This section provides the tag-specific background and examples that explain how those endpoints behave.

The Picteus back-end exposes dedicated REST web service endpoints for reading, writing, and searching tags. These endpoints conform to OpenAPI 3.1 specifications.

### Endpoint reference summary

| Method | Endpoint path | Scope required | Description |
|:---|:---|:---|:---|
| `PUT` | `/image/{id}/setTags` | `image:tag:write` | Sets/replaces all tags for an image for a specific extension. |
| `PUT` | `/image/{id}/ensureTags` | `image:tag:write` | Ensures specified tags are present for an image without removing existing ones (upsert). |
| `GET` | `/image/{id}/getTags` | `image:read` | Returns the tags of an image for a specific extension. |
| `GET` | `/image/{id}/getAllTags` | `image:read` | Returns all tags of an image across all extensions. |
| `GET` | `/repository/tags` | `repository:read` | Returns all distinct tags across all images in all repositories. |
| `POST` | `/image/search/tags` | `image:read` | Retrieves tags for images matching multi-criteria search parameters. |
| `PUT` | `/image/{id}/runCapabilities` | `image:tag:write`<br/>`image:feature:write`<br/>`image:embedding:write` | Runs all extension capabilities (including `image.tags`) against an image. |
| `PUT` | `/image/search/runCapabilities` | `image:tag:write`<br/>`image:feature:write`<br/>`image:embedding:write` | Runs extension capabilities against all images matching search criteria. |

---

### Detailed endpoint specifications

#### 1. Set image tags: `PUT /image/{id}/setTags`

Replaces all tags assigned to image `{id}` by extension `{extensionId}`. Passing an empty array clears existing tags for that extension and persists the empty tombstone marker.

- **URL parameters**:
  - `id` (`string`, required): The UUID of the image.
- **Query parameters**:
  - `extensionId` (`string`, required): The identifier of the extension owning the tags.
- **Security**: Requires `image:tag:write` policy scope. If using an extension-scoped API token, `policyContext.extensionId` must match the `extensionId` query parameter.
- **Request body**: `string[]` (JSON array of strings, max 256 items).
- **HTTP status**: `204 No Content` on success.
- **Emitted event**: `ImageEventAction.TagsUpdated` (`image.tags.updated`).

```bash title="Example request: setTags"
curl -X PUT "http://localhost:3001/image/3c8f8b89-a29d-4e2a-9418-0518dc3f6293/setTags?extensionId=com.picteus.tagger" \
  -H "Authorization: Bearer <API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '["portrait", "cyberpunk", "neon"]'
```

#### 2. Ensure image tags: `PUT /image/{id}/ensureTags`

Adds one or more tags to an image for an extension without deleting existing tags already present for that extension. It acts as an **upsert** mechanism: specified tags are added if missing and preserved if already present. If the empty tombstone was previously stored, it is removed.

- **URL parameters**:
  - `id` (`string`, required): The UUID of the image.
- **Query parameters**:
  - `extensionId` (`string`, required): The extension identifier.
- **Security**: Requires `image:tag:write`.
- **Request body**: `string[]` (JSON array of strings, 1 to 256 items).
- **HTTP status**: `204 No Content` on success.
- **Emitted event**: `ImageEventAction.TagsUpdated` (`image.tags.updated`).

```bash title="Example request: ensureTags"
curl -X PUT "http://localhost:3001/image/3c8f8b89-a29d-4e2a-9418-0518dc3f6293/ensureTags?extensionId=com.picteus.tagger" \
  -H "Authorization: Bearer <API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '["featured"]'
```

#### 3. Get image tags for extension: `GET /image/{id}/getTags`

Returns an array of strings representing the tags assigned to image `{id}` by a specific extension.

- **URL parameters**: `id` (`string`, required).
- **Query parameters**: `extensionId` (`string`, required).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `string[]`.

```json title="Example response"
[
  "portrait",
  "cyberpunk",
  "neon"
]
```

#### 4. Get all image tags: `GET /image/{id}/getAllTags`

Returns all tags associated with image `{id}` across all extensions.

- **URL parameters**: `id` (`string`, required).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `ExtensionImageTag[]`.

```json title="Example response"
[
  {
    "id": "com.picteus.tagger",
    "value": "portrait"
  },
  {
    "id": "com.picteus.tagger",
    "value": "cyberpunk"
  },
  {
    "id": "comfyui",
    "value": "comfyui"
  }
]
```

#### 5. Get all repository tags: `GET /repository/tags`

Returns distinct pairs of extension identifiers and tag values across all images in all repositories. This powers the tag filter dropdown and multi-select filters in the web UI.

- **Security**: Requires `repository:read`.
- **Response**: `200 OK` with body `ExtensionImageTag[]`.

```json title="Example response"
[
  {
    "id": "automatic1111",
    "value": "automatic1111"
  },
  {
    "id": "com.picteus.tagger",
    "value": "cyberpunk"
  },
  {
    "id": "com.picteus.tagger",
    "value": "landscape"
  },
  {
    "id": "com.picteus.tagger",
    "value": "portrait"
  },
  {
    "id": "comfyui",
    "value": "comfyui"
  }
]
```

#### 6. Search image tags: `POST /image/search/tags`

Retrieves the tags of images matching a given `SearchParameters` payload, optionally restricted to specific extension IDs.

- **Query parameters**:
  - `extensionIds` (`string[]`, optional): Filter results to tags authored by the specified extension identifiers.
- **Request body**: `SearchParameters` (JSON object containing `filter`, `range`, etc.).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `SearchTagsResult` (`{ items: ExtensionImageTagsAttribute[], totalCount: number }`).

```json title="Example request payload"
{
  "filter": {
    "criteria": {
      "tags": {
        "values": ["comfyui"]
      }
    }
  }
}
```

```json title="Example response"
{
  "totalCount": 1,
  "items": [
    {
      "id": "3c8f8b89-a29d-4e2a-9418-0518dc3f6293",
      "tags": [
        {
          "id": "comfyui",
          "value": "comfyui"
        }
      ]
    }
  ]
}
```

---

## SDK client usage

Developers building extensions can use the official pre-built SDKs to manipulate tags without manually invoking HTTP endpoints.

### TypeScript extension SDK

```typescript
import {
  Communicator,
  PicteusExtension
} from "@picteus/extension-sdk";

export class MyExtension extends PicteusExtension {

  // React to tag calculation requests
  protected async onComputeImageTags(communicator: Communicator, imageId: string): Promise<void> {
    const tags: string[] = ["landscape", "sunset"];

    // Persist tags for this image
    await this.getImageApi().imageSetTags({
      id: imageId,
      extensionId: this.extensionId,
      requestBody: tags
    });
  }

  // React to tag updates performed by other extensions or users
  protected async onImageTagsUpdated(communicator: Communicator, imageId: string): Promise<void> {
    communicator.log(`Tags updated for image ${imageId}`);
  }
}
```

### Python extension SDK

```python
from picteus_extension_sdk import PicteusExtension, Communicator

class MyPythonExtension(PicteusExtension):

    async def on_compute_image_tags(self, communicator: Communicator, image_id: str) -> None:
        tags = ["nature", "wildlife"]

        # Persist tags via the embedded web services client
        await self.get_image_api().image_set_tags(
            id=image_id,
            extension_id=self.extension_id,
            request_body=tags
        )

    async def on_image_tags_updated(self, communicator: Communicator, image_id: str) -> None:
        communicator.log(f"Tags updated on image {image_id}")
```
