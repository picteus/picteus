# Manifest

Every extension must include a `manifest.json` file in its root directory. This manifest acts as the formal contract between the application and the extension, defining metadata, required runtimes, execution instructions, event subscriptions, registered commands, settings schemas, and user interface elements.

---

## Manifest schema contract

The extension identifier declared through the `id` property must be unique with regard to all already installed extensions. If you attempt to install an extension with an `id` that is already registered, the installation will fail.

> [!CAUTION]
> **Strict JSON Schema compliance required**
> : the `manifest.json` file is strictly validated against the Picteus manifest schema, accessible online at https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json, which should be specified through the `$schema` property. If any property fails validation — invalid types, missing required fields, illegal characters, or incorrect regex patterns —, **the server will reject the manifest and the extension will not start.**

---

## Key manifest sections

Here is an overview of the manifest structure:

```json
{
  "$schema": "https://picteus.github.io/picteus/jsonschema/manifest-v2.schema.json",
  "id": "my-extension",
  "version": "1.0.0",
  "name": "My Extension Name",
  "description": "A clear description of what the extension does.",
  "categories": ["enrichment", "utility"],
  "runtimes": [
    {
      "environment": "node"
    }
  ],
  "instructions": [
    {
      "execution": {
        "executable": "${node}",
        "arguments": ["./dist/main.js"]
      },
      "events": [
        "process.runCommand",
        "image.created",
        "image.runCommand"
      ],
      "capabilities": [
        { "id": "image.tags" },
        { "id": "image.features" }
      ],
      "throttlingPolicies": [
        {
          "events": ["image.created"],
          "durationInMilliseconds": 100,
          "maximumCount": 10
        }
      ],
      "commands": [
        {
          "id": "myImageCommand",
          "on": {
            "entity": "Images",
            "withTags": ["featured"]
          },
          "parameters": {
            "type": "object",
            "properties": {
              "mode": {
                "type": "string",
                "enum": ["fast", "quality"],
                "default": "fast"
              }
            },
            "required": ["mode"]
          },
          "specifications": [
            {
              "locale": "en",
              "label": "Process",
              "name": "Process Images",
              "description": "Applies custom processing to the selected images."
            }
          ],
          "ui": {
            "iconUri": "/ui/icons/process.svg"
          }
        }
      ]
    }
  ],
  "settings": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Third-party service API key."
      }
    }
  },
  "ui": {
    "elements": [
      {
        "id": "mainSidebar",
        "integration": {
          "anchor": "sidebar",
          "isExternal": false
        },
        "url": "/ui/sidebar.html"
      }
    ]
  }
}
```

### Manifest properties breakdown

- **`id`** *(required, string, 1-32 chars, regex: `^[a-z0-9A-Z-_.]{1,32}$`)*: the unique extension identifier — must be strictly unique among installed extensions (installation fails if the `id` is already registered) ;
- **`version`** *(required, SemVer string)*: the semantic version (e.g. `1.0.0`) ;
- **`name`** *(required, string)*: display name in the application extension manager ;
- **`description`** *(required, string)*: summary of extension features ;
- **`categories`** *(required, array)*: categorization (`capture`, `generation`, `enrichment`, `integration`, `utility`, `other`) ;
- **`runtimes`** *(required, array)*: execution environments (`"node"` or `"python"`) ;
- **`instructions`** *(required, array)*: execution directives:
  - **`execution`**: defines how the back-end starts the extension process (`executable` with `${node}` / `${python}` macros, and `arguments`) ;
  - **`events`**: subscribed event topics (e.g. `image.created`, `image.updated`, `image.deleted`, `image.runCommand`, `process.runCommand`, `text.computeEmbeddings`) ;
  - **`capabilities`**: declared feature capabilities (`image.features`, `image.embeddings`, `image.tags`, `text.embeddings`) ;
  - **`throttlingPolicies`**: rate limits defining `durationInMilliseconds` and `maximumCount` for specified events ;
  - **`commands`**: action commands registered in the UI:
    - `id`: identifier sent to `onImagesCommand` or `onProcessCommand` ;
    - `on`: scope where the command appears (`entity`: `"Process"`, `"Images"`, or `"Image"`, optional `withTags` filter) ;
    - `parameters`: JSON Schema defining the form presented to the user when triggering the command ;
    - `specifications`: localized labels, titles, and descriptions ;
    - `ui`: command labels and icon URI.
- **`settings`** *(required, object)*: JSON Schema for global extension configuration ;
- **`ui`** *(optional, object)*: pre-registered UI fragments (`sidebar`, `window`, `imageDetail`).
