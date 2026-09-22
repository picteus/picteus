# Miscellaneous

Miscellaneous endpoints provide service health and runtime configuration information:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/miscellaneous/ping` | Checks that the service is accessible. |
| `GET` | `/miscellaneous/configuration` | Gets application runtime configuration. |

See [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json) for response schemas and security requirements.
