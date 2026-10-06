import { describe, it } from "node:test";
import { strict as assert } from "node:assert/strict";

import { generateZodIntentsTypeScriptCode } from "../dist/emitter/intents/zodGenerator.js";
import { IntentSpec } from "../dist/emitter/intents/intentsModel.js";


describe("Zod Intents Generator", () =>
{
  it("generates Zod schemas with inheritance, constraints, and aliases", () =>
  {
    const sampleSpec: IntentSpec = {
      enums: [
        {
          name: "IntentUiAnchor",
          members: [
            { name: "modal", value: "modal" },
            { name: "sidebar", value: "sidebar" }
          ]
        }
      ],
      unions: [
        {
          name: "IntentFrameContent",
          variants: [
            { kind: "model", name: "IntentUrlContent" },
            { kind: "model", name: "IntentHtmlContent" }
          ]
        }
      ],
      models: [
        {
          name: "BasisIntent",
          properties: [
            { name: "id", optional: true, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "IntentUrlContent",
          properties: [
            { name: "url", optional: false, type: { kind: "string", name: "string" }, format: "url" }
          ]
        },
        {
          name: "IntentHtmlContent",
          properties: [
            { name: "html", optional: false, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "IntentOpenBrowser",
          properties: [
            { name: "url", optional: false, type: { kind: "string", name: "string" }, format: "url" }
          ]
        },
        {
          name: "OpenBrowserIntent",
          baseModelName: "BasisIntent",
          audience: "frontEnd",
          properties: [
            { name: "openBrowser", optional: false, type: { kind: "model", name: "IntentOpenBrowser" } }
          ]
        },
        {
          name: "IntentFrame",
          summary: "Embedded frame configuration.",
          doc: "The frame height is a percentage of the available dialog height.",
          properties: [
            {
              name: "content",
              summary: "Frame content source.",
              doc: "Select either a URL or inline HTML variant.",
              optional: false,
              type: { kind: "model", name: "IntentFrameContent" }
            },
            { name: "height", optional: false, type: { kind: "number", name: "int32" }, minValue: 0, maxValue: 100 }
          ]
        },
        {
          name: "IntentImage",
          properties: [
            { name: "imageId", optional: false, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "IntentDialogIconContent",
          properties: [
            { name: "title", optional: false, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "IntentImages",
          properties: [
            {
              name: "images",
              optional: false,
              type: { kind: "array", name: "Array", elementType: { kind: "model", name: "IntentImage" } }
            },
            { name: "dialogContent", optional: false, type: { kind: "model", name: "IntentDialogIconContent" } }
          ]
        }
      ]
    };

    const code = generateZodIntentsTypeScriptCode(sampleSpec);

    // Verify Zod imports
    assert.match(code, /import \{ z } from "zod";/);

    // Verify Enum schema
    assert.match(code, /export const zodIntentUiAnchor = z\.enum\(\[\s*"modal",\s*"sidebar"\s*]\);/);

    // Verify Union schema
    assert.match(code, /export const zodIntentFrameContent = z\.union\(\[\s*zodIntentUrlContent,\s*zodIntentHtmlContent\s*]\);/);

    // Verify URL constraint
    assert.match(code, /url: z\.url\(\)/);

    // Verify int32 min/max constraints
    assert.match(code, /height: z\.int32\(\)\.min\(0\)\.max\(100\)/);
    assert.match(code, /content: zodIntentFrameContent\.describe\("Frame content source\.\\n\\nSelect either a URL or inline HTML variant\."\)/);
    assert.match(code, /zodIntentFrame = z\.object\(\{[\s\S]*}\)\.describe\("Embedded frame configuration\.\\n\\nThe frame height/);

    // Verify IntentImages has required dialogContent (not optional)
    assert.match(code, /dialogContent: zodIntentDialogIconContent(?!\.optional\(\))/);

    // Verify inheritance extension
    assert.match(code, /export const zodOpenBrowserIntent = zodBasisIntent\.extend\(\{/);
  });

  it("generates Intent-prefixed aliases and companion types for non-intent declarations", () =>
  {
    const spec: IntentSpec = {
      enums: [
        {
          name: "DialogType",
          members: [
            { name: "info", value: "info" }
          ]
        }
      ],
      unions: [
        {
          name: "DialogBody",
          variants: [
            { kind: "string", name: "string" }
          ]
        }
      ],
      models: [
        {
          name: "Dialog",
          properties: [
            { name: "title", optional: false, type: { kind: "string", name: "string" } }
          ]
        },
        {
          name: "DialogIntent",
          isIntent: true,
          properties: [
            { name: "dialog", optional: false, type: { kind: "model", name: "Dialog" } }
          ]
        }
      ]
    };

    const code = generateZodIntentsTypeScriptCode(spec);

    // Verify primary schemas and companion types
    assert.match(code, /export const zodDialog = z\.object\(\{/);
    assert.match(code, /export type zodDialog = typeof zodDialog;/);

    // Verify Intent aliases and types
    assert.match(code, /export const zodIntentDialog = zodDialog;/);
    assert.match(code, /export type zodIntentDialog = typeof zodDialog;/);

    // Verify Enum alias
    assert.match(code, /export const zodIntentDialogType = zodDialogType;/);
    assert.match(code, /export type zodIntentDialogType = typeof zodDialogType;/);

    // Verify Union alias
    assert.match(code, /export const zodIntentDialogBody = zodDialogBody;/);
    assert.match(code, /export type zodIntentDialogBody = typeof zodDialogBody;/);

    // Verify intent models do not receive a duplicate Intent-prefixed alias
    assert.match(code, /export const zodDialogIntent = z\.object\(\{/);
    assert.doesNotMatch(code, /zodIntentDialogIntent/);
  });
});

