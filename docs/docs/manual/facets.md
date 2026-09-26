# Facets

In Picteus, **facets** represent the distinct dimensions of data and metadata that qualify an image beyond its raw
binary file. Picteus distinguishes two categories of image data: **built-in metadata** — immutable intrinsic properties
such as EXIF, IPTC, XMP, and ICC data extracted directly from the image file upon ingestion — and the **image enrichment
facets triplet** — categorical tags, structured features, and vector embeddings — which extensions or automated
pipelines compute and write. Together, these dimensions support multi-layered search, automated classification, dynamic
UI presentations, and targeted extension workflows.

---

## The image enrichment facets triplet

The enrichment triplet groups the three extension-driven facets that Picteus uses to dynamically augment an image's knowledge corpus. Unlike built-in metadata — which is extracted automatically from the image file upon ingestion and cannot be modified — these three facets are entirely computed and persisted by extensions or automated pipelines. Each operates at a different level of abstraction, fulfills a distinct query need, and is stored in the database engine best suited to its access patterns:

```
+-----------------------------------------------------------------------------------+
|                                   Picteus image                                   |
+-----------------------------------------------------------------------------------+
        |                          |                        |               |
        | (extracted,              |                        |               |
        |  read-only)              +---[ Enrichment triplet ]---------------+
        v                          v                        v               v
+------------------+     +------------------+     +------------------+  +-----------+
| Built-in         |     | Categorical      |     | Structured       |  | Vector    |
| metadata         |     | tags             |     | features         |  | embeddings|
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

- **Origin and extraction**: read automatically during file scanning by back-end metadata extractors;
- **Storage**: persisted in the `ImageMetadata` table within the relational SQL database;
- **Content**:
    - **EXIF (Exchangeable Image File Format)**: camera exposure settings, shutter speed, aperture, ISO, focal length,
      lens model, orientation, and capture timestamp;
    - **IPTC (International Press Telecommunications Council)**: editorial attributes, copyright notices, author
      credits, creation city, and captions;
    - **XMP (Extensible Metadata Platform)**: XML-based extensible metadata packets, rating values, editing software
      history, and camera raw processing profiles;
    - **ICC color profiles**: color space specifications — such as sRGB, Adobe RGB, or Display P3 — and color profile
      calibration records;
    - **Photoshop TIFF tags**: image resource blocks, print management tags, and layer metadata embedded by authoring
      software;
- **Nature and immutability**: unlike other facets that extensions can dynamically compute, replace, or overwrite,
  built-in metadata is **immutable**. It reflects the capture conditions and embedded attributes recorded by the camera,
  scanner, or authoring software.

---

## Categorical tags

Categorical tags are flat, lightweight textual keywords attached to an image and attributed to a specific extension namespace:

- **Origin**: computed programmatically by classification extensions — such as automated vision taggers, subject
  classifiers, or provenance detectors — or assigned through the API;
- **Storage**: persisted in the dedicated `ImageTag` table within the relational SQL database;
- **Content**: discrete alphanumeric identifiers — such as `"portrait"`, `"cyberpunk"`, `"landscape"`, `"comfyui"`, or
  `"automatic1111"`;
- **Role and capabilities**:
    - **Fast taxonomic filtering**: tag pills in the front-end allow rapid multi-select inclusion and exclusion queries
      across repositories;
    - **Smart collections**: user-defined smart collections can incorporate tag filters, automatically collecting newly
      indexed images that receive matching tags;
    - **Extension command gating**: extension manifests can declare `withTags` constraints on commands, ensuring that
      specialized actions — such as loading a generation workflow in ComfyUI — are only presented on images with the
      corresponding tag.

For in-depth details on tag storage mechanics, extension calculation hooks, and web service parameters, refer to the [Tags](tags.md) documentation.

---

## Structured features

Structured features are strongly typed, attributed metadata entities designed to capture deep analytical findings, narrative evaluations, and complex computational provenance:

The `recipe` feature is a specialized feature type for recording the prompt or structured instructions used to generate
an image, together with generation context. See [Generation recipes](recipe.md) for its forms and how it helps trace
image origins.

- **Origin**: inferred and stored by specialized Picteus extensions — including vision-language models (VLMs), OCR
  pipelines, facial landmark detectors, or generative AI workflow analyzers;
- **Storage**: persisted in the dedicated `ImageFeature` table within the relational SQL database;
- **Content**: typed, formatted, and optionally named records spanning eleven distinct formats:
    - numeric values (`integer`, `float`) for guidance scales, aesthetic ratings, face counts, or step counts;
    - booleans for categorical flags;
    - strings, rich Markdown narratives, or safe HTML for scene descriptions and critiques;
    - validated JSON schemas — such as machine-executable `recipe` workflows;
    - XML documents and YAML configurations;
    - binary attachment references (`ImageAttachment`) for segmentation masks, depth maps, or pose skeletons;
    - declarative dynamic UI containers (`ui`) rendering custom interactive widgets in the image view;
- **Role and capabilities**: features bridge the gap between simple flat keywords and full generative or analytical
  provenance, enabling arithmetic range comparisons (`cfg_scale >= 7.5`), substring queries, and rich visual
  presentation in the Picteus interface.

For full technical specifications on feature types, format validation matrices, and dynamic UI rendering, refer to the [Features](features.md) documentation.

---

## Vector embeddings

Vector embeddings represent high-dimensional numerical vectors generated by deep neural network models:

- **Origin**: computed by machine learning extensions executing vision or multimodal encoders — such as CLIP, SigLIP, or
  FaceNet;
- **Storage**: persisted in dedicated collections within the embedded Chroma DB vector database, indexed via
  hierarchical navigable small world (HNSW) graphs;
- **Content**: dense mathematical floating-point vectors — typically 512, 768, or 1024 dimensions — capturing semantic,
  aesthetic, or identity concepts in latent vector space;
- **Role and capabilities**: embeddings support cross-modal natural language search — querying images using arbitrary
  textual prompts such as "a quiet bookstore on a rainy afternoon" — and reverse image nearest-neighbor similarity
  searches using cosine distance metrics.

For details on embedding computation, Chroma DB collections, and similarity search, see [Embeddings](embedding.md).

---

## How facets work together

Built-in metadata and the enrichment triplet are deliberately designed to complement rather than duplicate each other. They operate in harmony during search, exploration, and workflow execution:

1. **Latent semantic discovery via embeddings**: the user searches with natural language text or an image reference,
   querying Chroma DB to locate conceptually similar items across millions of candidates;
2. **Taxonomic restriction via tags**: the user applies tag filters to restrict the selection to specific categories —
   for instance, keeping only images tagged with `"cyberpunk"` and `"night"`;
3. **Parametric refinement via features**: the query builder applies relational and quantitative constraints to
   structured features — such as filtering for `steps >= 30`, `sampler = "DPM++ 2M Karras"`, or ensuring a caption
   contains `"rain"`;
4. **Validation via built-in metadata**: the user inspects the immutable capture metadata — verifying camera model, lens
   parameters, original capture date, or color profile;
5. **Action execution via gated commands**: with the image selected, extension commands gated on assigned tags — such as
   sending the generation recipe to an external editing application — become available.

---

## Storage architecture: relational SQL and vector database

Picteus separates its persistence layers according to data characteristics and querying requirements —
see [Databases](databases.md) for details:

| Facet                   | Database engine                    | Storage table / collection   | Primary index / query mechanism                                      |
|:------------------------|:-----------------------------------|:-----------------------------|:---------------------------------------------------------------------|
| **Built-in metadata**   | relational SQL — SQLite via Prisma | `ImageMetadata`              | Foreign key index on `imageId`                                       |
| **Categorical tags**    | relational SQL — SQLite via Prisma | `ImageTag`                   | B-tree indexes on `value`, `extensionId`, `imageId`                  |
| **Structured features** | relational SQL — SQLite via Prisma | `ImageFeature`               | B-tree indexes on `type`, `format`, `name`, `extensionId`, `imageId` |
| **Vector embeddings**   | Vector database (Chroma DB)        | Extension-scoped collections | HNSW graphs using cosine distance metrics                            |

Relational SQL entities maintain referential integrity through foreign key cascades: deleting an image immediately
removes its built-in metadata, tags, features, and auxiliary attachments.

See [Databases](databases.md) for SQLite configuration, database migrations, and Chroma DB management.

---

## Web services API access

All image enrichment facets are exposed through the Picteus REST web services API. See
the [Web services API](webservicesapi/index.md) overview for shared conventions and
the [image endpoint reference](webservicesapi/images#endpoint-summary) for image metadata, enrichment, and
multi-criteria search endpoints. The [Tags](tags.md), [Features](features.md), and [Embeddings](embedding.md) pages
explain the domain concepts and behavior.
