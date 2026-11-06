# Marketplace

The marketplace endpoints let clients discover, inspect, install, and update prebuilt extensions available to the Picteus installation. They are separate from the [installed-extension endpoints](extensions.md), which manage extensions after installation.

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/marketplace/list` | Lists available extensions, optionally filtered by `search` and `category`. |
| `GET` | `/marketplace/{id}/get` | Gets an extension's manifest, icon, and optional manual. |
| `POST` | `/marketplace/{id}/install?state={state}` | Installs an available extension in the requested state. |
| `PUT` | `/marketplace/{id}/update?state={state}` | Updates an installed extension; `state` is optional. |

## Listing and inspecting extensions

`GET /marketplace/list` returns the extensions that match the supplied filters:

- `search` is a case-insensitive substring search across the extension identifier, name, and description.
- `category` accepts one or more extension categories: `capture`, `generation`, `enrichment`, `integration`, `utility`, or `other`. When multiple categories are supplied, an extension is included if it belongs to any of them.

Results include each extension's manifest and, when available, its icon as an SVG or PNG data URI. Use `GET /marketplace/{id}/get` to retrieve the full details, including the optional manual instructions.

## Installing and updating

To install an extension, call `POST /marketplace/{id}/install` with the required `state` query parameter set to `enabled` or `paused`. The response contains the installed extension.

To update an extension, call `PUT /marketplace/{id}/update`. The extension must already be installed, and the marketplace version must be newer than the installed version. The optional `state` parameter sets the extension's state after the update; if omitted, the current state is preserved.

Listing and inspecting marketplace items require the `marketplace:read` API scope. Installing and updating require `marketplace:write`.
