# Class

Every Picteus extension must define an implementation class that inherits from the `PicteusExtension` base class provided by the official SDK. This class acts as the core entry point of your extension, overloading lifecycle hooks, subscribing to domain events, handling UI commands, and coordinating interactions with the Picteus application.

The `PicteusExtension` class is available for both supported runtimes:
- **TypeScript / Node.js**: `PicteusExtension` from [`@picteus/extension-sdk`](https://www.npmjs.com/package/@picteus/extension-sdk) ;
- **Python**: `PicteusExtension` from [`picteus-extension-sdk`](https://pypi.org/project/picteus-extension-sdk).

---

## Class hierarchy & instantiation

To create an extension, declare a class that extends `PicteusExtension` and instantiate it in your extension entry point file:

```typescript
// TypeScript entry point (src/main.ts)
import { PicteusExtension } from "@picteus/extension-sdk";

class MyExtension extends PicteusExtension
{
  // Overload lifecycle & event methods here
}

new MyExtension().run().catch((error) =>
{
  console.error(error);
  process.exit(1);
});
```

```python
# Python entry point (main.py)
import asyncio
from picteus_extension_sdk import PicteusExtension

class MyExtension(PicteusExtension):
    # Overload lifecycle & event methods here
    pass

if __name__ == "__main__":
    asyncio.run(MyExtension().run())
```

---

## Lifecycle methods to override

The base class provides several lifecycle methods that your implementation class can override to handle startup, updates, settings changes, and graceful shutdown:

| Method (TypeScript) | Method (Python) | Trigger & Responsibility |
|:---|:---|:---|
| `initialize(): Promise<boolean>` | `async initialize(self) -> bool` | Called at process startup before socket connection. Return `true` to establish the WebSocket connection, or `false` for standalone jobs. |
| `onReady(communicator?: Communicator): Promise<void>` | `async on_ready(self, communicator: Optional[Communicator]) -> None` | Called when the extension socket connects and the server sends `extension.ready`. Ideal for startup logging and initial status announcements. |
| `onTerminate(): Promise<void>` | `async on_terminate(self) -> None` | Called when the process receives `SIGTERM`. Use for resource cleanup — closing database handles, releasing child processes. |
| `onUpgrade(communicator: Communicator, versions: Versions): Promise<void>` | `async on_upgrade(self, communicator: Communicator, versions: Versions) -> None` | Triggered when the extension version is installed or upgraded (`versions.previous` vs `versions.current`). |
| `onSettings(communicator: Communicator, value: SettingsValue): Promise<void>` | `async on_settings(self, communicator: Communicator, value: SettingsValue) -> None` | Triggered whenever the user updates the extension's settings in the UI. |

---

## Event routing & domain handlers

The base class implements `onEvent` / `on_event`, which automatically dispatches incoming events to specialized domain handler methods. You can override individual hook methods directly without needing to write manual event dispatching logic:

### Image lifecycle events

| Method (TypeScript) | Method (Python) | Description |
|:---|:---|:---|
| `onImageCreated(communicator, imageId)` | `on_image_created(self, communicator, image_id)` | Fired when a new image is ingested into the application. |
| `onImageUpdated(communicator, imageId)` | `on_image_updated(self, communicator, image_id)` | Fired when image metadata or image content is updated. |
| `onImageDeleted(communicator, imageId)` | `on_image_deleted(self, communicator, image_id)` | Fired when an image is deleted from the repository. |
| `onImageTagsUpdated(communicator, imageId)` | `on_image_tags_updated(self, communicator, image_id)` | Fired when user or system tags on an image change. |
| `onImageFeaturesUpdated(communicator, imageId)` | `on_image_features_updated(self, communicator, image_id)` | Fired when extracted image features are modified. |

### Computation & AI capabilities

| Method (TypeScript) | Method (Python) | Description |
|:---|:---|:---|
| `onComputeImageTags(communicator, imageId)` | `on_compute_image_tags(self, communicator, image_id)` | Triggered to generate tags for an image. |
| `onComputeImageFeatures(communicator, imageId)` | `on_compute_image_features(self, communicator, image_id)` | Triggered to extract structured features or metadata for an image. |
| `onComputeImageEmbeddings(communicator, imageId)` | `on_compute_image_embeddings(self, communicator, image_id)` | Triggered to compute vector embeddings for similarity search. |
| `onComputeTextEmbeddings(communicator, text)` | `on_compute_text_embeddings(self, communicator, text)` | Triggered to compute text embeddings — returns `number[]` / `list[float]`. |

### Command execution handlers

| Method (TypeScript) | Method (Python) | Description |
|:---|:---|:---|
| `onImagesCommand(communicator, commandId, imageIds, parameters)` | `on_images_command(self, communicator, command_id, image_ids, parameters)` | Triggered when a user executes a command on one or more selected images. |
| `onProcessCommand(communicator, commandId, parameters)` | `on_process_command(self, communicator, command_id, parameters)` | Triggered when a user executes a global process-level command. |

---

## Helper APIs & utilities

The base class provides several static and instance helper methods to simplify common operations:

- `PicteusExtension.getManifest()` / `PicteusExtension.get_manifest()`: reads and parses the current `manifest.json` ;
- `PicteusExtension.getSdkVersion()` / `PicteusExtension.get_sdk_version()`: returns the SDK version string ;
- `PicteusExtension.getExtensionHomeDirectoryPath()` / `PicteusExtension.get_extension_home_directory_path()`: returns the extension's working root path ;
- `PicteusExtension.getCacheDirectoryPath()` / `PicteusExtension.get_cache_directory_path()`: returns the path to the `.cache` directory ;
- `this.getSettings()` / `self.get_settings()`: retrieves the current persistent user settings for this extension ;
- `this.logger` / `self.logger`: process logger with leveled logging (`debug`, `info`, `warn`, `error`).

---

## Error handling

The SDK provides specific error types that your extension can throw to communicate issues back to the application:

- **`CommandError`**: if an error occurs during `onImagesCommand` or `onProcessCommand`, throw a `CommandError`. The SDK will catch it and display an error toast notification to the user in the UI automatically ;
- **`InstructionReturnedError`**: thrown when an intent launched via `communicator.launchIntent` is canceled by the user (`reason: InstructionReturnedErrorCause.Cancel`) or rejected due to a back-end error (`reason: InstructionReturnedErrorCause.Error`) ;
- **`ApiCallError`**: thrown when a REST API call to the back-end returns an HTTP status $\ge 400$.
