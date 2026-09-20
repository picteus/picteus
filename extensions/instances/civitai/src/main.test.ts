import { test } from "node:test";
import assert from "node:assert/strict";

import type { ImageMeta } from "@stable-canvas/civitai-rest-api-client";
import type { CollapsibleGroupElement, TableElement } from "@picteus/extension-sdk";

import { CivitaiRetriever } from "./retriever";


test("toUiContainer creates expected primary table and collapsible details", () =>
{
  const meta: ImageMeta & { baseModel?: string; } =
    {
      prompt: "masterpiece, 8k, beautiful landscape at sunrise",
      negativePrompt: "blurry, low quality, distorted",
      Model: "DreamShaperXL",
      baseModel: "SDXL 1.0",
      "Model hash": "250e13115b",
      sampler: "DPM++ 2M Karras",
      steps: 30,
      cfgScale: 7.5,
      seed: 1234567890,
      Size: "1024x1024",
      clipSkip: 2,
      Version: "v1.6.0",
      "Hires upscaler": "4x-UltraSharp",
      "Hires upscale": "1.5",
      "Hires steps": "15",
      "Denoising strength": "0.35",
      "Mask blur": "4",
      "Inpaint area": "Whole picture",
      "Masked area padding": "32",
      "ADetailer model": "face_yolov8n.pt",
      "ADetailer version": "23.10.1",
      "ADetailer confidence": "0.3",
      "ADetailer dilate erode": "4",
      "ADetailer mask blur": "4",
      "ADetailer denoising strength": "0.4",
      "ADetailer inpaint only masked": "True",
      "ADetailer inpaint padding": "32",
      "ADetailer model 2nd": "hand_yolov8n.pt",
      "ADetailer confidence 2nd": "0.4",
      "ADetailer dilate erode 2nd": "2",
      "ADetailer mask blur 2nd": "4",
      "ADetailer denoising strength 2nd": "0.3",
      "ADetailer inpaint only masked 2nd": "True",
      "ADetailer inpaint padding 2nd": "16",
      civitaiResources:
        [
          {
            type: "checkpoint",
            modelVersionId: 641087
          },
          {
            type: "lora",
            modelVersionId: 210432,
            weight: 0.8
          }
        ],
      hashes:
        {
          vae: "c6a580b13e",
          "lora:detail": "a1b2c3d4e5"
        }
    };

  const retriever = new CivitaiRetriever();
  const uiContainer = retriever.toUiContainer(meta);

  assert.ok(uiContainer);
  assert.equal(uiContainer.elements.length, 2);

  // 1. Primary section: Table
  const primaryElement = uiContainer.elements[0] as TableElement;
  assert.equal(primaryElement.type, "table");
  assert.ok(primaryElement.rows.length > 0);

  const primaryRowLabels = primaryElement.rows.map((row) =>
  {
    const firstCell = row.cells[0] as { type: string; value?: string; };
    return firstCell.value;
  });

  // Prompt must NOT be in the table
  assert.equal(primaryRowLabels.includes("Prompt"), false);

  // Core parameters must be present
  assert.ok(primaryRowLabels.includes("Negative Prompt"));
  assert.ok(primaryRowLabels.includes("Model"));
  assert.ok(primaryRowLabels.includes("Base Model"));
  assert.ok(primaryRowLabels.includes("Model Hash"));
  assert.ok(primaryRowLabels.includes("Sampler"));
  assert.ok(primaryRowLabels.includes("Steps"));
  assert.ok(primaryRowLabels.includes("CFG Scale"));
  assert.ok(primaryRowLabels.includes("Seed"));
  assert.ok(primaryRowLabels.includes("Dimensions"));
  assert.ok(primaryRowLabels.includes("Clip Skip"));

  // 2. Secondary section: Collapsible Group
  const secondaryElement = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(secondaryElement.type, "collapsible-group");
  assert.equal(secondaryElement.title, "Details");
  assert.equal(secondaryElement.defaultExpanded, false);
  assert.equal(secondaryElement.elements.length, 1);

  const secondaryTable = secondaryElement.elements[0] as TableElement;
  assert.equal(secondaryTable.type, "table");
  assert.ok(secondaryTable.rows.length > 0);

  const secondaryRowLabels = secondaryTable.rows.map((row) =>
  {
    const firstCell = row.cells[0] as { type: string; value?: string; };
    return firstCell.value;
  });

  assert.ok(secondaryRowLabels.includes("Hires Upscaler"));
  assert.ok(secondaryRowLabels.includes("Hires Upscale"));
  assert.ok(secondaryRowLabels.includes("Hires Steps"));
  assert.ok(secondaryRowLabels.includes("Denoising Strength"));
  assert.ok(secondaryRowLabels.includes("Version"));
  assert.ok(secondaryRowLabels.includes("Mask Blur"));
  assert.ok(secondaryRowLabels.includes("Inpaint Area"));
  assert.ok(secondaryRowLabels.includes("Masked Area Padding"));
  assert.ok(secondaryRowLabels.includes("ADetailer Model"));
  assert.ok(secondaryRowLabels.includes("ADetailer Model (2nd Pass)"));
  assert.ok(secondaryRowLabels.includes("CHECKPOINT"));
  assert.ok(secondaryRowLabels.includes("LORA"));
  assert.ok(secondaryRowLabels.includes("Hash (vae)"));
  assert.ok(secondaryRowLabels.includes("Hash (lora:detail)"));

  // Serialization to string works
  const serializedJson = uiContainer.toString();
  assert.ok(serializedJson.length > 0);
  assert.equal(typeof serializedJson, "string");
});

test("toUiContainer handles empty and minimal metadata gracefully", () =>
{
  const retriever = new CivitaiRetriever();

  // Minimal metadata with only prompt (which should be omitted from table)
  const emptyContainer = retriever.toUiContainer({ prompt: "lone prompt" });
  assert.equal(emptyContainer.elements.length, 0);

  // Partial metadata with invalid/default seed (-1)
  const partialContainer = retriever.toUiContainer({
    Model: "Flux.1",
    seed: -1,
    steps: 20
  });

  assert.equal(partialContainer.elements.length, 1);
  const tableElement = partialContainer.elements[0] as TableElement;
  const labels = tableElement.rows.map((row) => (row.cells[0] as { value?: string; }).value);
  assert.ok(labels.includes("Model"));
  assert.ok(labels.includes("Steps"));
  assert.equal(labels.includes("Seed"), false);
});

test("toUiContainer handles dynamic extra properties and resources list", () =>
{
  const retriever = new CivitaiRetriever();
  const meta: ImageMeta & Record<string, unknown> =
    {
      Model: "SDXL",
      prompt: "A beautiful scenery",
      resources:
        [
          {
            name: "DetailTweaker",
            type: "lora",
            weight: 0.6
          }
        ],
      "Schedule type": "Karras",
      CustomTag: "CustomValue"
    };

  const uiContainer = retriever.toUiContainer(meta);
  assert.equal(uiContainer.elements.length, 2);

  const primaryTable = uiContainer.elements[0] as TableElement;
  const primaryLabels = primaryTable.rows.map((row) => (row.cells[0] as { value?: string; }).value);
  assert.ok(primaryLabels.includes("Model"));
  assert.equal(primaryLabels.includes("Prompt"), false);

  const secondaryGroup = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(secondaryGroup.type, "collapsible-group");
  const secondaryTable = secondaryGroup.elements[0] as TableElement;
  const secondaryLabels = secondaryTable.rows.map((row) => (row.cells[0] as { value?: string; }).value);

  assert.ok(secondaryLabels.includes("LORA: DetailTweaker"));
  assert.ok(secondaryLabels.includes("Schedule type"));
  assert.ok(secondaryLabels.includes("CustomTag"));
});
