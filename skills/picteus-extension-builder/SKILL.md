---
name: picteus-extension-builder
description: Create or modify Picteus extensions (manifest.json, TypeScript @picteus/extension-sdk or Python picteus-extension-sdk, and MANUAL.md) for image processing, tagging, AI captioning, feature extraction, vector embeddings, image generation, interactive UI intents, and ViewKit presentations. Use whenever building, editing, or debugging a Picteus extension or its manifest.json.
---

# Picteus extension builder skill

You are an AI assistant specializing in building **Picteus extensions** in **TypeScript (Node.js)** or **Python**.

To build a Picteus extension, two components are required:
1. A **`manifest.json` file** that defines all contracts between the extension and the application — metadata, runtimes, execution instructions, subscribed events, capabilities, commands, settings schema, and UI integrations ;
2. An **implementation class** written in TypeScript or Python that inherits from the `PicteusExtension` base class provided by the official SDK — [`@picteus/extension-sdk`](https://www.npmjs.com/package/@picteus/extension-sdk) for Node.js/TypeScript or [`picteus-extension-sdk`](https://pypi.org/project/picteus-extension-sdk) for Python. Each SDK directly embeds the full back-end REST API client generated from OpenAPI specifications — [`@picteus/ws-client`](https://www.npmjs.com/package/@picteus/ws-client) and [`picteus-ws-client`](https://pypi.org/project/picteus-ws-client/) — to interact with images, repositories, collections, tags, features, attachments, and secrets.

Focus on authoring valid, idiomatic extension source code (`src/main.ts` or `main.py`), `manifest.json`, dependency manifests (`package.json` and `tsconfig.json`, or `requirements.txt`), and `MANUAL.md`.

---

## 1. Bundled reference documentation

This skill bundles the complete Picteus extension reference documentation in `./references/`. Consult the relevant local reference file before writing or modifying contracts rather than duplicating or guessing schemas:

- **[`references/overview.md`](./references/overview.md)**: extension anatomy, directory structure, exact `package.json`, `tsconfig.json`, `requirements.txt`, `src/main.ts`, and `main.py` starter templates, and best practices ;
- **[`references/manifest.md`](./references/manifest.md)**: complete `manifest-v5.schema.json` contract, required properties, `execution` macros (`${node}`, `${venvPython}`), subscribed `events`, `capabilities` — including `details` markers —, `throttlingPolicies`, `commands`, `settings`, and `ui` ;
- **[`references/class.md`](./references/class.md)**: `PicteusExtension` lifecycle methods, domain event handler hooks, `Communicator` logging and entity scoping, helper APIs, Python `run_in_executor`, and error types (`CommandError`, `InstructionReturnedError`, `ApiCallError`) ;
- **[`references/api.md`](./references/api.md)**: all 7 embedded OpenAPI REST client getters (`getImageApi`, `getRepositoryApi`, `getCollectionApi`, `getExtensionApi`, `getApiSecretApi`, `getImageAttachmentApi`, `getMiscellaneousApi`) with TypeScript and Python examples for searching, downloading and converting images, storing generated images, and setting tags and features ;
- **[`references/intents.md`](./references/intents.md)**: complete guide and generated TypeSpec model reference for front-end and back-end intents (`DialogIntent`, `FormIntent`, `UiIntent`, `ImagesIntent`, `ToastIntent`, `NotificationIntent`, `ShowIntent`, `OpenBrowserIntent`, `ActionIntent`, `ProcessCommandIntent`, `ReadFileIntent`, `WriteFileIntent`, `ServeBundleIntent`) ;
- **[`references/viewkit.md`](./references/viewkit.md)**: complete guide and generated TypeSpec model reference for "ViewKit" (`UiContainer` with `schemaVersion: "1.0"`), used to render visual UI features (`format: ImageFeatureFormat.Ui`) on image detail pages ;
- **[`references/manual.md`](./references/manual.md)**: structure and headings (`# Summary`, `# Prerequisites`, `# Settings`, `# Commands` and `## <commandId>`) for `MANUAL.md`, rendered contextually in the Picteus UI ;
- **[`references/unpacked.md`](./references/unpacked.md)**: unpacked extension directory rules (`<userHomeDirectory>/picteus/<id>`) and the Hot-Reloading Module (HMR) mechanism triggered by touching `manifest.json`.

> [!TIP]
> **Inspecting types locally**: if `node_modules/@picteus/extension-sdk` — for TypeScript — or `.venv` with `picteus_extension_sdk` and `picteus_ws_client` — for Python — is installed in the project directory, inspect its `.d.ts` or `.py` files directly for exact DTO and enum definitions.

---

## 2. Use-case to manifest and hook mapping

Do **not** override `onEvent` / `on_event` manually. The `PicteusExtension` base class automatically routes incoming events to dedicated domain methods. Always pair the manifest declaration with its corresponding hook method:

| Goal & use case | `instructions[].events` in `manifest.json` | `instructions[].capabilities` in `manifest.json` | Method to override (TypeScript / Python) |
|:---|:---|:---|:---|
| **Startup lifecycle** — always include | `"process.started"` | — | `initialize()`, `onReady(communicator)`, `onUpgrade(communicator, versions)` / `on_ready`, `on_upgrade` |
| **React to settings changes** | *(handled automatically)* | — | `onSettings(communicator, value)` / `on_settings(self, communicator, value)` |
| **Command on selected images** — `on.entity`: `"Images"` or `"Image"` | `"image.runCommand"` | — | `onImagesCommand(communicator, commandId, imageIds, parameters)` / `on_images_command(self, communicator, command_id, image_ids, parameters)` |
| **Global process command** — `on.entity`: `"Process"` | `"process.runCommand"` | — | `onProcessCommand(communicator, commandId, parameters)` / `on_process_command(self, communicator, command_id, parameters)` |
| **React to image lifecycle** | `"image.created"`, `"image.updated"`, `"image.deleted"`, `"image.tags.updated"`, `"image.features.updated"`, `"image.embeddings.updated"` | — | `onImageCreated`, `onImageUpdated`, `onImageDeleted`, `onImageTagsUpdated`, `onImageFeaturesUpdated`, `onImageEmbeddingsUpdated` — and Python `snake_case` equivalents |
| **Compute image tags** — automatic or on-demand | `"image.computeTags"` | `{ "id": "image.tags" }` | `onComputeImageTags(communicator, imageId)` / `on_compute_image_tags(self, communicator, image_id)` |
| **AI candidate tag selection** — with prompt and model | `"image.computeTags"` | `{ "id": "image.tags", "details": { "eligibleTags": true } }` | `onComputeImageEligibleTags(communicator, imageId, eligibleTags)` / `on_compute_image_eligible_tags(self, communicator, image_id, eligible_tags)` |
| **Compute image features** — metadata or ViewKit UI | `"image.computeFeatures"` | `{ "id": "image.features" }` | `onComputeImageFeatures(communicator, imageId)` / `on_compute_image_features(self, communicator, image_id)` |
| **AI image captioning** — with prompt and model | `"image.computeFeatures"` | `{ "id": "image.features", "details": { "caption": true } }` | `onComputeImageCaptions(communicator, imageId, captions)` / `on_compute_image_captions(self, communicator, image_id, captions)` |
| **Compute image vector embeddings** | `"image.computeEmbeddings"` | `{ "id": "image.embeddings" }` | `onComputeImageEmbeddings(communicator, imageId)` / `on_compute_image_embeddings(self, communicator, image_id)` |
| **Compute text vector embeddings** | `"text.computeEmbeddings"` | `{ "id": "text.embeddings" }` | `onComputeTextEmbeddings(communicator, text): Promise<number[]>` / `on_compute_text_embeddings(self, communicator, text) -> list[float]` |

---

## 3. Critical rules and conventions

### Manifest rules (`manifest.json`)
1. **Schema v5**: always set `"$schema": "https://picteus.github.io/picteus/jsonschema/manifest-v5.schema.json"` ;
2. **Required top-level fields**: `id` — matching regex `^[a-z0-9A-Z-_.]{1,32}$` —, `version` — SemVer —, `name`, `description`, `categories` — non-empty array of `"capture"`, `"generation"`, `"enrichment"`, `"integration"`, `"utility"`, `"other"` —, `runtimes`, `instructions`, and `settings` — use `{"type": "object", "properties": {}}` if the extension has no settings ;
3. **Directory name matching**: for unpacked extensions, the extension directory name **must strictly match `id`** — case-sensitive ;
4. **Execution command**:
   - **Node.js / TypeScript**: `"runtimes": [{ "environment": "node" }]` and `"execution": { "executable": "${node}", "arguments": ["./dist/main.js"] }` ;
   - **Python**: `"runtimes": [{ "environment": "python" }]` and `"execution": { "executable": "${venvPython}", "arguments": ["./main.py"] }`.
5. **Throttling high-frequency events**: whenever subscribing to `image.created`, `image.updated`, `image.computeTags`, `image.computeFeatures`, or `image.computeEmbeddings`, include a `throttlingPolicies` entry in `instructions[]`.

### SDK and coding rules
1. **Descriptive identifiers**: never use single-letter or abbreviated variable names (`i`, `j`, `e`, `x`, `it`, `el`, `req`, `res`, `err`, `ctx`) in generated code or examples — always use full, descriptive domain identifiers (`imageId`, `error`, `summary`, `feature`) ;
2. **Settings retrieval**:
   - **TypeScript**: `await this.getSettings()` is **asynchronous** ;
   - **Python**: `self.get_settings()` is **synchronous**.
3. **Python concurrency**: Python hook methods are `async def`, but the generated `picteus_ws_client` REST API calls and heavy CPU or I/O libraries are synchronous. Offload blocking work with `await self.run_in_executor(callable_function)` so the `asyncio` socket loop does not stall ;
4. **Logging**:
   - Use `communicator.sendLog(message, level, entity?)` / `communicator.send_log(message, level, entity=None)` — where `level` is `"debug" | "info" | "warn" | "error"` — for logs visible to the user in the Picteus UI ;
   - Use `this.logger.{debug,info,warn,error}()` in TypeScript or `self.logger.{debug,info,warning,error}()` in Python — standard `logging.Logger` — for internal process diagnostics.
5. **Error handling**:
   - Throw `new CommandError("...")` / `raise CommandError("...")` inside `onImagesCommand` or `onProcessCommand` when validation or command execution fails — Picteus automatically displays an error toast in the UI ;
   - Catch `InstructionReturnedError` when calling `communicator.launchIntent(...)` if you need to handle user cancellation (`error.reason === InstructionReturnedErrorCause.Cancel`).
6. **AI model registration**: if the extension implements `onComputeImageCaptions` or `onComputeImageEligibleTags`, publish the available AI models to Picteus in `onReady` and `onSettings` via `this.getExtensionApi().extensionSetAiModels({ id: this.extensionId, aiModel: [{ technicalId, name, comment }] })` — or `self.get_extension_api().extension_set_ai_models(...)` in Python ;
7. **Storing generated images and recipes**:
   - Ensure or obtain a target repository via `getRepositoryApi().repositoryEnsure(...)` or `repositoryGet(...)` ;
   - Store the image bytes via `getRepositoryApi().repositoryStoreImage({ id: repositoryId, parentId: sourceImageId, body })` ;
   - Attach generation metadata using `ImageFeatureType.Recipe` — with `format: ImageFeatureFormat.Json` and `schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION` — and visual UI presentation using "ViewKit" — with `format: ImageFeatureFormat.Ui` and `schemaVersion: "1.0"`.

### File rules and Hot-Reloading Module (HMR)
- **Do not edit or delete generated or runtime files**: never touch `dist/` — auto-generated by `npm run build` for TypeScript —, `node_modules/`, `.venv/`, or `parameters.json` — auto-generated at runtime by Picteus with server credentials and `apiKey`, and must never be created or committed ;
- **Use public SDK packages** in new extensions: `"@picteus/extension-sdk": "0.21.0"` in `package.json` or `picteus-extension-sdk == 0.21.0` in `requirements.txt` — only keep `@picteus/internal-extension-sdk` or `picteus-internal-extension-sdk` when modifying a built-in extension inside the Picteus monorepo that already uses it ;
- **Declare packaged files**: in `package.json`, ensure the `"files"` array lists `"dist"`, `"manifest.json"`, `"icon.svg"`, `"MANUAL.md"`, and any `"ui/**/*"` assets ;
- **Triggering HMR**: after modifying source code, `MANUAL.md`, or `manifest.json` in an unpacked extension, **touch or save `manifest.json`** last so the Picteus back-end recompiles — for TypeScript — and restarts the extension automatically.

---

## 4. Step-by-step workflow

1. **Clarify requirements**: determine the target language — TypeScript or Python —, the trigger — image command, process command, automatic on `image.created`, or capability computation —, required user parameters, and global settings ;
2. **Consult `./references/`**:
   - Read [`references/manifest.md`](./references/manifest.md) and [`references/class.md`](./references/class.md) ;
   - Read [`references/api.md`](./references/api.md) when calling back-end endpoints, [`references/intents.md`](./references/intents.md) when launching UI dialogs, forms, or toasts, and [`references/viewkit.md`](./references/viewkit.md) when building `ImageFeatureFormat.Ui` features.
3. **Author or update `manifest.json`**: ensure `id`, `categories`, `runtimes`, `instructions` (`execution`, `events`, `capabilities`, `throttlingPolicies`, `commands`), and `settings` strictly match the v5 contract and the extension code ;
4. **Implement the `PicteusExtension` subclass**: override the specific domain hooks in `src/main.ts` or `main.py` ;
5. **Document in `MANUAL.md`**: following [`references/manual.md`](./references/manual.md), document `# Summary`, `# Prerequisites`, `# Settings`, and each command under `# Commands` and `## <commandId>` ;
6. **Verify and trigger HMR**:
   - For TypeScript, run `npm run build` — if dependencies are installed — to verify there are no compilation errors ;
   - For Python, run `python3 -m py_compile main.py` to verify syntax ;
   - Touch `manifest.json` last so unpacked HMR reloads the extension.
