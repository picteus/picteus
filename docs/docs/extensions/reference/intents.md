# Intents

This document describes SDK intents and provides comprehensive documentation on them.


## User Interface (UI) & interaction intents

### 1. `DialogIntent` (`dialog`)
Displays modal dialog boxes: confirmation questions, Info messages, Error notices, or dialogs containing embedded HTML frames.

````carousel
```typescript
// TypeScript example
import { IntentDialogType } from "@picteus/extension-sdk";

const confirmed = await communicator.launchIntent<boolean>({
  dialog: {
    type: IntentDialogType.Question,
    size: "m",
    title: "Confirm Action",
    description: "Are you sure you want to proceed with this operation?",
    details: "This operation will apply irreversible changes.",
    buttons: { yes: "Yes, Proceed", no: "Cancel" }
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
        title="Confirm Action",
        description="Are you sure you want to proceed with this operation?",
        details="This operation will apply irreversible changes.",
        buttons=IntentDialogButtons(yes="Yes, Proceed", no="Cancel")
    )
))
```
````

### 2. `FormIntent` (`form`)
Presents a dynamically generated form based on JSON Schema and returns the user's filled inputs as an object/dictionary.

````carousel
```typescript
// TypeScript example
const userInput = await communicator.launchIntent<Record<string, any>>({
  form: {
    parameters: {
      type: "object",
      properties: {
        targetFormat: {
          type: "string",
          title: "Target Format",
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
      title: "Export Settings",
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
                    "title": "Target Format",
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
            title="Export Settings",
            description="Select target format and quality options.",
            size="m"
        )
    )
))
```
````

### 3. `UiIntent` (`ui`)
Opens a dedicated UI frame (Modal, Sidebar, Window, or ImageDetail) rendering an external/internal URL or raw inline HTML.

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
from picteus_extension_sdk import UiIntent, IntentUi, IntentUIModalIntegration, IntentFrameHtmlContent, IntentDialogIconContent

await communicator.launch_intent(UiIntent(
    ui=IntentUi(
        id="my-custom-modal",
        integration=IntentUIModalIntegration(),
        frameContent=IntentFrameHtmlContent(
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
Displays a grid of images / thumbnails to the user inside an interactive dialog.

````carousel
```typescript
// TypeScript example
await communicator.launchIntent({
  images: {
    images: [{ imageId: "img-123" }, { imageId: "img-456" }],
    dialogContent: {
      title: "Processed Results",
      description: "Here are the newly generated images."
    }
  }
});
```
<!-- slide -->
```python
# Python example
from picteus_extension_sdk import ImagesIntent, IntentImages, IntentImage, IntentDialogIconContent

await communicator.launch_intent(ImagesIntent(
    images=IntentImages(
        images=[IntentImage(imageId="img-123"), IntentImage(imageId="img-456")],
        dialogContent=IntentDialogIconContent(
            title="Processed Results",
            description="Here are the newly generated images."
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
