# Extensions

Extension endpoints install, build, compile, configure, run, and remove Picteus extensions:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/extension/list` | Lists installed extensions. |
| `GET` | `/extension/{id}/get` | Gets an extension. |
| `POST` | `/extension/install` | Installs an extension archive. |
| `PUT` | `/extension/{id}/installChromeExtension` | Installs an extension browser component. |
| `DELETE` | `/extension/{id}/uninstall` | Uninstalls an extension. |
| `PUT` | `/extension/{id}/changeState` | Changes an extension state. |
| `PUT` | `/extension/{id}/update` | Updates an extension. |
| `PUT` | `/extension/{id}/compile` | Compiles an extension. |
| `PUT` | `/extension/build` | Builds an extension. |
| `POST` | `/extension/generate` | Generates extension scaffolding. |
| `GET` | `/extension/getConfiguration` | Gets extension configuration. |
| `GET` | `/extension/{id}/getSettings` | Gets extension settings. |
| `PUT` | `/extension/{id}/setSettings` | Sets extension settings. |
| `PUT` | `/extension/{id}/resetSettings` | Resets extension settings. |
| `GET` | `/extension/listAiModels` | Lists AI models declared by installed extensions. |
| `PUT` | `/extension/{id}/setAiModels` | Sets the AI models declared by an extension. |
| `GET` | `/extension/{id}/getCaptionInstructions` | Gets the extension's caption instructions. |
| `PUT` | `/extension/{id}/setCaptionInstructions` | Sets the extension's caption instructions. |
| `GET` | `/extension/{id}/getEligibleTagsInstructions` | Gets the extension's eligible-tag instructions. |
| `PUT` | `/extension/{id}/setEligibleTagsInstructions` | Sets the extension's eligible-tag instructions. |
| `GET` | `/extension/{id}/getEmbeddingInstructions` | Gets the extension's embedding instructions. |
| `PUT` | `/extension/{id}/setEmbeddingInstructions` | Sets the extension's embedding instructions. |
| `GET` | `/extension/activities` | Reports extension activities. |
| `PUT` | `/extension/{id}/runImageCommand` | Runs an extension command on images. |
| `PUT` | `/extension/{id}/runProcessCommand` | Runs an extension command for the process. |
| `PUT` | `/extension/{id}/synchronize` | Synchronizes images through an extension. |

See the [extensions documentation](../../extensions/guide.md) for extension authoring concepts. Endpoint contracts are defined in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).

## AI models and capability instructions

Extensions declare AI models with the modalities they support. The extension API can list those models and replace an
extension's declarations. For an extension that supports captions, eligible tags, or embeddings, the corresponding
instruction endpoints get or replace its configured model instructions. Instructions include the selected model and
whether it is enabled and should run automatically during image indexing. Caption and eligible-tag instructions also
include their question; eligible-tag instructions include the candidate tags.

For embedding behavior and model modalities, see [Embeddings](../embedding.md#model-instructions). Endpoint payloads and scopes are defined in the [generated API reference](reference/picteus).

## Extension synchronization

`PUT /extension/{id}/synchronize` asks the enabled extension to process library images for its declared image
capabilities. The back-end schedules image capability events for images that do not yet have results from that
extension. See [Computing and updating enrichment facets](../facets.md#computing-and-updating-enrichment-facets) for
how the extension computes and writes those results.

## Installing and updating extensions

Picteus provides two special web services for extending the application runtime:

- `POST /extension/install` installs an extension;
- `PUT /extension/{id}/update` updates an installed extension.

These services enable the application runtime to be augmented with new capabilities, integrations, processing workflows, and user-interface features without modifying the Picteus core. By allowing extensions to be installed and updated through the back-end API, they provide deep flexibility for adapting the application to different tools, automation requirements, and domain-specific workflows.
