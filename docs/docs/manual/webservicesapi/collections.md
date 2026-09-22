# Collections

Collections store reusable image search definitions and expose the following endpoints:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `POST` | `/collection/create` | Creates a collection. |
| `GET` | `/collection/list` | Lists collections. |
| `GET` | `/collection/{id}/get` | Gets a collection. |
| `PUT` | `/collection/{id}/update` | Updates a collection. |
| `DELETE` | `/collection/{id}/delete` | Deletes a collection. |

Request and response schemas, collection filters, and security requirements are defined in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).
