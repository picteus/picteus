# API secrets

API secrets provide scoped credentials for programmatic access.

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `POST` | `/apiSecret/create` | Creates an API secret. |
| `GET` | `/apiSecret/list` | Lists API secrets. |
| `GET` | `/apiSecret/{id}/get` | Gets an API secret. |
| `DELETE` | `/apiSecret/{id}/delete` | Revokes an API secret. |

Secret values and permission policies are returned according to the security rules in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).
