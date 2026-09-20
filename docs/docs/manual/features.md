# Features

In Picteus, an image **feature** is a structured, typed, and attributed metadata entity attached to an image, generated programmatically by extensions or automated analysis pipelines. Image features dramatically expand the descriptive knowledge attached to an image beyond conventional file-level metadata, enabling fine-grained search, structured generation provenance, and rich user interface visualizations. Structured features are part of the image enrichment facets triplet of Picteus — the high-level overview of which is documented in [Facets](facets.md).

---

## The role of image features

Digital images stored in a media library typically contain static file-level metadata — such as camera exposure settings, color profiles, or GPS coordinates. While valuable, this intrinsic metadata is static and does not capture higher-level semantic understanding, AI-generated scene descriptions, object-level detections, or generative AI parameters.

Image features bridge this gap:

- **augmenting the metadata corpus**: features attach dynamic, post-processing information to an image, transforming a passive media file into an enriched visual knowledge asset ;
- **enabling structured search & filtering**: because features possess well-defined types, formats, and optional technical names, they can be indexed and queried using relational and arithmetic operators — such as range comparisons, equality checks, and substring matching ;
- **preserving AI generative provenance**: features capture complex generation recipes — including model checkpoints, guidance scales, sampling steps, seeds, and prompts — used by generative tools like Stable Diffusion, ComfyUI, Midjourney, or Flux ;
- **powering rich UI presentations**: features can supply formatted Markdown descriptions, raw structured JSON trees, HTML content, or even declarative dynamic UI components directly rendered in the Picteus web interface.

---

## Storage in the SQL database

Image features are stored in the relational SQL database (SQLite via Prisma ORM v6.19) within a dedicated `ImageFeature` table.

### Prisma schema definition

The entity is defined in [`back-end/prisma/schema.prisma`](https://github.com/picteus/picteus/blob/main/back-end/prisma/schema.prisma):

```prisma
model ImageFeature {
  id           Int     @id @default(autoincrement())
  type         String
  format       String
  extensionId  String
  name         String?
  stringValue  String?
  numericValue Float?
  image        Image   @relation(fields: [imageId], references: [id], onDelete: Cascade)
  imageId      String

  @@index([type])
  @@index([format])
  @@index([extensionId])
  @@index([name])
  @@index([imageId])
}
```

### Field roles & persistence mechanics

| Field | Type | Description & persistence mechanics |
|:---|:---|:---|
| `id` | `Int` | Auto-incrementing primary key for the feature record. |
| `imageId` | `String` | Foreign key referencing the parent `Image.id`. Cascades on deletion: deleting an image immediately purges all its attached features. |
| `extensionId` | `String` | Identifier of the extension that authored and owns the feature record. |
| `type` | `String` | The semantic attribute category (`ImageFeatureType`), such as `caption`, `recipe`, or `annotation`. |
| `format` | `String` | The data representation format (`ImageFeatureFormat`), such as `string`, `json`, `markdown`, or `float`. |
| `name` | `String?` | Optional technical qualifier (up to 64 characters) distinguishing multiple features sharing the same type and format. |
| `stringValue` | `String?` | Stores textual payloads, including plain text, serialized JSON, YAML, XML, Markdown, HTML, dynamic UI schemas, or binary attachment URIs. |
| `numericValue` | `Float?` | Stores numeric payloads (integers and floating-point values), as well as boolean flags (where `false` is stored as `0` and `true` is stored as `1`). |

### High-performance database indexes
Because image libraries often contain hundreds of thousands or millions of features, the table includes five dedicated database indexes:
- `@@index([type])`: accelerates filtering images by semantic feature types ;
- `@@index([format])`: allows rapid lookups by format ;
- `@@index([extensionId])`: enables fast extension-scoped queries and bulk replacements ;
- `@@index([name])`: accelerates filtering on specific technical property names ;
- `@@index([imageId])`: ensures instantaneous retrieval of all features when loading an image detail view.

### Atomic updates & lifecycle management
When an extension updates features for an image by calling the `setFeatures()` service method:
1. **Attachment cleanup**: unreferenced binary attachments previously owned by that extension for that image are removed from `ImageAttachment` ;
2. **Feature replacement**: existing features authored by that extension for that image are deleted ;
3. **Bulk creation**: new feature records are inserted in bulk ;
4. **Transactional atomicity**: the deletion of old attachments, deletion of old features, and creation of new features are executed within a single atomic database transaction (`prisma.$transaction`) ;
5. **Event emission**: an `ImageEventAction.FeaturesUpdated` event is emitted across the internal event bus to notify real-time subscribers and connected clients.

> [!NOTE]
> **The empty feature tombstone**
> : When an extension processes an image and legitimately finds zero features to extract, Picteus persists a sentinel record (`type: "other"`, `format: "string"`, `stringValue: ImageService.emptyImageFeatureValue`). This marker records that the extension has already processed the image, preventing redundant duplicate analysis during batch indexing. The back-end automatically filters out this internal marker when serving queries or API responses.

---

## Anatomy of an image feature

Every feature record comprises four core attributes:

### 1. Semantic attribute: `type`
The `type` attribute (`ImageFeatureType`) declares the semantic intent and purpose of the feature. Picteus recognizes nine distinct semantic types:

- **`caption` (`ImageFeatureType.CAPTION`)**: a concise, one-sentence textual synopsis or alt-text describing the image content (e.g., generated by vision-language models like BLIP, Florence-2, or Moondream) ;
- **`description` (`ImageFeatureType.DESCRIPTION`)**: a comprehensive, narrative textual overview describing scene composition, subjects, background, style, and lighting in detail ;
- **`comment` (`ImageFeatureType.COMMENT`)**: remarks, commentary, critiques, or analytical evaluation notes produced by human reviewers or AI assistants ;
- **`annotation` (`ImageFeatureType.ANNOTATION`)**: localized or entity-level analytical detections — such as bounding boxes, detected OCR text, facial landmarks, or segmentation labels ;
- **`metadata` (`ImageFeatureType.METADATA`)**: arbitrary structured technical attributes or execution telemetry — such as sampling parameters, inference hardware, execution runtimes, or pipeline identifiers ;
- **`recipe` (`ImageFeatureType.RECIPE`)**: the exact generation recipe and configuration used to synthesize the image with generative AI tools (e.g., Stable Diffusion, ComfyUI, Midjourney) ;
- **`identity` (`ImageFeatureType.IDENTITY`)**: identification of recognized individuals, fictional characters, or distinct entities appearing in the image ;
- **`physics` (`ImageFeatureType.PHYSICS`)**: physical, optical, or lighting attributes — such as dominant color values, colorimetry, illuminant estimations, or geometric scene properties ;
- **`other` (`ImageFeatureType.OTHER`)**: general-purpose or experimental data that does not fall into one of the specialized semantic categories above.

### 2. Data format: `format`
The `format` attribute (`ImageFeatureFormat`) defines the syntax, data type, and parsing rules applicable to the feature value. Picteus supports eleven distinct formats:

- **`string`**: plain unstructured textual data ;
- **`integer`**: discrete integer values (e.g., generation step counts, face counts, resolution dimensions) ;
- **`float`**: double-precision floating-point numbers (e.g., aesthetic scores, confidence ratings, classifier probabilities, guidance scales) ;
- **`boolean`**: boolean flags (`true` / `false`), stored as `1` or `0` in the database ;
- **`json`**: structured JSON payloads, validated upon insertion ;
- **`yaml`**: human-readable YAML documents, validated for syntax and key uniqueness ;
- **`xml`**: structured XML markup, checked for valid syntax ;
- **`markdown`**: rich Markdown text supporting headings, lists, bold text, and tables, rendered directly in the front-end ;
- **`html`**: safe HTML content for rich text display ;
- **`binary`**: points to an auxiliary binary file stored in the `ImageAttachment` table via its URI (e.g., depth maps, pose skeletons, canny edge maps, segmentation masks) ;
- **`ui`**: dynamic declarative user interface specifications adhering to the Picteus `UiContainer` schema, allowing extensions to render custom interactive cards or widgets in the image view.

### 3. Technical qualifier: `name`
The optional `name` attribute allows extensions to qualify and distinguish multiple features sharing the same semantic type and format.
- Stored as a string up to 64 characters (`FieldLengths.technical`) ;
- Must adhere to technical identifier conventions (alphanumeric characters, hyphens, underscores) ;
- Example: an AI generation extension extracting metadata can assign separate features:
  - `type: "metadata"`, `format: "integer"`, `name: "steps"`, `value: 30` ;
  - `type: "metadata"`, `format: "float"`, `name: "cfg_scale"`, `value: 7.5` ;
  - `type: "metadata"`, `format: "string"`, `name: "sampler"`, `value: "DPM++ 2M Karras"` ;
  - `type: "metadata"`, `format: "string"`, `name: "model"`, `value: "SDXL 1.0"`.

### 4. Extension ownership: `extensionId`
Features never exist in an unowned or detached state; they are always bound to the `extensionId` of the extension that authored them:
- **Namespace isolation**: two different extensions can attach a `caption` feature without collision ;
- **Provenance tracking**: users can immediately identify which AI model or tool produced each insight ;
- **Independent lifecycles**: when an extension re-indexes an image, only the features belonging to that specific extension are replaced.

---

## Semantic validation: authorized & unauthorized (type, format) pairs

To maintain high data integrity and ensure that UI renderers and search engines receive predictable data, the Picteus back-end enforces strict compatibility rules between feature **types** and feature **formats** inside [`ImageService.setFeatures()`](https://github.com/picteus/picteus/blob/main/back-end/src/services/imageServices.ts).

### Compatibility matrix

| Semantic Type (`type`) | Authorized Formats | Unauthorized Formats | Enforcement & Rationale |
|:---|:---|:---|:---|
| **`caption`** | `string`, `markdown`, `html` | `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `binary`, `ui` | **Human-readable text/markup only**. Captions represent concise textual descriptions, supporting plain text as well as rich Markdown or HTML styling. |
| **`description`** | `string`, `markdown`, `html` | `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `binary`, `ui` | **Human-readable text/markup only**. Descriptions represent narrative text, allowing rich Markdown or HTML styling, but disallowing raw numbers, booleans, data serialization formats, or binary blobs. |
| **`comment`** | `string`, `markdown`, `html` | `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `binary`, `ui` | **Human-readable text/markup only**. Shares identical constraints with `description` — must be text, Markdown, or HTML. |
| **`recipe`** | `json`, `ui` | `string`, `integer`, `float`, `boolean`, `yaml`, `xml`, `markdown`, `html`, `binary` | **Structured JSON or dynamic UI only**. Generative recipes represent machine-executable workflows or declarative visual representations. Must be JSON complying with the `GenerationRecipe` schema or dynamic `ui` container markup. |
| **`annotation`** | `string`, `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `markdown`, `html`, `binary`, `ui` | *(None)* | **Unrestricted format support**. Annotations can range from numeric coordinates and counts, to complex JSON bounding boxes, binary mask attachments, or dynamic UI overlays. |
| **`metadata`** | `string`, `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `markdown`, `html`, `binary`, `ui` | *(None)* | **Unrestricted format support**. Allows scalar technical parameters (`integer`, `float`, `string`, `boolean`) as well as complex configuration dumps (`json`, `xml`, `yaml`). |
| **`identity`** | `string`, `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `markdown`, `html`, `binary`, `ui` | *(None)* | **Unrestricted format support**. Accommodates entity names (`string`), entity IDs (`integer`), facial landmark trees (`json`), or cropped facial previews (`binary`). |
| **`physics`** | `string`, `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `markdown`, `html`, `binary`, `ui` | *(None)* | **Unrestricted format support**. Accommodates color codes and tags (`string`), numeric measurements (`float`, `integer`), color distributions (`json`), or dynamic UI color palettes (`ui`). |
| **`other`** | `string`, `integer`, `float`, `boolean`, `json`, `yaml`, `xml`, `markdown`, `html`, `binary`, `ui` | *(None)* | **Unrestricted format support**. Fallback bucket allowing any valid format for experimental or bespoke extension functionality. |

When an incoming feature violates the authorized pairings, `setFeatures()` immediately rejects the entire request with a bad parameter exception.

---

## Value validation rules by format

Beyond validating the `(type, format)` pair, `setFeatures()` subjects each feature's `value` to rigorous format-specific validation:

### 1. `integer`
- Must be a JavaScript number (`typeof value === "number"`) ;
- Must be a discrete whole number (`Number.isInteger(value) === true`) ;
- Persisted in `numericValue`.

### 2. `float`
- Must be a JavaScript number (`typeof value === "number"`) ;
- Can be any real floating-point value ;
- Persisted in `numericValue`.

### 3. `boolean`
- Must be a JavaScript boolean (`typeof value === "boolean"`) ;
- Persisted in `numericValue` as `1` for `true` and `0` for `false`.

### 4. `string`
- Must be a JavaScript string (`typeof value === "string"`) ;
- Length must not exceed the maximum allowed value field length (`FieldLengths.value`) ;
- Persisted in `stringValue`.

### 5. `json`
- Value must be a valid JSON-encoded string ;
- Must successfully parse via `JSON.parse()` ;
- **Recipe schema verification**: when `type === "recipe"`, the parsed JSON object is additionally validated against the `GenerationRecipe` class schema (verifying `schemaVersion`, `modelTags`, `aspectRatio`, and the `prompt` discriminated union). If validation fails, the parameter checker throws an error.

### 6. `yaml`
- Value must be a valid YAML-encoded string ;
- Parsed with strict uniqueness checks (`YAML.parse(string, { uniqueKeys: true, strict: true })`) to prevent duplicate keys.

### 7. `xml`
- Value must be a valid XML-encoded string ;
- Validated using `SyntaxValidator.validate(string)` to prevent malformed tags.

### 8. `markdown` & `html`
- Must be valid strings ;
- Rendered in the front-end with sanitization to prevent cross-site scripting (XSS).

### 9. `binary`
- Must be a valid URI string referencing an existing record in `ImageAttachment` ;
- The back-end verifies via `ImageAttachmentService.checkAttachmentUri()` that the referenced attachment exists, belongs to the exact image (`imageId === id`), and was authored by the same extension (`extensionId === extensionId`) ;
- Referenced attachments are protected from garbage collection during the atomic replacement.

### 10. `ui`
- Value must be a valid JSON-encoded string representing a declarative dynamic UI container ;
- Validated using `UiContainer.parse(json, true)` against the dynamic UI schema.

---

## Querying and searching image features

Image features are fully searchable through the Picteus Web Services API and the graphical front-end query builder.

### The Features Query Builder
In the Picteus user interface, the **Features Query Builder** allows users to construct complex multi-condition queries:
- **Targeting by attribute**: queries can target an entire semantic type (e.g., all `caption` features), a specific format, or a precise extension and technical name (e.g., extension `com.picteus.sd` with name `cfg_scale`) ;
- **Supported operators**:
  - Equality and difference: `=`, `<>` ;
  - String matching: `contains` ;
  - Quantitative comparisons: `>`, `>=`, `<`, `<=` (applied against `numericValue`).
- **Logical grouping**: multiple feature conditions can be combined using `AND` or `OR` operators.

### API search payload example
The following web service payload demonstrates a search request filtering images based on multiple feature conditions:

```json
{
  "features": {
    "operator": "and",
    "conditions": [
      {
        "type": "caption",
        "format": "string",
        "operator": "contains",
        "value": "sunset"
      },
      {
        "type": "metadata",
        "format": "float",
        "name": "cfg_scale",
        "operator": "greaterThanOrEqual",
        "value": 7.0
      }
    ]
  }
}
```

---

## Practical feature examples

### Caption feature
```json
{
  "type": "caption",
  "format": "string",
  "name": "blip2_summary",
  "value": "A vintage convertible driving down a coastal road during golden hour."
}
```

### Generation recipe feature
```json
{
  "type": "recipe",
  "format": "json",
  "name": "flux_workflow",
  "value": "{\"schemaVersion\":2,\"software\":\"ComfyUI\",\"modelTags\":[\"flux-1-dev\",\"fp8\"],\"prompt\":{\"kind\":\"textual\",\"text\":\"A detailed photographic portrait of an elderly watchmaker in his workshop surrounded by antique gears and clocks\"},\"aspectRatio\":1.333}"
}
```

### Physics feature
```json
{
  "type": "physics",
  "format": "string",
  "name": "dominant_color",
  "value": "#3A75C4"
}
```

### Quantitative numeric metadata features
```json
[
  {
    "type": "metadata",
    "format": "integer",
    "name": "steps",
    "value": 28
  },
  {
    "type": "metadata",
    "format": "float",
    "name": "guidance_scale",
    "value": 3.5
  },
  {
    "type": "metadata",
    "format": "boolean",
    "name": "hires_fix",
    "value": true
  }
]
```

### Rich Markdown description feature
```json
{
  "type": "description",
  "format": "markdown",
  "name": "scene_analysis",
  "value": "### Scene Composition\n\n- **Foreground**: A rustic wooden workbench with brass gears, tweezers, and miniature loupes.\n- **Subject**: An artisan with silver hair wearing round magnifying spectacles.\n- **Lighting**: Soft warm directional light coming from a high arched window on the left."
}
```

### Binary attachment feature (segmentation mask)
```json
{
  "type": "annotation",
  "format": "binary",
  "name": "depth_map",
  "value": "picteus://attachments/img_98765/ext_depth/depth_map.png"
}
```

---

## OpenAPI web services API

The Picteus back-end exposes dedicated REST web service endpoints for reading, writing, and searching structured image features. These endpoints conform to OpenAPI 3.1 specifications.

### Endpoint reference summary

| Method | Endpoint path | Scope required | Description |
|:---|:---|:---|:---|
| `PUT` | `/image/{id}/setFeatures` | `image:feature:write` | Sets/replaces all features for an image for a specific extension. |
| `PUT` | `/image/{id}/ensureFeatures` | `image:feature:write` | Ensures specified features are present for an image without removing existing ones (upsert). |
| `GET` | `/image/{id}/getFeatures` | `image:read` | Returns the features of an image for a specific extension. |
| `GET` | `/image/{id}/getAllFeatures` | `image:read` | Returns all features of an image across all extensions. |
| `GET` | `/image/{id}/getAllRecipes` | `image:read` | Returns all parsed generation recipes for an image. |
| `GET` | `/repository/featureNames` | `repository:read` | Returns distinct feature names and types declared across all extensions. |
| `POST` | `/image/search/features` | `image:read` | Retrieves features for images matching multi-criteria search parameters. |
| `PUT` | `/image/{id}/runCapabilities` | `image:tag:write`<br/>`image:feature:write`<br/>`image:embedding:write` | Runs all extension capabilities (including `image.features`) against an image. |
| `PUT` | `/image/search/runCapabilities` | `image:tag:write`<br/>`image:feature:write`<br/>`image:embedding:write` | Runs extension capabilities against all images matching search criteria. |

---

### Detailed endpoint specifications

#### 1. Set image features: `PUT /image/{id}/setFeatures`

Replaces all features assigned to image `{id}` by extension `{extensionId}`. Passing an empty array clears existing features for that extension and persists the empty tombstone marker (`ImageService.emptyImageFeatureValue`).

- **URL parameters**:
  - `id` (`string`, required): The UUID of the image.
- **Query parameters**:
  - `extensionId` (`string`, required): The identifier of the extension owning the features.
- **Security**: Requires `image:feature:write` policy scope. If using an extension-scoped API token, `policyContext.extensionId` must match the `extensionId` query parameter.
- **Request body**: `ImageFeature[]` (JSON array of `ImageFeature` objects, up to 256 items).
- **HTTP status**: `204 No Content` on success.
- **Emitted event**: `ImageEventAction.FeaturesUpdated` (`image.features.updated`).

```bash title="Example request: setFeatures"
curl -X PUT "http://localhost:3001/image/3c8f8b89-a29d-4e2a-9418-0518dc3f6293/setFeatures?extensionId=com.picteus.sd" \
  -H "Authorization: Bearer <API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "type": "caption",
      "format": "string",
      "name": "blip_caption",
      "value": "An oil painting of a lighthouse in a storm"
    },
    {
      "type": "metadata",
      "format": "float",
      "name": "guidance_scale",
      "value": 7.5
    }
  ]'
```

#### 2. Ensure image features: `PUT /image/{id}/ensureFeatures`

Ensures that specified features are set on image `{id}` for extension `{extensionId}`. It acts as an **upsert** mechanism: it adds new features and updates the values of matching existing features (matched by `type`, `format`, and `name`), without deleting other existing features authored by that extension.

- **URL parameters**:
  - `id` (`string`, required): The UUID of the image.
- **Query parameters**:
  - `extensionId` (`string`, required): The identifier of the extension owning the features.
- **Security**: Requires `image:feature:write` policy scope.
- **Request body**: `ImageFeature[]` (JSON array of `ImageFeature` objects, 1 to 256 items).
- **HTTP status**: `204 No Content` on success.
- **Emitted event**: `ImageEventAction.FeaturesUpdated` (`image.features.updated`).

```bash title="Example request: ensureFeatures"
curl -X PUT "http://localhost:3001/image/3c8f8b89-a29d-4e2a-9418-0518dc3f6293/ensureFeatures?extensionId=com.picteus.sd" \
  -H "Authorization: Bearer <API_SECRET>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "type": "physics",
      "format": "string",
      "name": "dominant_color",
      "value": "#3A75C4"
    }
  ]'
```

#### 3. Get image features for extension: `GET /image/{id}/getFeatures`

Returns an array of features assigned to image `{id}` by a specific extension.

- **URL parameters**: `id` (`string`, required).
- **Query parameters**: `extensionId` (`string`, required).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `ImageFeature[]`.

```json title="Example response"
[
  {
    "type": "caption",
    "format": "string",
    "name": "blip_caption",
    "value": "An oil painting of a lighthouse in a storm"
  },
  {
    "type": "metadata",
    "format": "float",
    "name": "guidance_scale",
    "value": 7.5
  }
]
```

#### 4. Get all image features: `GET /image/{id}/getAllFeatures`

Returns all features associated with image `{id}` across all extensions, enriched with the owning extension's identifier in `id`.

- **URL parameters**: `id` (`string`, required).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `ExtensionImageFeature[]`.

```json title="Example response"
[
  {
    "id": "com.picteus.sd",
    "type": "caption",
    "format": "string",
    "name": "blip_caption",
    "value": "An oil painting of a lighthouse in a storm"
  },
  {
    "id": "com.picteus.sd",
    "type": "metadata",
    "format": "float",
    "name": "guidance_scale",
    "value": 7.5
  },
  {
    "id": "com.picteus.faces",
    "type": "metadata",
    "format": "integer",
    "name": "face_count",
    "value": 0
  }
]
```

#### 5. Get all image recipes: `GET /image/{id}/getAllRecipes`

Returns all parsed generative recipes associated with image `{id}` across all extensions.

- **URL parameters**: `id` (`string`, required).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `GenerationRecipe[]`.

```json title="Example response"
[
  {
    "schemaVersion": 2,
    "software": "Automatic1111",
    "modelTags": ["sd_xl_base_1.0"],
    "prompt": {
      "kind": "textual",
      "text": "An oil painting of a lighthouse in a storm"
    },
    "aspectRatio": 1.5
  }
]
```

#### 6. Get all repository feature names: `GET /repository/featureNames`

Returns distinct pairs of extension identifiers, feature names, types, and formats declared across all images in all repositories.

- **Security**: Requires `repository:read`.
- **Response**: `200 OK` with body `ExtensionImageFeatureName[]`.

```json title="Example response"
[
  {
    "id": "com.picteus.sd",
    "type": "metadata",
    "format": "float",
    "name": "guidance_scale"
  },
  {
    "id": "com.picteus.sd",
    "type": "metadata",
    "format": "integer",
    "name": "steps"
  },
  {
    "id": "com.picteus.faces",
    "type": "metadata",
    "format": "integer",
    "name": "face_count"
  }
]
```

#### 6. Search image features: `POST /image/search/features`

Retrieves the structured features of images matching a given `SearchParameters` payload, optionally restricted to specific extension IDs.

- **Query parameters**:
  - `extensionIds` (`string[]`, optional): Filter results to features authored by the specified extension identifiers.
- **Request body**: `SearchParameters` (JSON object containing `filter`, `range`, etc.).
- **Security**: Requires `image:read`.
- **Response**: `200 OK` with body `SearchFeaturesResult` (`{ items: ExtensionImageFeaturesAttribute[], totalCount: number }`).

```json title="Example request payload"
{
  "filter": {
    "criteria": {
      "features": {
        "operator": "and",
        "conditions": [
          {
            "type": "metadata",
            "format": "float",
            "name": "guidance_scale",
            "operator": "greaterThanOrEqual",
            "value": 7.0
          }
        ]
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
      "features": [
        {
          "id": "com.picteus.sd",
          "type": "metadata",
          "format": "float",
          "name": "guidance_scale",
          "value": 7.5
        }
      ]
    }
  ]
}
```

---

## SDK client usage

Developers building extensions can use the official pre-built SDKs to manipulate structured features without manually invoking HTTP endpoints.

### TypeScript extension SDK

```typescript
import {
  Communicator,
  ImageFeatureFormat,
  ImageFeatureType,
  PicteusExtension
} from "@picteus/extension-sdk";

export class MyExtension extends PicteusExtension {

  // React to feature calculation requests
  protected async onComputeImageFeatures(communicator: Communicator, imageId: string): Promise<void> {
    // Persist structured features for this image
    await this.getImageApi().imageSetFeatures({
      id: imageId,
      extensionId: this.extensionId,
      imageFeature: [
        {
          type: ImageFeatureType.Caption,
          format: ImageFeatureFormat.String,
          name: "scene_caption",
          value: "A quiet mountain lake surrounded by pine trees"
        },
        {
          type: ImageFeatureType.Metadata,
          format: ImageFeatureFormat.Integer,
          name: "tree_count",
          value: 42
        }
      ]
    });
  }

  // React to feature updates performed by other extensions or users
  protected async onImageFeaturesUpdated(communicator: Communicator, imageId: string): Promise<void> {
    communicator.log(`Features updated for image ${imageId}`);
  }
}
```

### Python extension SDK

```python
from picteus_extension_sdk import PicteusExtension, Communicator
from picteus_ws_client.models import ImageFeature, ImageFeatureType, ImageFeatureFormat

class MyPythonExtension(PicteusExtension):

    async def on_compute_image_features(self, communicator: Communicator, image_id: str) -> None:
        features = [
            ImageFeature(
                type=ImageFeatureType.CAPTION,
                format=ImageFeatureFormat.STRING,
                name="scene_caption",
                value="A quiet mountain lake surrounded by pine trees"
            ),
            ImageFeature(
                type=ImageFeatureType.METADATA,
                format=ImageFeatureFormat.INTEGER,
                name="tree_count",
                value=42
            )
        ]

        # Persist features via the embedded web services client
        await self.get_image_api().image_set_features(
            id=image_id,
            extension_id=self.extension_id,
            image_feature=features
        )

    async def on_image_features_updated(self, communicator: Communicator, image_id: str) -> None:
        communicator.log(f"Features updated on image {image_id}")
```
