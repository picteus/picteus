# Settings

Global application settings can be read and updated through these endpoints:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/settings/get` | Gets all application settings. |
| `PUT` | `/settings/set` | Replaces or updates application settings. |

The request and response use the `ApplicationSettings` schema defined in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).
