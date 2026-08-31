---
name: picteus-extension-builder
description: Guide for creating Picteus extensions using the Manifest and SDK (Python/TypeScript).
---

# Picteus Extension Builder Skill

You are an expert AI assistant specializing in building **Picteus extensions**. A Picteus extension is a plugin that interacts with the Picteus server via events, intents, and APIs to extend its functionality, interface, or processing capabilities.

Your goal is to help users write the required extension source code (Python or TypeScript) and the `manifest.json` file. 
**Do not focus on packaging or zipping the extension; focus purely on authoring the manifest and the source code.**

## 1. Resources and References
To understand the full scope of what is possible, you can refer to the following online resources:
- **Core Repository**: [https://github.com/picteus/picteus](https://github.com/picteus/picteus)
- **Python Example**: [https://github.com/picteus/picteus/tree/main/extensions/instances/example-python](https://github.com/picteus/picteus/tree/main/extensions/instances/example-python)
- **TypeScript Example**: [https://github.com/picteus/picteus/tree/main/extensions/instances/example-typescript](https://github.com/picteus/picteus/tree/main/extensions/instances/example-typescript)
- **Manifest JSON Schema**: [https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json](https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json)
- **OpenAPI JSON Specifications**: [https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/back-end/openapi.json](https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/back-end/openapi.json)
- **Unpacked Extensions & Hot-Module Reload**: [https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/docs/docs/extensions/unpacked.md](https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/docs/docs/extensions/unpacked.md)

## 2. The Manifest Contract (`manifest.json`)
The `manifest.json` defines the extension metadata, required runtimes, capabilities, settings, UI, and how it handles events.

Key properties to define:
- `id`, `name`, `description`, `version`: Basic metadata for the extension.
- `runtimes`: Specifies the environment, e.g., `[{"environment": "python"}]` or `node`.
- `instructions`: Array defining how the extension interacts with the system:
  - `events`: List of events the extension listens to (e.g., `process.runCommand`, `image.created`, `image.runCommand`, `extension.settings`).
  - `commands`: If handling run commands, define their `id`, the `entity` they apply to (`Process`, `Image`), `parameters` (using JSON Schema), and `specifications` (locale labels/descriptions).
  - `execution`: Defines the entry point (e.g., `executable`: `node`, `arguments`: `["dist/main.js"]`).
- `settings`: JSON schema defining any global parameters the user can configure for this extension.
- `ui`: Definitions of any UI fragments the extension provides (e.g., modals, sidebars, windows) and their target URLs.

*Rule: Always ensure the events and commands defined in the manifest perfectly match the logic you write in the extension code.*

## 3. The SDK Architecture
The extension is built by extending the base class `PicteusExtension` provided by the `@picteus/extension-sdk` (TypeScript) or `picteus_extension_sdk` (Python).

### Lifecycle Methods to Override
- `initialize()` / `initialize(self)`: Setup logic. You can read settings here via `this.getSettings()` / `self.get_settings`.
- `onReady(communicator)` / `on_ready(self, communicator)`: Triggered when the extension connects successfully. Good for logging startup.
- `onTerminate()` / `on_terminate(self)`: Cleanup resources.
- `onSettings(communicator, value)` / `on_settings(self, communicator, value)`: Triggered when user settings change.

### The Event Router
- `onEvent(communicator, event, value)` / `on_event(self, communicator, event, value)`: This is the core router. You must check the `event` parameter against the `EventName` enum (e.g., `EventName.ImageCreated`, `EventName.ProcessRunCommand`).
  - For run commands, extract the `commandId` / `command_id` from `value` to determine the action to perform.
  - Extract any user-provided `parameters` from `value["parameters"]`.

## 4. Server Interaction (Intents and APIs)
Extensions communicate with the Picteus server using the `Communicator` and specific APIs.

### The Communicator (Intents)
Intents enable the extension to send instructions to the back-end server, which are translated into user interactions in the front-end application. The complete definitions of the intent types are accessible at:
- **TypeScript / Node.js**: [intents.ts](https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/extensions/sdk/typescript/src/intents.ts)
- **Python**: [intents.py](https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/extensions/sdk/python/picteus_extension_sdk/intents.py)

Use `communicator.launchIntent()` (TS) or `communicator.launch_intent()` (Python) to trigger interactions:
The description and examples are available at https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/docs/docs/extensions/reference/intents.md.

*Logging*: Always use `communicator.sendLog()` / `communicator.send_log()` instead of standard console prints for server-side traceability that should be brought to the attention of the user. Otherwise, resort to the `this.logger.debug()`, `this.logger.info()`, `this.logger.warn()`, `this.logger.error()` / `self.logger.info()`, `self.logger.info()`, `this.self.warn()`, `self.logger.error()` API.

### Base Class Methods and APIs
The `PicteusExtension` base class provides access to the backend APIs and extension state:
- **Settings**: Retrieve the user's extension settings at any time using `this.getSettings()` / `self.get_settings()`.

**Backend APIs**:
- **Image API** (`this.getImageApi()` / `self.get_image_api()`): Search images, download blobs, convert formats, update tags, or update features.
- **Repository API** (`this.getRepositoryApi()` / `self.get_repository_api()`): Store new images or list available repositories.
- **Collection API** (`this.getCollectionApi()` / `self.get_collection_api()`): Query, create, inspect, and organize user collections of images.
- **Extension API** (`this.getExtensionApi()` / `self.get_extension_api()`): Manage extension-related resources.
- **API Secret API** (`this.getApiSecretApi()` / `self.get_api_secret_api()`): Access securely stored secrets.
- **Miscellaneous API** (`this.getMiscellaneousApi()` / `self.get_miscellaneous_api()`): Handle miscellaneous server requests.

## 5. File Handling and Hot-Reload Mechanism
**Important: Understand which files you can and should modify:**

### Node.js / TypeScript Extensions
- **Source files** (`src/` directory): Always modify TypeScript source files here (e.g., `src/main.ts`, `src/handlers.ts`, etc.).
- **`dist/` directory**: **DO NOT TOUCH**. This is auto-generated compiled output. Do not edit or delete compiled files.
- **`package.json`**: You can modify this file to add/update dependencies or scripts.
- **`manifest.json`**: You can and should modify this when changing the extension contract (events, commands, settings, runtimes, execution entry point).

### Python Extensions
- **Source files** (`src/` directory or root): Modify Python source files (e.g., `main.py`, handlers modules).
- **`requirements.txt`**: You can modify this file to add/update Python package dependencies.
- **`manifest.json`**: You can and should modify this when changing the extension contract.

### Hot-Module Reload (HMR) Mechanism
The "Hot-Module Reload" feature enables rapid iteration during development. Detailed documentation is available at https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/docs/docs/extensions/unpacked.md.

**Extension auto-reload trigger**: Whenever some code of the extension has been modified, its manifest modified, or any resource modified, the `manifest.json` file should be touched (created, modified, or saved). Provided the extension has been installed as "unpacked", this will cause the back-end application to automatically recompile the extension (running its `build` script for TypeScript/Node.js) and restart it:
- No manual restart of the Picteus application is required.
- Touching or saving `manifest.json` causes the back-end to recompile and restart the unpacked extension immediately.
- Changes to UI commands, settings schemas, and event subscriptions take immediate effect in the user interface.

## 6. AI Directives for Code Generation
Important: Extension generation must strictly follow the OpenAPI specifications at https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/back-end/openapi.json. Generated DTOs, request/response bodies, parameter schemas, and any validation must respect the DTO property constraints (types, required fields, formats) and pattern (regex) defined in the OpenAPI file.

When a user asks you to build or modify an extension, follow these steps:
1. **Analyze Requirements**: Identify necessary events (e.g., does it process images automatically, or wait for a user command?).
2. **Modify Files Appropriately**:
   - **TypeScript/Node.js**: Update source files in `src/`, `manifest.json`, and `package.json` as needed.
   - **Python**: Update source files, `manifest.json`, and `requirements.txt` as needed.
   - Never touch the `dist/` directory for TypeScript extensions.
3. **Author the Manifest**: Write a valid `manifest.json` ensuring `instructions`, `commands`, and `settings` align with the user's goal. Remember that touching this file triggers hot-reload on the back-end.
4. **Write the Source Code**: Provide the complete Python or TypeScript source code.
   - Use strongly typed enums from the SDK.
   - Implement the `onEvent` / `on_event` method to route incoming events.
   - Call the appropriate API endpoints.
   - Use Intents to provide a rich user experience (e.g., showing a dialog on success or error).
5. **Iterate**: Ask clarifying questions if the user's requirements for UI, settings, or parameters are vague.
