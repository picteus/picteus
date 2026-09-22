# Repositories

Repository endpoints manage image storage locations, synchronization, monitoring, and repository-wide facet discovery. The complete schemas and security requirements are defined in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/repository/list` | Lists repositories. |
| `POST` | `/repository/create` | Creates a repository. |
| `PUT` | `/repository/ensure` | Creates a repository if it does not exist. |
| `GET` | `/repository/{id}/get` | Gets a repository. |
| `PUT` | `/repository/{id}/update` | Updates repository configuration. |
| `PUT` | `/repository/{id}/renameImage` | Renames an image file. |
| `POST` | `/repository/{id}/storeImage` | Stores an image in a repository. |
| `PUT` | `/repository/{id}/synchronize` | Synchronizes a repository. |
| `PUT` | `/repository/{id}/watch` | Starts or stops filesystem watching. |
| `PUT` | `/repository/startOrStop` | Starts or stops repositories. |
| `GET` | `/repository/activities` | Reports repository activities. |
| `DELETE` | `/repository/{id}/delete` | Deletes a repository. |
| `GET` | `/repository/getImageByUrl` | Resolves an image from its URL. |
| `GET` | `/repository/tags` | Lists repository tags. |
| `GET` | `/repository/featureNames` | Lists repository feature names. |
| `GET` | `/repository/embeddingsNames` | Lists repository embedding names. |

The OpenAPI specification is authoritative for parameters, payloads, permissions, and response schemas. See [Images](images.md) for image-level enrichment endpoints.
