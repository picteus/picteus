import { describe, test } from "node:test";
import { strict as assert } from "node:assert/strict";

import { generateIntentsMarkdown, generateViewKitMarkdown } from "../src/emitter/markdownGenerator.js";
import { IntentSpec } from "../src/emitter/intents/intentsModel.js";
import { generatePythonCode } from "../src/emitter/viewkit/pythonGenerator.js";
import { generateTypeScriptCode } from "../src/emitter/viewkit/typescriptGenerator.js";
import { GrammarSpec } from "../src/emitter/viewkit/typespecModel.js";


describe("TypeSpec Markdown documentation generator", () =>
{
  test("documents intent audiences, inheritance, property constraints, enums, and unions", (): void =>
  {
    const intentSpec: IntentSpec = {
      namespaceDoc: "Intent models describe the payloads sent between Picteus clients and extensions.",
      frontEndIntentDocumentation: {
        doc: "Front-end intents are operations that request UI behavior or invoke extension functionality in the application."
      },
      backEndIntentDocumentation: {
        doc: "Back-end intents are operations handled by server or host services."
      },
      models: [
        {
          name: "BasisIntent",
          isIntent: true,
          properties: [
            { name: "identity", optional: true, type: { kind: "model", name: "Identity" } }
          ]
        },
        {
          name: "Identity",
          properties: [
            { name: "id", optional: false, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "FormContent",
          properties: [
            { name: "parameters", optional: false, type: { kind: "record", name: "Record" } }
          ]
        },
        {
          name: "FormIntent",
          summary: "Collects values for a form.",
          doc: "The client renders the schema and returns submitted values through the intent flow.",
          isIntent: true,
          audience: "frontEnd",
          baseModelName: "BasisIntent",
          properties: [
            {
              name: "form",
              summary: "Form parameters.",
              doc: "Defines the fields the client renders and validates.",
              optional: false,
              type: { kind: "model", name: "FormContent" },
              minLength: 2,
              maxLength: 12,
              format: "uri"
            }
          ]
        },
        {
          name: "ServeBundleIntent",
          isIntent: true,
          audience: "backEnd",
          properties: [
            { name: "content", optional: false, type: { kind: "bytes", name: "bytes" } }
          ]
        }
      ],
      enums: [
        {
          name: "DialogType",
          doc: "Dialog classification.",
          members: [
            { name: "info", value: "info", doc: "Informational dialog." }
          ]
        }
      ],
      unions: [
        {
          name: "Resource",
          doc: "Resource transport.",
          variants: [
            { kind: "model", name: "UrlResource" },
            { kind: "model", name: "BinaryResource" }
          ]
        }
      ]
    };

    const markdown = generateIntentsMarkdown(intentSpec);

    assert.match(markdown, /## Front-end intents/);
    assert.match(markdown, /## Back-end intents/);
    assert.match(
      markdown,
      /## Front-end intents\n\nFront-end intents are operations that request UI behavior or invoke extension functionality in the application\.\n\n\| Intent model/
    );
    assert.match(
      markdown,
      /## Back-end intents\n\nBack-end intents are operations handled by server or host services\.\n\n\| Intent model/
    );
    assert.doesNotMatch(markdown, /Client-facing operations|Server-facing operations/);
    assert.match(markdown, /Intent models describe the payloads sent between Picteus clients and extensions\./);
    assert.doesNotMatch(markdown, /This file is generated/);
    assert.match(markdown, /### FormIntent/);
    assert.match(markdown, /Extends \[BasisIntent]\(#basisintent\)\./);
    assert.match(markdown, /`form` \| \[FormContent]\(#formcontent\) \| Yes \|  \| Form parameters\. Defines the fields the client renders and validates\. — Format: `uri` — Length: 2–12/);
    assert.match(markdown, /Collects values for a form\.\n\nThe client renders the schema and returns submitted values/);
    assert.match(markdown, /`parameters` \| Record&lt;string, unknown&gt;/);
    assert.match(markdown, /### DialogType/);
    assert.match(markdown, /`info` \| `info` \| Informational dialog\./);
    assert.match(markdown, /### Resource/);
    assert.match(markdown, /\| 1 \| \[UrlResource]\(#urlresource\) \|/);
    assert.match(markdown, /\| 2 \| \[BinaryResource]\(#binaryresource\) \|/);
  });

  test("documents ViewKit roots, element groups, discriminator metadata, and UI decorators", (): void =>
  {
    const rootModel = {
      name: "UiElement",
      doc: "Base element.",
      isDiscriminated: true,
      isDslRoot: false,
      isDslIgnored: false,
      aliases: [],
      properties: []
    };
    const textElement = {
      name: "TextElement",
      summary: "Text visual element.",
      doc: "Displays text.",
      baseModelName: "UiElement",
      isDiscriminated: false,
      discriminatorValue: "text",
      isDslRoot: false,
      isDslIgnored: false,
      aliases: [ "markdown" as const ],
      uiWidget: "string" as const,
      properties: [
        {
          name: "value",
          summary: "Text content.",
          doc: "Plain text rendered inside the element.",
          optional: false,
          type: { kind: "string" as const, name: "string" },
          defaultValue: "hello",
          isUiLabel: false,
          isUiValue: true,
          isUiModifiers: false
        }
      ]
    };
    const rootContainer = {
      name: "UiContainer",
      doc: "Root container.",
      isDiscriminated: false,
      isDslRoot: true,
      isDslIgnored: false,
      aliases: [],
      uiLayout: "repeating-group" as const,
      properties: [
        {
          name: "elements",
          optional: false,
          type: {
            kind: "array" as const,
            name: "Array",
            elementType: { kind: "model" as const, name: "UiElement" }
          },
          isUiLabel: false,
          isUiValue: false,
          isUiModifiers: false
        }
      ]
    };
    const grammarSpec: GrammarSpec = {
      namespaceDoc: "A declarative UI grammar.",
      enums: [
        {
          name: "TextStyle",
          members: [
            { name: "plain", value: "plain" }
          ]
        }
      ],
      models: [ rootModel, textElement, rootContainer ],
      polymorphicRoots: [
        {
          name: "UiElement",
          doc: "Polymorphic UI element.",
          discriminatorProperty: "type",
          derivedModels: [ textElement ]
        }
      ],
      uiElements: [ textElement ],
      actionElements: [],
      rootModels: [ rootContainer ]
    };

    const markdown = generateViewKitMarkdown(grammarSpec);

    assert.match(markdown, /# ViewKit model reference/);
    assert.doesNotMatch(markdown, /This file is generated/);
    assert.match(markdown, /## Root models/);
    assert.match(markdown, /## UI elements/);
    assert.match(markdown, /Aliases: `markdown`/);
    assert.match(markdown, /Text visual element\.\n\nDisplays text\./);
    assert.match(markdown, /Widget: `string`/);
    assert.match(markdown, /`value` \| string \| Yes \| `hello` \| Text content\. Plain text rendered inside the element\. — UI value/);
    assert.match(markdown, /## UiElement variants/);
    assert.match(markdown, /Discriminator property: `type`\./);
    assert.match(markdown, /\[TextElement]\(#textelement\) \| `text` \| Text visual element\. Displays text\./);
    assert.match(markdown, /### TextStyle/);

    const typeScriptCode = generateTypeScriptCode(grammarSpec);
    const pythonCode = generatePythonCode(grammarSpec);

    assert.match(typeScriptCode, /Text visual element\.[\s\S]*@remarks[\s\S]*Displays text\./);
    assert.match(typeScriptCode, /Text content\.[\s\S]*@remarks[\s\S]*Plain text rendered inside the element\./);
    assert.match(pythonCode, /Text visual element\.\n\n\s+Displays text\./);
    assert.match(pythonCode, /# Text content\.\n\s+# Plain text rendered inside the element\./);
  });
});
