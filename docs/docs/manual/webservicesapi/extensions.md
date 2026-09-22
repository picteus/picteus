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
| `GET` | `/extension/activities` | Reports extension activities. |
| `PUT` | `/extension/{id}/runImageCommand` | Runs an extension command on images. |
| `PUT` | `/extension/{id}/runProcessCommand` | Runs an extension command for the process. |
| `PUT` | `/extension/{id}/synchronize` | Synchronizes images through an extension. |

See the [extensions documentation](../../extensions/guide.md) for extension authoring concepts. Endpoint contracts are defined in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).

## Installing and updating extensions

Picteus provides two special web services for extending the application runtime:

- `POST /extension/install` installs an extension;
- `PUT /extension/{id}/update` updates an installed extension.

These services enable the application runtime to be augmented with new capabilities, integrations, processing workflows, and user-interface features without modifying the Picteus core. By allowing extensions to be installed and updated through the back-end API, they provide deep flexibility for adapting the application to different tools, automation requirements, and domain-specific workflows.
