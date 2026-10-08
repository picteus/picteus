# Intents overview

Intents are at the core of Picteus extensibility: they let extensions request user interactions through Picteus-managed
interfaces, without having to implement those interfaces themselves. The range of interactions available through intents
creates opportunities for advanced workflows and, in turn, new features. When a workflow needs a custom interface,
extensions can also provide one through a UI intent.

Intent contracts are defined in [TypeSpec](https://typespec.io) and maintained as the source of truth for intent
definitions, specifications, and documentation. The specification factory also emits their JSON Schema equivalent and
generates the typed Python and TypeScript SDK definitions, which extensions use to construct and submit intents.

> See their
> original ["Intents" TypeSpec source file on GitHub](https://github.com/picteus/picteus/blob/main/shared/specification-factory/src/intents/index.tsp),
> which may be used to understand in details the composition and structure of intents.
>
> See its corresponding
> published ["Intents" JSON Schema](https://picteus.github.io/picteus/jsonschema/intents.schema.json) — its source file
> being located at [
`docs/static/jsonschema/intents.schema.json`](https://raw.githubusercontent.com/picteus/picteus/refs/heads/main/docs/static/jsonschema/intents.schema.json).
>
> See the generated [intent model reference](./models-reference.md) for the structural contract, properties and
> inheritance relationships.

Two types of intents exist: **front-end** and **back-end**. Front-end intents are forwarded to the Picteus UI, while
back-end intents are handled by the server and may delegate to the Electron application for native interactions that the
front-end cannot perform.

## Submitting intents

The TypeScript and Python SDKs each expose a dedicated asynchronous function for submitting an intent:
`communicator.launchIntent(intent)` in TypeScript and `communicator.launch_intent(intent)` in Python. Both functions
submit the intent for validation and routing by the back-end, then await the interaction or operation result, which may
include user input or a server response.

Intent specifications define the same contract in both languages. The SDKs provide language-specific types and models
for constructing the payload, but the intent's fields, requirements, and behavior are the same.

## User Interface (UI) & interaction intents

### 1. `DialogIntent` (`dialog`)

Displays modal dialog boxes: confirmation questions, information messages, error notices, or dialogs containing embedded
frames.

````carousel
```typescript
// TypeScript example
import { IntentDialogType } from "@picteus/extension-sdk";

const confirmed: boolean = await communicator.launchIntent<boolean>({
  dialog:
    {
      type: IntentDialogType.Question,
      size: "m",
      title: "Confirm action",
      description: "Are you sure you want to proceed with this operation?",
      details: "This operation will apply irreversible changes.",
      buttons: { yes: "Yes, proceed", no: "Cancel" }
    }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import DialogIntent, IntentDialog, IntentDialogType, IntentDialogButtons

confirmed = await communicator.launch_intent(DialogIntent(
    dialog=IntentDialog(
        type=IntentDialogType.QUESTION,
        size="m",
        title="Confirm action",
        description="Are you sure you want to proceed with this operation?",
        details="This operation will apply irreversible changes.",
        buttons=IntentDialogButtons(yes="Yes, proceed", no="Cancel")
    )
))
```
````

### 2. `FormIntent` (`form`)
Presents a dynamically generated form based on JSON Schema and returns the user's filled inputs as an object/dictionary.

````carousel
```typescript
// TypeScript example
const userInput: Record<string, unknown> = await communicator.launchIntent<Record<string, unknown>>({
  form:
    {
      parameters: {
        type: "object",
        properties: {
          targetFormat: {
            type: "string",
            title: "Target format",
            enum: ["jpeg", "png", "webp"],
            default: "webp"
          },
          quality: {
            type: "integer",
            title: "Quality",
            minimum: 1,
            maximum: 100,
            default: 85
          }
        },
        required: ["targetFormat"]
      },
      dialogContent: {
        title: "Export settings",
        description: "Select target format and quality options.",
        size: "m"
      }
    }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import FormIntent, IntentFormContent, IntentDialogIconSizeContent

user_input = await communicator.launch_intent(FormIntent(
    form=IntentFormContent(
        parameters={
            "type": "object",
            "properties": {
                "targetFormat": {
                    "type": "string",
                    "title": "Target format",
                    "enum": ["jpeg", "png", "webp"],
                    "default": "webp"
                },
                "quality": {
                    "type": "integer",
                    "title": "Quality",
                    "minimum": 1,
                    "maximum": 100,
                    "default": 85
                }
            },
            "required": ["targetFormat"]
        },
        dialogContent=IntentDialogIconSizeContent(
            title="Export settings",
            description="Select target format and quality options.",
            size="m"
        )
    )
))
```
````

### 3. `UiIntent` (`ui`)

Opens a dedicated UI frame in a modal, sidebar, window, or tab, rendering a URL or raw inline HTML.

````carousel
```typescript
// TypeScript example
import { IntentUiAnchor } from "@picteus/extension-sdk";

await communicator.launchIntent({
  ui: {
    id: "my-custom-modal",
    integration: { anchor: IntentUiAnchor.Modal },
    frameContent: {
      html: `<!DOCTYPE html><html><body><h2>Custom Interface</h2><p>Extension content rendered here.</p></body></html>`
    },
    dialogContent: {
      title: "Custom Tool",
      description: "Embedded extension UI."
    }
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import UiIntent, IntentUi, IntentUIModalIntegration, IntentHtmlContent, IntentDialogIconContent

await communicator.launch_intent(UiIntent(
    ui=IntentUi(
        id="my-custom-modal",
        integration=IntentUIModalIntegration(),
        frameContent=IntentHtmlContent(
            html="<!DOCTYPE html><html><body><h2>Custom Interface</h2><p>Extension content rendered here.</p></body></html>"
        ),
        dialogContent=IntentDialogIconContent(
            title="Custom Tool",
            description="Embedded extension UI."
        )
    )
))
```
````

### 4. `ImagesIntent` (`images`)

Opens a tab displaying an image gallery with the supplied images and header content.

````carousel
```typescript
// TypeScript example
await communicator.launchIntent({
  images:
    {
      images: [{ imageId: "img-123" }, { imageId: "img-456" }],
      content: {
        title: "Processed results",
        subtitle: "2 images processed",
        description: "These are the newly generated images."
      }
    }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import ImagesIntent, IntentImages, IntentImage, IntentImagesContent

await communicator.launch_intent(ImagesIntent(
    images=IntentImages(
        images=[IntentImage(imageId="img-123"), IntentImage(imageId="img-456")],
        content=IntentImagesContent(
            title="Processed results",
            subtitle="2 images processed",
            description="These are the newly generated images."
        )
    )
))
```
````

### 5. `ToastIntent` (`toast`)
Displays a brief, non-intrusive toast notification in the application.

````carousel
```typescript
// TypeScript example
import { IntentToastType } from "@picteus/extension-sdk";

await communicator.launchIntent({
  toast: {
    type: IntentToastType.Info,
    title: "Processing Complete",
    subtitle: "Processed 12 images successfully."
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import ToastIntent, IntentToast, IntentToastType

await communicator.launch_intent(ToastIntent(
    toast=IntentToast(
        type=IntentToastType.INFO,
        title="Processing Complete",
        subtitle="Processed 12 images successfully."
    )
))
```
````

### 6. `NotificationIntent` (`notification`)
Sends a notification to the Picteus notification center or system desktop notification manager (`isNative: true`).

---

## System & navigation intents

- **`ShowIntent` (`show`)**: navigates the Picteus client to a specific view:
    - `IntentShowType.Image`: open an image detail page.
    - `IntentShowType.Sidebar`: open a registered sidebar panel.
    - `IntentShowType.ExtensionSettings`: open this extension's settings page.
    - `IntentShowType.Repository`: open a repository view.
- **`OpenBrowserIntent` (`openBrowser`)**: opens an external URL in the user's default web browser.
- **`ActionIntent` (`action`)**: bundles an intent with an executable trigger button inside a dialog or notification.

---

## File & bundle intents

- **`ReadFileIntent` (`readFile`)**: prompts the user with a native file picker to select a file (with optional extension filters) and returns the file content as a `Buffer` (TS) or `bytearray` (Python).
- **`WriteFileIntent` (`writeFile`)**: prompts the user to save a file with suggested name, extension, and binary content.
- **`ServeBundleIntent` (`serveBundle`)**: uploads and serves a zipped HTML/JS web application bundle from the extension to an iframe endpoint hosted by the Picteus server.
