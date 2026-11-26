# Repositories

Repository endpoints manage image storage locations, synchronization, monitoring, and repository-wide facet discovery. The complete schemas and security requirements are defined in [`back-end/openapi.json`](https://github.com/picteus/picteus/blob/main/back-end/openapi.json).

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/repository/list` | Lists repositories. |
| `POST` | `/repository/create` | Creates a repository. |
| `PUT` | `/repository/ensure` | Creates an extension-attached repository if it does not exist. |
| `GET` | `/repository/{id}/get` | Gets a repository. |
| `PUT` | `/repository/{id}/update` | Updates repository configuration. |
| `PUT` | `/repository/{id}/renameImage` | Renames an image file. |
| `POST` | `/repository/{id}/storeImage` | Stores an image in a repository. |
| `PUT` | `/repository/{id}/synchronize` | Synchronizes a repository. |
| `PUT` | `/repository/{id}/setMode` | Changes a repository's operating mode. |
| `PUT` | `/repository/startOrStop` | Starts or stops repositories. |
| `GET` | `/repository/activities` | Reports repository activities. |
| `DELETE` | `/repository/{id}/delete` | Deletes a repository. |
| `GET` | `/repository/getImageByUrl` | Resolves an image from its URL. |
| `GET` | `/repository/tags` | Lists repository tags. |
| `GET` | `/repository/featureNames` | Lists repository feature names. |
| `GET` | `/repository/embeddingsNames` | Lists repository embedding names. |

## Repository modes

A repository has one of three operating modes:

| Mode | Behavior |
|:---|:---|
| `disabled` | The repository is excluded from search and capability processing. |
| `enabled` | The repository is available and is synchronized once when its configuration is applied. |
| `watching` | The repository is available and its file location is monitored for ongoing changes. |

Use `PUT /repository/{id}/setMode` to change the mode. Switching to `disabled` stops repository operations; switching
to `enabled` or `watching` starts synchronization. The `watching` mode is supported for file repositories.

## Extension-attached repositories

Extensions can create or retrieve a dedicated repository with `PUT /repository/ensure`. The request identifies the
extension with `extensionId`, and the repository stores that association. Repository names and comments remain user-
visible configuration fields. The location type is `file`, and the operating mode is selected explicitly with `mode`.

The OpenAPI specification is authoritative for parameters, payloads, permissions, and response schemas. See [Images](images.md) for image-level enrichment endpoints.
