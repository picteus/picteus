# Facets

In Picteus, **facets** represent the distinct dimensions of data and metadata that qualify an image beyond its raw binary file. Picteus distinguishes two categories of image data: **built-in metadata** — immutable intrinsic properties (EXIF, IPTC, XMP, ICC) extracted directly from the image file upon ingestion, which no extension can modify — and the **image enrichment facets triplet** — categorical tags, structured features, and vector embeddings — which are entirely computed and written by extensions or automated pipelines. Together, these dimensions enable multi-layered search, automated classification, dynamic UI presentations, and targeted extension workflows.

---

## The image enrichment facets triplet

The enrichment triplet groups the three extension-driven facets that Picteus uses to dynamically augment an image's knowledge corpus. Unlike built-in metadata — which is extracted automatically from the image file upon ingestion and cannot be modified — these three facets are entirely computed and persisted by extensions or automated pipelines. Each operates at a different level of abstraction, fulfills a distinct query need, and is stored in the database engine best suited to its access patterns:

```
+-----------------------------------------------------------------------------------+
|                                   Picteus Image                                   |
+-----------------------------------------------------------------------------------+
        |                          |                        |               |
        | (extracted,              |                        |               |
        |  read-only)              +---[ Enrichment triplet ]---------------+
        v                          v                        v               v
+------------------+     +------------------+     +------------------+  +-----------+
| Built-in         |     | Categorical      |     | Structured       |  | Vector    |
| Metadata         |     | Tags             |     | Features         |  | Embeddings|
| (ImageMetadata)  |     | (ImageTag)       |     | (ImageFeature)   |  | (ChromaDB)|
+------------------+     +------------------+     +------------------+  +-----------+
| - EXIF           |     | - Flat keywords  |     | - Typed & named  |  | - CLIP    |
| - IPTC           |     | - Extension-bound|     | - Numbers & text |  | - SigLIP  |
| - XMP            |     | - Fast taxonomy  |     | - JSON recipes   |  | - FaceNet |
| - ICC profiles   |     | - Multi-select   |     | - Dynamic UIs    |  | - Cosine  |
| - Photoshop TIFF |     |   pill filters   |     | - Binary links   |  |   distance|
+------------------+     +------------------+     +------------------+  +-----------+
        |                          |                        |               |
        +--------------------------+------------------------+               |
                                   |                                        |
                                   v                                        v
                    +------------------------------+         +----------------------+
                    | Relational SQL Database      |         | Vector Database      |
                    | (SQLite via Prisma ORM)      |         | (Chroma DB)          |
                    +------------------------------+         +----------------------+
```

---

## Built-in image metadata

Built-in metadata represents the intrinsic properties extracted directly from the image file streams and header blocks upon ingestion or repository synchronization:

- **Origin & extraction**: Read automatically during file scanning by back-end metadata extractors ;
- **Storage**: Persisted in the `ImageMetadata` table within the relational SQL database ;
- **Content**:
  - **EXIF (Exchangeable Image File Format)**: Camera exposure settings, shutter speed, aperture, ISO, focal length, lens model, orientation, and capture timestamp ;
  - **IPTC (International Press Telecommunications Council)**: Editorial attributes, copyright notices, author credits, creation city, and captions ;
  - **XMP (Extensible Metadata Platform)**: XML-based extensible metadata packets, rating values, editing software history, and camera raw processing profiles ;
  - **ICC color profiles**: Color space specifications (such as sRGB, Adobe RGB, or Display P3) and color profile calibration records ;
  - **Photoshop TIFF tags**: Image resource blocks, print management tags, and layer metadata embedded by authoring software ;
- **Nature & immutability**: Unlike other facets that extensions can dynamically compute, replace, or overwrite, built-in metadata is **immutable**. It faithfully reflects the historical, physical capture conditions and embedded attributes recorded by the camera, scanner, or authoring graphics software.

---

## Categorical tags

Categorical tags are flat, lightweight textual keywords attached to an image and attributed to a specific extension namespace:

- **Origin**: Computed programmatically by classification extensions — such as automated vision taggers, subject classifiers, or provenance detectors — or assigned via the API ;
- **Storage**: Persisted in the dedicated `ImageTag` table within the relational SQL database ;
- **Content**: Discrete alphanumeric identifiers (such as `"portrait"`, `"cyberpunk"`, `"landscape"`, `"comfyui"`, or `"automatic1111"`) ;
- **Role & capabilities**:
  - **Fast taxonomic filtering**: Tag pills in the front-end allow rapid multi-select inclusion and exclusion queries across entire repositories ;
  - **Smart collections**: User-defined smart collections can incorporate tag filters, automatically collecting newly indexed images that receive matching tags ;
  - **Extension command gating**: Extension manifests can declare `withTags` constraints on commands, ensuring that specialized actions — such as loading a generation workflow in ComfyUI — are only presented on images with the corresponding tag.

For in-depth details on tag storage mechanics, extension calculation hooks, and web service parameters, refer to the [Tags](tags.md) documentation.

---

## Structured features

Structured features are strongly typed, attributed metadata entities designed to capture deep analytical findings, narrative evaluations, and complex computational provenance:

- **Origin**: Inferred and stored by specialized Picteus extensions — including vision-language models (VLMs), OCR pipelines, facial landmark detectors, or generative AI workflow analyzers ;
- **Storage**: Persisted in the dedicated `ImageFeature` table within the relational SQL database ;
- **Content**: Typed, formatted, and optionally named records spanning eleven distinct formats:
  - Numeric values (`integer`, `float`) for guidance scales, aesthetic ratings, face counts, or step counts ;
  - Booleans for categorical flags ;
  - Strings, rich Markdown narratives, or safe HTML for scene descriptions and critiques ;
  - Validated JSON schemas (such as machine-executable `recipe` workflows) ;
  - XML documents and YAML configurations ;
  - Binary attachment references (`ImageAttachment`) for segmentation masks, depth maps, or pose skeletons ;
  - Declarative dynamic UI containers (`ui`) rendering custom interactive widgets in the image view ;
- **Role & capabilities**: Features bridge the gap between simple flat keywords and full generative or analytical provenance, enabling arithmetic range comparisons (`cfg_scale >= 7.5`), substring queries, and rich visual presentation in the Picteus interface.

For full technical specifications on feature types, format validation matrices, and dynamic UI rendering, refer to the [Features](features.md) documentation.

---

## Vector embeddings

Vector embeddings represent high-dimensional numerical vectors generated by deep neural network models:

- **Origin**: Computed by machine learning extensions executing vision or multimodal encoders — such as CLIP, SigLIP, or FaceNet ;
- **Storage**: Persisted in dedicated collections within the embedded Chroma DB vector database, indexed via Hierarchical Navigable Small World (HNSW) graphs ;
- **Content**: Dense mathematical floating-point vectors — typically 512, 768, or 1024 dimensions — capturing semantic, aesthetic, or identity concepts in latent vector space ;
- **Role & capabilities**: Embeddings unlock cross-modal natural language search — querying images using arbitrary textual prompts ("a quiet bookstore on a rainy afternoon") — and reverse image nearest-neighbor similarity searches using cosine distance metrics.

For details on embedding computation, Chroma DB collections, and the similarity search API, refer to the [Embeddings](embedding.md) documentation. For details on vector database deployment and local HTTP port configuration, refer to the [Databases](databases.md) documentation.

---

## Complementary synergy across facets

Built-in metadata and the enrichment triplet are deliberately designed to complement rather than duplicate each other. They operate in harmony during search, exploration, and workflow execution:

1. **Latent semantic discovery via embeddings**: The user performs an exploratory search using natural language text or an existing image reference, querying Chroma DB to locate conceptually similar items across millions of candidates ;
2. **Taxonomic restriction via tags**: The user applies tag filters to restrict the selection to specific categories — for instance, keeping only images tagged with `"cyberpunk"` and `"night"` ;
3. **Parametric refinement via features**: The query builder applies relational and quantitative constraints against structured features — such as filtering for `steps >= 30`, `sampler = "DPM++ 2M Karras"`, or ensuring a caption contains `"rain"` ;
4. **Validation via built-in metadata**: The user inspects the immutable capture metadata — verifying camera model, lens parameters, original capture date, or color profile ;
5. **Action execution via gated commands**: With the image selected, extension commands gated on the assigned tags — such as sending the generation recipe to an external editing application — become contextually available.

---

## Storage architecture: relational SQL and vector database

Picteus cleanly separates its persistence layers according to data characteristics and querying requirements — see [Databases](databases.md) for the comprehensive documentation about the databases:

| Facet | Database engine | Storage table / collection | Primary index / query mechanism |
|:---|:---|:---|:---|
| **Built-in metadata** | Relational SQL (SQLite via Prisma) | `ImageMetadata` | Foreign key index on `imageId` |
| **Categorical tags** | Relational SQL (SQLite via Prisma) | `ImageTag` | B-tree indexes on `value`, `extensionId`, `imageId` |
| **Structured features** | Relational SQL (SQLite via Prisma) | `ImageFeature` | B-tree indexes on `type`, `format`, `name`, `extensionId`, `imageId` |
| **Vector embeddings** | Vector database (Chroma DB) | Extension-scoped collections | HNSW graphs using cosine distance metrics |

All relational SQL entities automatically maintain referential integrity through foreign key cascades: deleting an image immediately purges its built-in metadata, tags, features, and auxiliary attachments.

For comprehensive details on SQLite configuration, database migrations, and Chroma DB management, refer to the [Databases](databases.md) documentation.

---

## Web services API access

All image enrichment facets are exposed and operable through the Picteus REST web services API — see [Web services API](webservicesapi/index.md) for the OpenAPI overview. External applications, extensions, and the front-end interact with these facets using dedicated endpoints.

Each facet has a dedicated set of endpoints for reading, writing, and searching its data. Detailed specifications — including request and response schemas, security scopes, and SDK usage examples — are documented in the individual facet pages:

- **Built-in metadata**: the `GET /image/{id}/metadata` endpoint retrieves the complete immutable metadata record (EXIF, IPTC, XMP, ICC) for a given image.
- **Categorical tags**: endpoints for setting, reading, and searching tags, as well as listing all distinct tags across a repository. *Detailed documentation: [Tags](tags.md#openapi-web-services-api).*
- **Structured features**: endpoints for setting, reading, and searching features and generative recipes, as well as listing declared feature names. *Detailed documentation: [Features](features.md#openapi-web-services-api).*
- **Vector embeddings**: endpoints for storing, retrieving, and deleting embedding vectors, as well as listing declared embedding names. *Detailed documentation: [Embeddings](embedding.md#openapi-web-services-api).*
- **Multi-criteria search**: the `POST /image/search/images` endpoint executes comprehensive multi-criteria queries combining text keywords, tag filters, structured feature conditions, and vector similarity thresholds. *Detailed documentation: [Images](webservicesapi/images.md).*
