# Manual

The `MANUAL.md` file is an optional Markdown document located at the root of an extension directory. It acts as the user manual and contextual in-app documentation for the extension.

---

## Purpose and role

While `manifest.json` defines the extension's structural contracts — such as command identifiers, parameter schemas, supported entities, and short localized titles or summaries in `specifications` —, `MANUAL.md` acts as a complement for command details and user guidance.

It fulfills several key roles:
- **complement for command details**: it provides rich, multi-paragraph Markdown documentation — including formatted text, bullet lists, code blocks, and hyperlinks — that complements the concise descriptions declared in the manifest ;
- **decoupled authoring**: it keeps `manifest.json` focused on schema definitions, while providing a dedicated space for thorough user-facing instructions ;
- **embedded and offline native rendering**: the manual is packaged directly within the extension archive and rendered natively in the Picteus user interface without requiring external network access ;
- **optional nature**: the `MANUAL.md` file is optional. When omitted, the extension remains fully operational, and the user interface falls back to displaying the labels and descriptions declared in `manifest.json`.

> [!NOTE]
> For Node.js / TypeScript extensions, ensure that `MANUAL.md` is declared in the `"files"` property of `package.json` so that it is included when packaging the extension archive.

---

## Display in the user interface

Picteus parses the `MANUAL.md` file and displays its sections contextually across several views:

1. **Extension detail page** — within the `Extensions` screen:
   - **`# Summary`**: rendered in the "Manual" field as the primary overview of the extension ;
   - **`# Prerequisites`**: rendered in the "Prerequisites" field, informing users about external dependencies ;
   - **`# Settings`**: rendered in the "Settings" field, summarizing configuration options ;
   - **`## <commandId>`** (under `# Commands`): rendered in the commands table for each corresponding command, alongside its icon, identifier, label, and manifest description.

2. **Command execution dialogs**:
   - When a user triggers an extension command that presents an execution form or confirmation prompt — such as commands requiring parameters or filters —, the section matching `## <commandId>` under `# Commands` in `MANUAL.md` is rendered inside the "Manual" section directly above the parameter fields ;
   - This gives the user immediate guidance on how to run the command and how to fill in its parameters.

3. **Extension settings modal**:
   - When a user opens the settings modal for an extension, any section matching `# Settings` in `MANUAL.md` is rendered inside a "Manual" section above the generated settings form ;
   - This guides the user through the configuration process, explaining what each option controls and where to obtain external tokens or keys.

---

## Section and paragraph structure

The `MANUAL.md` file is structured using standard Markdown level 1 headings — `# <Title>` — to delineate each top-level section.

The recognized sections are:

- **`# Summary`**:
  Provides an overall description of the extension, its main features, and its intended use case. This section is displayed in the extension detail page.

- **`# Prerequisites`** *(optional)*:
  Documents any prerequisites or external requirements necessary to use the extension — such as installing, configuring and launching an external service, software or application obtaining third-party API credentials, or meeting system requirements or specific hardware capabilities. This section is optional and is displayed in the extension detail page.

- **`# Settings`** *(optional)*:
  Documents configuration options declared in the extension manifest's `settings` property. While optional, this section should ideally be defined as soon as `manifest.json` contains a non-empty `settings` property to explain the purpose of each setting, default values, and setup instructions. This section is displayed in the extension detail page and inside the extension settings modal.

- **`# Commands`** *(optional)*:
  Contains documentation for all commands declared in the extension manifest under `instructions[].commands`. Under the `# Commands` section, each command is documented as a direct child level 2 heading:

  - **`## <commandId>`**:
    Provides detailed contextual documentation for an individual command whose heading matches the exact `id` of a command declared in `manifest.json` — under `instructions[].commands[].id`.

    This section acts as a complement to the command's `specifications.description` property declared in the extension manifest. While `specifications.description` provides a concise summary suitable for tooltips and compact table listings, the `## <commandId>` section in `MANUAL.md` provides in-depth instructions, usage guidelines, parameter explanations, and examples. It is displayed in both the commands table of the extension detail page and within the command's execution dialog box.

    Any further subsections within the command instructions (e.g., options, notes, workflow, examples) must use level 3 headings (`###`).

---

## Example file

Here is an example illustrating the structure of a `MANUAL.md` file:

```markdown
# Summary
This extension integrates with an external AI service to provide automated image captioning and tagging.

# Prerequisites
An [Ollama](https://ollama.com) instance must be installed, up and running on your local machine or network.

# Settings
- `Ollama URL` specifies the HTTP address where the Ollama server is listening to.
- `Vision Model` specifies the model name used for vision tasks.

# Commands

## generateCaption
Generates a descriptive natural language caption for selected images using the configured vision model.

### Notes
- High-resolution images will be automatically resized before being processed by the model.
- The generated caption will be saved as an image feature attribute and displayed in the image detail page.
```

In the corresponding `manifest.json`, the command is declared with the matching `id`:

```json
{
  "instructions": [
    {
      "commands": [
        {
          "id": "generateCaption",
          "specifications": [
            {
              "locale": "en",
              "label": "Caption",
              "name": "Generate Caption",
              "description": "Generates a caption for the selected image."
            }
          ],
          "on": {
            "entity": "Image"
          }
        }
      ]
    }
  ]
}
```

When the user views the extension details, the `# Summary`, `# Prerequisites`, `# Settings`, and `## generateCaption` (under `# Commands`) sections appear in the respective fields and tables. When the user executes the `generateCaption` command, the `## generateCaption` documentation appears inside the command's dialog box as an expandable manual.
