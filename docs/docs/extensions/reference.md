# Reference

This documentation is a reference documentation for developers creating extensions for **Picteus**. Picteus extensions enable you to extend the application's capabilities with custom image processing algorithms, automated tagging and feature extraction, interactive user interfaces, external tool integrations, and custom workflow commands.

Picteus provides first-class SDKs for **TypeScript / Node.js** and **Python**. Both runtimes share the same underlying architecture, lifecycle, event system, and intent-driven communication model.

---

## Extension anatomy: what you need to build an extension

To build a Picteus extension, you need two fundamental components:

1. **a manifest file `manifest.json`**: this JSON file defines all contracts between your extension and the application. It declares metadata, required execution runtimes, subscribed event topics, registered UI commands, user-configurable settings schemas, and UI fragment integrations.
2. **an extension class**: an implementation class written in TypeScript or Python that inherits from the base `PicteusExtension` class provided by the SDK. This class overloads lifecycle hooks (`initialize`, `onReady`, `onTerminate`) and event handlers (`onImagesCommand`, `onImageCreated`, etc.) to execute your custom business logic.

---

## Language & runtime

Picteus extensions can be developed either in **TypeScript** (or vanilla **JavaScript**) or in **Python**. Picteus provides an official SDK for each language and hosts dedicated execution runtimes for both platforms:
- **Node.js v24.16.0**: the Node.js runtime comes directly from the embedded Electron runtime, which prevents having to download a dedicated Node.js binary. The `npm` package manager is automatically installed and managed by Picteus ;
- **Python v3.11.14**: a dedicated Python environment managed by Picteus.

### Runtime isolation & storage location

These runtimes are downloaded and installed on demand when required. They do not interfere with the host Operating System, as they are fully isolated in a dedicated directory to prevent any side effects or package conflicts.

The necessary runtimes are installed in the `runtimes` directory inside the application folder:
- **Windows**: `C:\Users\<user>\AppData\Roaming\Picteus\runtimes` (where application directory is `C:\Users\<user>\AppData\Roaming\Picteus`) ;
- **macOS**: `/Users/<user>/Library/Application Support/Picteus/runtimes` (where application directory is `/Users/<user>/Library/Application Support/Picteus`) ;
- **Linux**: `/home/<user>/.config/Picteus/runtimes` (where application directory is `/home/<user>/.config/Picteus`),

where `<user>` represents the current user's login.

---

## Public SDK packages & OpenAPI clients

The Picteus extension SDKs are published as open-source, public packages:

| Platform | Extension SDK Package | Embedded web services client                                             |
|:---|:---|:-------------------------------------------------------------------------|
| **Node.js / TypeScript** | [`@picteus/extension-sdk`](https://www.npmjs.com/package/@picteus/extension-sdk) | [`@picteus/ws-client`](https://www.npmjs.com/package/@picteus/ws-client) |
| **Python** | [`picteus-extension-sdk`](https://pypi.org/project/picteus-extension-sdk) | [`picteus-ws-client`](https://pypi.org/project/picteus-ws-client/)       |

### Embedded back-end OpenAPI client

Each SDK embeds the corresponding typed back-end web services client library ([`@picteus/ws-client`](https://www.npmjs.com/package/@picteus/ws-client) on npm and [`picteus-ws-client`](https://pypi.org/project/picteus-ws-client/) on PyPI). These clients are generated directly from the back-end OpenAPI specifications — [see its JSON file](https://github.com/picteus/picteus/blob/main/back-end/openapi.json) —, providing complete, strongly typed access to every REST endpoint and Data Transfer Object (DTO) exposed by the HTTP server embeeded in the back-end.

---

## The extension manifest — `manifest.json`

### Manifest schema contract

Every extension must include a `manifest.json` file in its root directory. This manifest acts as the formal contract between the application and the extension.

The extension identifier declared through the `id` property must be unique with regard to all already installed extensions. If you attempt to install an extension with an `id` that is already registered, the installation will fail.

> [!CAUTION]
> **Strict JSON Schema compliance required**
> : the `manifest.json` file is strictly validated against the Picteus manifest schema, accessible online at https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json, which should be specified through the `$schema` property. If any property fails validation — invalid types, missing required fields, illegal characters, or incorrect regex patterns —, **the server will reject the manifest and the extension will not start.**

### Key manifest sections

Here is an overview of the manifest structure:

```json
{
  "$schema": "https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json",
  "id": "my-extension",
  "version": "1.0.0",
  "name": "My Extension Name",
  "description": "A clear description of what the extension does.",
  "categories": ["enrichment", "utility"],
  "runtimes": [
    {
      "environment": "node"
    }
  ],
  "instructions": [
    {
      "execution": {
        "executable": "${node}",
        "arguments": ["./dist/main.js"]
      },
      "events": [
        "process.runCommand",
        "image.created",
        "image.runCommand"
      ],
      "capabilities": [
        { "id": "image.tags" },
        { "id": "image.features" }
      ],
      "throttlingPolicies": [
        {
          "events": ["image.created"],
          "durationInMilliseconds": 100,
          "maximumCount": 10
        }
      ],
      "commands": [
        {
          "id": "myImageCommand",
          "on": {
            "entity": "Images",
            "withTags": ["featured"]
          },
          "parameters": {
            "type": "object",
            "properties": {
              "mode": {
                "type": "string",
                "enum": ["fast", "quality"],
                "default": "fast"
              }
            },
            "required": ["mode"]
          },
          "specifications": [
            {
              "locale": "en",
              "label": "Process",
              "name": "Process Images",
              "description": "Applies custom processing to the selected images."
            }
          ],
          "ui": {
            "iconUri": "/ui/icons/process.svg"
          }
        }
      ]
    }
  ],
  "settings": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Third-party service API key."
      }
    }
  },
  "ui": {
    "elements": [
      {
        "id": "mainSidebar",
        "integration": {
          "anchor": "sidebar",
          "isExternal": false
        },
        "url": "/ui/sidebar.html"
      }
    ]
  }
}
```

#### Manifest properties breakdown

- **`id`** *(required, string, 1-32 chars, regex: `^[a-z0-9A-Z-_.]{1,32}$`)*: the unique extension identifier — must be strictly unique among installed extensions (installation fails if the `id` is already registered).
- **`version`** *(required, SemVer string)*: the semantic version (e.g. `1.0.0`).
- **`name`** *(required, string)*: display name in the application extension manager.
- **`description`** *(required, string)*: summary of extension features.
- **`categories`** *(required, array)*: categorization (`capture`, `generation`, `enrichment`, `integration`, `utility`, `other`).
- **`runtimes`** *(required, array)*: execution environments (`"node"` or `"python"`).
- **`instructions`** *(required, array)*: execution directives:
  - **`execution`**: defines how the back-end starts the extension process (`executable` with `${node}` / `${python}` macros, and `arguments`).
  - **`events`**: subscribed event topics (e.g. `image.created`, `image.updated`, `image.deleted`, `image.runCommand`, `process.runCommand`, `text.computeEmbeddings`).
  - **`capabilities`**: declared feature capabilities (`image.features`, `image.embeddings`, `image.tags`, `text.embeddings`).
  - **`throttlingPolicies`**: rate limits defining `durationInMilliseconds` and `maximumCount` for specified events.
  - **`commands`**: action commands registered in the UI:
    - `id`: identifier sent to `onImagesCommand` or `onProcessCommand`.
    - `on`: scope where the command appears (`entity`: `"Process"`, `"Images"`, or `"Image"`, optional `withTags` filter).
    - `parameters`: JSON Schema defining the form presented to the user when triggering the command.
    - `specifications`: localized labels, titles, and descriptions.
    - `ui`: command labels and icon URI.
- **`settings`** *(required, object)*: JSON Schema for global extension configuration.
- **`ui`** *(optional, object)*: pre-registered UI fragments (`sidebar`, `window`, `imageDetail`).


---

## The `PicteusExtension` base class

All Picteus extensions extend the base class provided by the SDK:
- **TypeScript**: `PicteusExtension` from `@picteus/extension-sdk` (or `@picteus/internal-extension-sdk`).
- **Python**: `PicteusExtension` from `picteus_extension_sdk`.

### Class hierarchy & instantiation

```typescript
// TypeScript Entry Point (src/main.ts)
import { PicteusExtension } from "@picteus/extension-sdk";

class MyExtension extends PicteusExtension {
  // Overload lifecycle & event methods here
}

new MyExtension().run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

```python
# Python Entry Point (main.py)
import asyncio
from picteus_extension_sdk import PicteusExtension

class MyExtension(PicteusExtension):
    # Overload lifecycle & event methods here
    pass

if __name__ == "__main__":
    asyncio.run(MyExtension().run())
```

### Lifecycle methods to override

| Method (TypeScript) | Method (Python) | Trigger & Responsibility                                                                                                                      |
|:---|:---|:----------------------------------------------------------------------------------------------------------------------------------------------|
| `initialize(): Promise<boolean>` | `async initialize(self) -> bool` | Called at process startup before socket connection. Return `true` to establish the WebSocket connection, or `false` for standalone jobs.      |
| `onReady(communicator?: Communicator): Promise<void>` | `async on_ready(self, communicator: Optional[Communicator]) -> None` | Called when the extension socket connects and the server sends `extension.ready`. Ideal for startup logging and initial status announcements. |
| `onTerminate(): Promise<void>` | `async on_terminate(self) -> None` | Called when the process receives `SIGTERM`. Use for resource cleanup (closing DB handles, releasing child processes).                         |
| `onUpgrade(communicator: Communicator, versions: Versions): Promise<void>` | `async on_upgrade(self, communicator: Communicator, versions: Versions) -> None` | Triggered when the extension version is installed or upgraded (`versions.previous` vs `versions.current`).                                    |
| `onSettings(communicator: Communicator, value: SettingsValue): Promise<void>` | `async on_settings(self, communicator: Communicator, value: SettingsValue) -> None` | Triggered whenever the user updates the extension's settings in the UI.                                                                       |

### Event routing & domain handlers

The base class implements `onEvent` / `on_event` which automatically routes events to specialized hook methods. You can override individual hook methods directly without needing to write a manual switch statement:

#### 1. Image Lifecycle Events

| Method (TypeScript) | Method (Python) | Description                                              |
|:---|:---|:---------------------------------------------------------|
| `onImageCreated(communicator, imageId)` | `on_image_created(self, communicator, image_id)` | Fired when a new image is ingested into the application. |
| `onImageUpdated(communicator, imageId)` | `on_image_updated(self, communicator, image_id)` | Fired when image metadata or image content is updated.   |
| `onImageDeleted(communicator, imageId)` | `on_image_deleted(self, communicator, image_id)` | Fired when an image is deleted from the repository.      |
| `onImageTagsUpdated(communicator, imageId)` | `on_image_tags_updated(self, communicator, image_id)` | Fired when user or system tags on an image change.       |
| `onImageFeaturesUpdated(communicator, imageId)` | `on_image_features_updated(self, communicator, image_id)` | Fired when extracted image features are modified.        |

#### 2. Computation & AI capabilities

| Method (TypeScript) | Method (Python) | Description |
|:---|:---|:---|
| `onComputeImageTags(communicator, imageId)` | `on_compute_image_tags(self, communicator, image_id)` | Triggered to generate tags for an image. |
| `onComputeImageFeatures(communicator, imageId)` | `on_compute_image_features(self, communicator, image_id)` | Triggered to extract structured features/metadata for an image. |
| `onComputeImageEmbeddings(communicator, imageId)` | `on_compute_image_embeddings(self, communicator, image_id)` | Triggered to compute vector embeddings for similarity search. |
| `onComputeTextEmbeddings(communicator, text)` | `on_compute_text_embeddings(self, communicator, text)` | Triggered to compute text embeddings (returns `number[]` / `list[float]`). |

#### 3. Command execution handlers

| Method (TypeScript) | Method (Python) | Description |
|:---|:---|:---|
| `onImagesCommand(communicator, commandId, imageIds, parameters)` | `on_images_command(self, communicator, command_id, image_ids, parameters)` | Triggered when a user executes a command on one or more selected images. |
| `onProcessCommand(communicator, commandId, parameters)` | `on_process_command(self, communicator, command_id, parameters)` | Triggered when a user executes a global process-level command. |

### Helper APIs & utilities

The base class provides several static and instance helper methods:

- `PicteusExtension.getManifest()` / `PicteusExtension.get_manifest()`: reads and parses the current `manifest.json`.
- `PicteusExtension.getSdkVersion()` / `PicteusExtension.get_sdk_version()`: returns the SDK version string.
- `PicteusExtension.getExtensionHomeDirectoryPath()` / `PicteusExtension.get_extension_home_directory_path()`: returns the extension's working root path.
- `PicteusExtension.getCacheDirectoryPath()` / `PicteusExtension.get_cache_directory_path()`: returns the path to the `.cache` folder.
- `this.getSettings()` / `self.get_settings()`: Fetches the current persistent user settings for this extension.
- `this.logger` / `self.logger`: process logger with leveled logging (`debug`, `info`, `warn`, `error`).

### Error handling

- **`CommandError`**: if an error occurs during `onImagesCommand` or `onProcessCommand`, throw a `CommandError`. The SDK will catch it and display an error toast notification to the user in the UI automatically.
- **`InstructionReturnedError`**: thrown when an intent launched via `communicator.launchIntent` is canceled by the user (`reason: InstructionReturnedErrorCause.Cancel`) or rejected due to a back-end error (`reason: InstructionReturnedErrorCause.Error`).
- **`ApiCallError`**: thrown when a REST API call to the back-end returns an HTTP status $\ge 400$.

---

## Interacting with the back-end REST API

### Full back-end API embedded in the SDK

A core strength of the extension SDK is that **it embeds the entirety of the back-end REST API**, completely generated from the official OpenAPI specifications.

> [!TIP]
> **Zero manual API configuration**
> : when your extension runs, the `PicteusExtension` base class automatically initializes all REST clients with the server's base URL and authentication credentials (`apiKey`). You do not need to configure HTTP headers, tokens, serialization, or base URLs manually — every back-end service is instantly accessible through typed methods and models.

Your extension can interact with **any capability and resource** provided by the back-end:
- search, filter, sort, and paginate through image libraries ;
- download binary image blobs in various formats (`JPEG`, `PNG`, `WEBP`, `GIF`, `AVIF`, `HEIC`) with on-the-fly resizing and metadata stripping ;
- ingest and store new images into repositories, preserving parent/child transformation lineages ;
- extract, attach, and query structured features, tags, and vector embeddings ;
- inspect and manage collections and storage repositories ;
- access secure third-party credentials managed within the application via the API Secret service.

---

### Available API clients & capabilities

The `PicteusExtension` base class exposes preconfigured getters for all back-end API clients:

| API Getter (TypeScript) | API Getter (Python) | Capabilities & Scope                                                                                                                                                                                    |
|:---|:---|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `this.getImageApi()` | `self.get_image_api()` | **Images**: query image metadata, search with complex filters and pagination, download image binary blobs (with resizing/formatting options), update or delete tags, and set custom extracted features. |
| `this.getRepositoryApi()` | `self.get_repository_api()` | **Repositories**: list registered image repositories and store newly created or processed image blobs into specific repositories with optional parent image linkage.                                    |
| `this.getCollectionApi()` | `self.get_collection_api()` | **Collections**: query, create, inspect, and organize user collections of images.                                                                                                                       |
| `this.getExtensionApi()` | `self.get_extension_api()` | **Extensions**: manage extension-related state and query user settings stored on the server.                                                                                                            |
| `this.getApiSecretApi()` | `self.get_api_secret_api()` | **API Secrets**: securely retrieve encrypted API keys and external access tokens configured in the UI.                                                                                                  |
| `this.getImageAttachmentApi()` | `self.get_image_attachment_api()` | **Attachments**: upload, download, and manage arbitrary binary attachment files associated with images.                                                                                                 |
| `this.getMiscellaneousApi()` | `self.get_miscellaneous_api()` | **System & Diagnostics**: query system health, runtime parameters, and server utility endpoints.                                                                                                        |

---

### API usage examples (TypeScript & Python)

#### 1. Searching images & querying metadata

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

for (const summary of summaries.items) {
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

#### 2. Downloading blobs and ingesting transformed images

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

#### 3. Setting tags and custom extracted features

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

---

## The "intents" system

### Understanding "intents"

**Intents** are asynchronous requests initiated by an extension to interact with the Picteus front-end UI or back-end server services. When an extension calls `communicator.launchIntent(intent)` (or `communicator.launch_intent(intent)`), the SDK sends the intent to the server — through a WebSocket — and waits for the user's action or server response before resolving.

```
┌──────────────────┐               launchIntent(intent)              ┌─────────────────┐
│                  ├─────────────────────────────────────────────────►                 │
│    Extension     │                                                 │   Picteus UI    │
│                  │◄────────────────────────────────────────────────┤                 │
└──────────────────┘     resolves with user input / return value     └─────────────────┘
```

---

### User Interface (UI) & interaction intents

#### 1. `DialogIntent` (`dialog`)
Displays modal dialog boxes: confirmation questions, Info messages, Error notices, or dialogs containing embedded HTML frames.

````carousel
```typescript
// TypeScript example
import { IntentDialogType } from "@picteus/extension-sdk";

const confirmed = await communicator.launchIntent<boolean>({
  dialog: {
    type: IntentDialogType.Question,
    size: "m",
    title: "Confirm Action",
    description: "Are you sure you want to proceed with this operation?",
    details: "This operation will apply irreversible changes.",
    buttons: { yes: "Yes, Proceed", no: "Cancel" }
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import DialogIntent, IntentDialog, IntentDialogType, IntentDialogButtons

confirmed = await communicator.launch_intent(DialogIntent(
    dialog=IntentDialog(
        type=IntentDialogType.QUESTION,
        size="m",
        title="Confirm Action",
        description="Are you sure you want to proceed with this operation?",
        details="This operation will apply irreversible changes.",
        buttons=IntentDialogButtons(yes="Yes, Proceed", no="Cancel")
    )
))
```
````

#### 2. `FormIntent` (`form`)
Presents a dynamically generated form based on JSON Schema and returns the user's filled inputs as an object/dictionary.

````carousel
```typescript
// TypeScript example
const userInput = await communicator.launchIntent<Record<string, any>>({
  form: {
    parameters: {
      type: "object",
      properties: {
        targetFormat: {
          type: "string",
          title: "Target Format",
          enum: ["jpeg", "png", "webp"],
          default: "webp"
        },
        quality: {
          type: "integer",
          title: "Quality",
          minimum: 1,
          maximum: 100,
          default: 85
        }
      },
      required: ["targetFormat"]
    },
    dialogContent: {
      title: "Export Settings",
      description: "Select target format and quality options.",
      size: "m"
    }
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import FormIntent, IntentFormContent, IntentDialogIconSizeContent

user_input = await communicator.launch_intent(FormIntent(
    form=IntentFormContent(
        parameters={
            "type": "object",
            "properties": {
                "targetFormat": {
                    "type": "string",
                    "title": "Target Format",
                    "enum": ["jpeg", "png", "webp"],
                    "default": "webp"
                },
                "quality": {
                    "type": "integer",
                    "title": "Quality",
                    "minimum": 1,
                    "maximum": 100,
                    "default": 85
                }
            },
            "required": ["targetFormat"]
        },
        dialogContent=IntentDialogIconSizeContent(
            title="Export Settings",
            description="Select target format and quality options.",
            size="m"
        )
    )
))
```
````

#### 3. `UiIntent` (`ui`)
Opens a dedicated UI frame (Modal, Sidebar, Window, or ImageDetail) rendering an external/internal URL or raw inline HTML.

````carousel
```typescript
// TypeScript example
import { IntentUiAnchor } from "@picteus/extension-sdk";

await communicator.launchIntent({
  ui: {
    id: "my-custom-modal",
    integration: { anchor: IntentUiAnchor.Modal },
    frameContent: {
      html: `<!DOCTYPE html><html><body><h2>Custom Interface</h2><p>Extension content rendered here.</p></body></html>`
    },
    dialogContent: {
      title: "Custom Tool",
      description: "Embedded extension UI."
    }
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import UiIntent, IntentUi, IntentUIModalIntegration, IntentFrameHtmlContent, IntentDialogIconContent

await communicator.launch_intent(UiIntent(
    ui=IntentUi(
        id="my-custom-modal",
        integration=IntentUIModalIntegration(),
        frameContent=IntentFrameHtmlContent(
            html="<!DOCTYPE html><html><body><h2>Custom Interface</h2><p>Extension content rendered here.</p></body></html>"
        ),
        dialogContent=IntentDialogIconContent(
            title="Custom Tool",
            description="Embedded extension UI."
        )
    )
))
```
````

#### 4. `ImagesIntent` (`images`)
Displays a grid of images / thumbnails to the user inside an interactive dialog.

````carousel
```typescript
// TypeScript example
await communicator.launchIntent({
  images: {
    images: [{ imageId: "img-123" }, { imageId: "img-456" }],
    dialogContent: {
      title: "Processed Results",
      description: "Here are the newly generated images."
    }
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import ImagesIntent, IntentImages, IntentImage, IntentDialogIconContent

await communicator.launch_intent(ImagesIntent(
    images=IntentImages(
        images=[IntentImage(imageId="img-123"), IntentImage(imageId="img-456")],
        dialogContent=IntentDialogIconContent(
            title="Processed Results",
            description="Here are the newly generated images."
        )
    )
))
```
````

#### 5. `ToastIntent` (`toast`)
Displays a brief, non-intrusive toast notification in the application.

````carousel
```typescript
// TypeScript example
import { IntentToastType } from "@picteus/extension-sdk";

await communicator.launchIntent({
  toast: {
    type: IntentToastType.Info,
    title: "Processing Complete",
    subtitle: "Processed 12 images successfully."
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import ToastIntent, IntentToast, IntentToastType

await communicator.launch_intent(ToastIntent(
    toast=IntentToast(
        type=IntentToastType.INFO,
        title="Processing Complete",
        subtitle="Processed 12 images successfully."
    )
))
```
````

#### 6. `NotificationIntent` (`notification`)
Sends a notification to the Picteus notification center or system desktop notification manager (`isNative: true`).

---

### System & navigation intents

- **`ShowIntent` (`show`)**: navigates the Picteus client to a specific view:
  - `IntentShowType.Image`: open an image detail page.
  - `IntentShowType.Sidebar`: open a registered sidebar panel.
  - `IntentShowType.ExtensionSettings`: open this extension's settings page.
  - `IntentShowType.Repository`: open a repository view.
- **`OpenBrowserIntent` (`openBrowser`)**: opens an external URL in the user's default web browser.
- **`ActionIntent` (`action`)**: bundles an intent with an executable trigger button inside a dialog or notification.

---

### File & bundle intents

- **`ReadFileIntent` (`readFile`)**: prompts the user with a native file picker to select a file (with optional extension filters) and returns the file content as a `Buffer` (TS) or `bytearray` (Python).
- **`WriteFileIntent` (`writeFile`)**: prompts the user to save a file with suggested name, extension, and binary content.
- **`ServeBundleIntent` (`serveBundle`)**: uploads and serves a zipped HTML/JS web application bundle from the extension to an iframe endpoint hosted by the Picteus server.

---

## Files structure

All resources of an extension must be laid out in a dedicated file system directory, which contains at its root the `manifest.json` file.

### Common files

The following files may reside at the root of any extension directory, regardless of the programming language:

- **`manifest.json`** *(mandatory)*: defines all contracts between the extension and the application (metadata, runtimes, instructions, commands, settings schema, UI elements).
- **`icon.svg` or `icon.png`** *(optional)*: the visual icon representing the extension. SVG (`icon.svg`) should be preferred over PNG (`icon.png`). When present, the UI uses this icon across the application to display any activity, notification, or menu entry related to the extension.
- **`MANUAL.md`** *(optional)*: provides Markdown documentation rendered directly within the application's user interface:
  - the `# Summary` section is parsed and displayed in the UI as the overall description and documentation for the extension ;
  - for any command with an identifier `<commandId>` defined in `manifest.json`, a corresponding `# <commandId>` section in `MANUAL.md` will be parsed and displayed as contextual documentation for that command in the UI.

---

### TypeScript / Node.js

#### 1. Project directory structure

Here is a typical structure of the files for a TypeScript extension:
```
my-ts-extension/
├── manifest.json
├── MANUAL.md
├── icon.svg
├── package.json
├── tsconfig.json
└── src/
    └── main.ts
```

#### 2. `package.json`

For TypeScript extensions, the `package.json` file is **mandatory**. It must:
- define the package dependencies (such as `@picteus/extension-sdk`) ;
- set `type` to `module` ;
- specify the main entry file (`dist/main.js`) ;
- contain a `build` script responsible for compiling the TypeScript source code into JavaScript (e.g. `"build": "tsc"`) ;
- declare the `files` array, which explicitly lists all files and directories to embed when packaging the extension (such as `dist`, `manifest.json`, `icon.svg`, `MANUAL.md`). Pay particular attention to the `"files"` property to ensure that all required runtime assets are included when packaging the extension.

```json
{
  "name": "my-ts-extension",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/main.js",
  "files": [
    "dist",
    "manifest.json",
    "icon.svg",
    "MANUAL.md"
  ],
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@picteus/extension-sdk": "0.15.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0"
  }
}
```

#### 3. `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

#### 4. `src/main.ts`
```typescript
import {
  PicteusExtension,
  Communicator,
  CommandParameters,
  IntentToastType
} from "@picteus/extension-sdk";

class MyTsExtension extends PicteusExtension {

  protected async initialize(): Promise<boolean> {
    this.logger.info("Initializing MyTsExtension");
    return true;
  }

  protected async onReady(communicator?: Communicator): Promise<void> {
    communicator?.sendLog("MyTsExtension is ready to handle events", "info");
  }

  protected async onImageCreated(communicator: Communicator, imageId: string): Promise<void> {
    communicator.sendLog(`New image ingested: ${imageId}`, "debug");
  }

  protected async onImagesCommand(
    communicator: Communicator,
    commandId: string,
    imageIds: string[],
    parameters: CommandParameters
  ): Promise<void> {
    if (commandId === "myCommand") {
      communicator.sendLog(`Running myCommand on ${imageIds.length} images`, "info");
      await communicator.launchIntent({
        toast: {
          type: IntentToastType.Info,
          subtitle: `Successfully processed ${imageIds.length} images.`
        }
      });
    }
  }

}

new MyTsExtension().run().catch((error) => {
  console.error("Extension execution failed:", error);
  process.exit(1);
});
```

---

### Python

#### 1. Project directory structure

Here is a typical structure of the files for a Python extension:
```
my-py-extension/
├── manifest.json
├── MANUAL.md
├── icon.svg
├── requirements.txt
└── main.py
```

#### 2. `requirements.txt`

For Python extensions, the `requirements.txt` file is **mandatory**. It lists all Python package dependencies required by the extension (including `picteus-extension-sdk`):

```text
picteus-extension-sdk == 0.15.0
```

#### 3. `main.py`
```python
import asyncio
from typing import List
from picteus_extension_sdk import (
    PicteusExtension,
    Communicator,
    CommandParameters,
    ToastIntent,
    IntentToast,
    IntentToastType
)

class MyPyExtension(PicteusExtension):

    async def initialize(self) -> bool:
        self.logger.info("Initializing MyPyExtension")
        return True

    async def on_ready(self, communicator: Communicator | None) -> None:
        if communicator is not None:
            communicator.send_log("MyPyExtension is ready", "info")

    async def on_image_created(self, communicator: Communicator, image_id: str) -> None:
        communicator.send_log(f"New image ingested: {image_id}", "debug")

    async def on_images_command(
        self,
        communicator: Communicator,
        command_id: str,
        image_ids: List[str],
        parameters: CommandParameters
    ) -> None:
        if command_id == "myCommand":
            communicator.send_log(f"Running myCommand on {len(image_ids)} images", "info")
            await communicator.launch_intent(ToastIntent(
                toast=IntentToast(
                    type=IntentToastType.INFO,
                    subtitle=f"Successfully processed {len(image_ids)} images."
                )
            ))

if __name__ == "__main__":
    asyncio.run(MyPyExtension().run())
```

---

## Package

To distribute, install, or update an extension within the application, you package its directory into a single compressed archive file.

### Creating the archive

An extension package contains all the extension files and assets at the root of the archive, including `manifest.json`, the source files or compiled directory, `icon.svg` or `icon.png`, `MANUAL.md`, and dependency manifests.

#### Compilation requirements per runtime
- **Python**: the Python source code should be shipped directly within the archive without prior compilation, since Python requires no ahead-of-time compilation and runs interpreted on the embedded Python runtime ;
- **Node.js / TypeScript**: the TypeScript code must be compiled into JavaScript prior to packaging. The compilation is operated via the `"build"` script declared in `package.json` by running the `npm run build` command, which generates the JavaScript code into the `dist` folder.

#### Supported archive formats & extensions
The application accepts archives with the following formats and file extensions:
- **Zip archive**: `.zip` (`application/zip`) ;
- **Gzip tarball**: `.tar.gz` or `.tgz` (`application/gzip`, `application/x-gzip`).

#### Excluded folders
Before packaging the archive, always exclude or delete local dependencies and virtual environments:
- **TypeScript / Node.js**: remove the `node_modules` directory ;
- **Python**: remove the `.venv` virtual environment directory.

The back-end will automatically resolve and install dependencies upon installation based on `package.json` or `requirements.txt`.

#### Packaging command examples

A common and convenient way to package a Node.js extension is to use the `npm pack` command, which compiles into a `.tgz` tarball archive and automatically uses the `"files"` directive in `package.json` to select the exact files to include.

````carousel
```bash title="npm pack for Node.js (recommended)"
# 1. Compile TypeScript into JavaScript
npm run build

# 2. Package the extension into a .tgz archive using the "files" property
npm pack
```
<!-- slide -->
```bash title="Zip archive (cross-platform)"
# In the extension root directory (after "npm run build" for Node.js):
zip -r my-extension.zip . -x "node_modules/*" ".venv/*" ".cache/*"
```
<!-- slide -->
```bash title="Tarball archive (Linux / macOS)"
# In the extension root directory (after "npm run build" for Node.js):
tar --exclude="node_modules" --exclude=".venv" --exclude=".cache" -czvf my-extension.tar.gz .
```
````

---

### Installing and updating the extension

Once the archive is created, you can install or update the extension via the user interface or via the back-end REST API, or provide it as an "unpacked" extension.

#### 1. Via the user interface (UI)

The application offers a dedicated space in the UI to manage extensions.

#### 2. Via the back-end REST API

The back-end API offers dedicated OpenAPI web service endpoints for installing — `/extension/install` (OpenAPI operation ID: `extension_install`, method: `ExtensionApi.extensionInstall`) — or updating an extension — `/extension/{id}/update` (OpenAPI operation ID: `extension_update`, method: `ExtensionApi.extensionUpdate`).

#### 3. As an "unpacked" extension

The back-end offers a feature which enables to provide the extension directly through its file system folder.


---

## Best practices

1. **Strict manifest alignment**: always ensure the commands and event subscriptions declared in `manifest.json` match the methods implemented in your code.
2. **Use communicator logging**: use `communicator.sendLog(...)` for messages that should be visible to users in the UI logs, and use `this.logger` / `self.logger` for local daemon process diagnostics.
3. **Throttling on high-frequency events**: ingesting thousands of images can trigger thousands of `image.created` events. Always configure `throttlingPolicies` in `manifest.json` for batch operations.
4. **Throw `CommandError` for user errors**: when user inputs fail validation in commands, throw `CommandError("Message")` instead of letting an unhandled exception crash the event; this automatically shows a helpful error toast in the UI.
5. **Clean async resource management**: always await API calls and intent promises to prevent unhandled promise rejections.
