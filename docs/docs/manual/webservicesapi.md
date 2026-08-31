# Web services API

The Picteus back-end exposes an embedded HTTP server hosting a comprehensive REST web services API. Every action and capability available in the graphical user interface is backed by these web services, making Picteus completely operable via API calls from external tools, automation scripts, and custom integrations.

---

## Functional overview

The web services API provides a rich programmatic interface for interacting with the application core, managing media libraries, and extending system functionality:

- **Comprehensive image operations**: querying, searching, filtering, and sorting images based on metadata, tags, and vector embeddings ;
- **Dynamic binary image transformations**: downloading image blobs in multiple formats — `JPEG`, `PNG`, `WEBP`, `GIF`, `AVIF`, `HEIC` — with on-the-fly resizing modes (`inbox`, `cover`, `contain`), quality adjustments, and metadata stripping ;
- **Image ingestion & lineage tracking**: storing newly ingested or processed images into repositories while recording parent/child transformation relationships ;
- **Tagging & feature extraction**: managing categorical tags and attaching arbitrary structured features or AI embeddings to images ;
- **Repository & collection management**: creating, scanning, and organizing storage repositories and user-defined collections ;
- **Attachment management**: linking and retrieving arbitrary binary files associated with images ;
- **Extension lifecycle & execution**: serving as the foundational backbone for Picteus extensions to run commands, subscribe to events, and manage persistent settings ;
- **Security & access control**: issuing and managing scoped API keys with fine-grained permissions.

Because the API conforms to standard HTTP and JSON conventions, any third-party software written in any programming language — such as Python, JavaScript/TypeScript, Go, Rust, Java, C#, or shell scripts — can seamlessly interact with the application.

---

## OpenAPI specification & Swagger UI

The back-end web services are formally specified using the OpenAPI 3.1 standard.

### Specification file location

The OpenAPI JSON specification file is maintained in the Picteus source repository:
- **GitHub repository path**: [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json) ;
- **Raw JSON URL**: [https://raw.githubusercontent.com/picteus/picteus/main/back-end/openapi.json](https://raw.githubusercontent.com/picteus/picteus/main/back-end/openapi.json).

### Embedded Swagger UI

An interactive Swagger UI application is embedded directly within the back-end HTTP server. It allows developers to browse all available endpoints, inspect request/response schemas, review DTO structures, and execute test requests interactively.

- **Default URL**: `http://localhost:3001/swaggerui` (or `https://localhost:3001/swaggerui` when SSL is enabled) ;
- **Port configuration**: the port number defaults to `3001` and can be customized at startup via the `--apiServerPort` CLI option — for example, `--apiServerPort 8080`.

The Electron application offers the "Swagger UI" entry in the main "Picteus" menu, which opens Swagger UI in a dedicated window.

---

## Endpoint resources summary

The API routes are organized into functional resource controllers:

| Resource path | Controller | Functional description |
|:---|:---|:---|
| `/image` | `ImageController` | Inspects image metadata, performs multi-criteria searches and pagination, downloads binary images with on-the-fly formatting and resizing, updates tags, manages extracted features, and triggers image commands. |
| `/repository` | `RepositoryController` | Lists, creates, updates, and deletes image storage repositories, synchronizes filesystem directories, and stores new images linked to parent transformations. |
| `/collection` | `CollectionController` | Manages user-defined image collections, including creating, querying, updating, and reordering images within collections. |
| `/imageAttachment` | `ImageAttachmentController` | Uploads, retrieves, lists, and deletes arbitrary binary attachments associated with specific images. |
| `/extension` | `ExtensionController` | Handles extension management, including installation from archives or unpacked directories, state changes (start/stop), configuration settings retrieval and updates, compilation, and activity inspection. |
| `/apiSecret` | `ApiSecretController` | Generates, inspects, lists, and revokes scoped API keys and secrets used for programmatic access control. |
| `/settings` | `SettingsController` | Retrieves and updates global application configuration parameters. |
| `/administration` | `AdministrationController` | Performs administrative operations, such as executing database schema migrations. |
| `/miscellaneous` | `MiscellaneousController` | Provides system health checks (`/ping`), connectivity testing, and application runtime configuration inspection. |

---

## Client libraries

The official Picteus extension SDKs embed pre-built, strongly typed web services client libraries generated directly from the OpenAPI specification:

| Platform | Web services client library                                              |
|:---|:-------------------------------------------------------------------------|
| **Node.js / TypeScript** | [`@picteus/ws-client`](https://www.npmjs.com/package/@picteus/ws-client) |
| **Python** | [`picteus-ws-client`](https://pypi.org/project/picteus-ws-client/)       |

These client libraries provide complete, strongly typed access to every REST endpoint and Data Transfer Object (DTO) exposed by the HTTP server.

### Generating client libraries for other languages

Third-party developers building external applications or tools in other programming languages can automatically generate client libraries from the OpenAPI specification using standard code generation tooling, such as:

- **OpenAPI Generator**: [https://openapi-generator.tech](https://openapi-generator.tech) — supports generating typed API clients for dozens of languages including Go, Rust, Java, C#, PHP, Swift, and Ruby ;
- **Swagger Codegen**: [https://swagger.io/tools/swagger-codegen/](https://swagger.io/tools/swagger-codegen/) — alternative open-source generation engine for OpenAPI client SDKs.

```bash title="Example client generation using OpenAPI Generator CLI"
# Generate a Go API client from the Picteus OpenAPI specification
npx @openapitools/openapi-generator-cli generate \
  -i https://raw.githubusercontent.com/picteus/picteus/main/back-end/openapi.json \
  -g go \
  -o ./picteus-client-go
```
