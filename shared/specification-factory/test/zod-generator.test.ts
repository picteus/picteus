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
          properties: [
            { name: "content", optional: false, type: { kind: "model", name: "IntentFrameContent" } },
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

    // Verify IntentImages has required dialogContent (not optional)
    assert.match(code, /dialogContent: zodIntentDialogIconContent(?!\.optional\(\))/);

    // Verify inheritance extension
    assert.match(code, /export const zodOpenBrowserIntent = zodBasisIntent\.extend\(\{/);
  });
});
