# Overview

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

| Platform | Extension SDK Package |
|:---|:---|
| **Node.js / TypeScript** | [`@picteus/extension-sdk`](https://www.npmjs.com/package/@picteus/extension-sdk) |
| **Python** | [`picteus-extension-sdk`](https://pypi.org/project/picteus-extension-sdk) |

### Embedded back-end OpenAPI client

Each SDK embeds the corresponding typed back-end web services client library, see 
[webservicesapi.md](../../manual/webservicesapi.md) for comprehensive information about the underlying web services.

---

## The extension manifest — `manifest.json`

Every extension must include a `manifest.json` file in its root directory. This manifest acts as the formal contract between the application and the extension, declaring metadata, runtimes, instructions, event subscriptions, commands, settings schema, and user interface elements.

See the dedicated [Manifest](./manifest.md) reference documentation for the complete manifest schema, key sections, and detailed properties breakdown.

---

## The `PicteusExtension` base class

Every Picteus extension must define an implementation class inheriting from the `PicteusExtension` base class provided by the official SDK. See the dedicated [Class](./class.md) reference documentation for the full class hierarchy, lifecycle methods, event routing, helper APIs, and error handling.

---

## Interacting with the back-end REST API

Picteus extension SDKs embed the entirety of the back-end REST API, completely generated from OpenAPI specifications. When an extension runs, the `PicteusExtension` base class automatically initializes all REST clients with the server's base URL and authentication credentials, requiring zero manual HTTP configuration.

See the dedicated [API](./api.md) reference documentation for the full list of available API clients, capabilities, and usage examples in TypeScript and Python.

---

## The "intents" system

### Understanding "intents"

**Intents** are asynchronous requests initiated by an extension to interact with the Picteus front-end UI or back-end server services. They are callable from the provided `communicator` variable in various built-in callback methods. When an extension calls `communicator.launchIntent(intent)` (or `communicator.launch_intent(intent)`), the SDK sends the intent to the server — through a WebSocket — and waits for the user's action or server response before resolving.

```
┌──────────────────┐               launchIntent(intent)              ┌─────────────────┐
│                  ├─────────────────────────────────────────────────►                 │
│    Extension     │                                                 │   Picteus UI    │
│                  │◄────────────────────────────────────────────────┤                 │
└──────────────────┘     resolves with user input / return value     └─────────────────┘
```

### Forms and user interactions

Intents enable an extension to initiate rich, interactive experiences with the user directly in the UI without having to author custom front-end code. From the end-user's perspective, intents cover a wide range of interactions:

- **modal dialogs**: displaying confirmation prompts, questions, warning notices, or error messages ;
- **dynamic input forms**: presenting form dialogs generated on the fly from schemas to collect user input, parameters, or configurations ;
- **custom UI panels**: rendering embedded web views or custom HTML frames in modal windows, sidebar panels, or detail views ;
- **image galleries**: presenting image grids and result cards for interactive visual inspection ;
- **notifications**: popping up transient toast messages or sending OS-level notifications to the notification center ;
- **application navigation**: guiding the user to specific views such as an image detail page, a repository, extension settings, or opening external URLs in the default browser ;
- **native file dialogues**: opening native OS file picker prompts to let the user select a file to import or choose a save destination for an export ;
- **embedded web application bundles**: serving rich interactive web applications hosted seamlessly inside the interface.

For full technical specifications, available intent interfaces, parameters, and complete TypeScript and Python code examples, refer to the [Intents documentation](./intents.md).


---

## Files structure

All resources of an extension must be laid out in a dedicated file system directory, which contains at its root the `manifest.json` file.

### Common files

The following files may reside at the root of any extension directory, regardless of the programming language:

- **`manifest.json`** *(mandatory)*: defines all contracts between the extension and the application (metadata, runtimes, instructions, commands, settings schema, UI elements). See the dedicated [Manifest](./manifest.md) reference for full details on its schema and properties.
- **`icon.svg` or `icon.png`** *(optional)*: the visual icon representing the extension. SVG (`icon.svg`) should be preferred over PNG (`icon.png`). When present, the UI uses this icon across the application to display any activity, notification, or menu entry related to the extension.
- **`MANUAL.md`** *(optional)*: provides rich Markdown documentation rendered directly within the application's user interface — in the extension detail page, command dialogs, and settings modal. See the dedicated [Manual](./manual.md) reference for full details on its role and structure.

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
