import { test } from "node:test";
import { strict as assert } from "node:assert/strict";

import type { ImageMeta } from "@stable-canvas/civitai-rest-api-client";
import type { CollapsibleGroupElement, FlowingElement, TableElement } from "@picteus/extension-sdk";

import { CivitaiRetriever } from "./retriever";


test("toUiContainer creates expected primary table and collapsible details", () =>
{
  const meta: ImageMeta & { baseModel?: string; "Created Date"?: string; width?: number; height?: number; } =
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
      width: 1024,
      height: 1024,
      clipSkip: 2,
      "Created Date": "2024-09-23T06:17:42.9952795Z",
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
  assert.equal(uiContainer.elements.length, 3);

  // 1. Primary section: Table
  const primaryElement = uiContainer.elements[0] as TableElement;
  assert.equal(primaryElement.type, "table");
  assert.ok(primaryElement.rows.length > 0);

  const primaryRowLabels = primaryElement.rows.map(
    (row) =>
    {
      const firstCell = row.cells[0] as { type: string; value?: string; };
      return firstCell.value;
    }
  );

  // Prompt must be present and immediately precede Negative Prompt
  assert.ok(primaryRowLabels.includes("Prompt"));
  const promptIndex = primaryRowLabels.indexOf("Prompt");
  const negativePromptIndex = primaryRowLabels.indexOf("Negative Prompt");
  assert.ok(promptIndex !== -1);
  assert.ok(negativePromptIndex !== -1);
  assert.equal(promptIndex + 1, negativePromptIndex);

  // Core parameters must be present
  assert.ok(primaryRowLabels.includes("Negative Prompt"));
  assert.ok(primaryRowLabels.includes("Model"));
  assert.ok(primaryRowLabels.includes("Base Model"));
  assert.equal(primaryRowLabels.includes("Model Hash"), false);
  assert.ok(primaryRowLabels.includes("Sampler"));
  assert.ok(primaryRowLabels.includes("Steps"));
  assert.ok(primaryRowLabels.includes("CFG Scale"));
  assert.ok(primaryRowLabels.includes("Seed"));
  assert.ok(primaryRowLabels.includes("Dimension"));
  assert.equal(primaryRowLabels.includes("Dimensions"), false);
  assert.equal(primaryRowLabels.includes("Created Date"), false);
  assert.ok(primaryRowLabels.includes("Clip Skip"));

  // Check Dimension cell content
  const dimensionRowIndex = primaryRowLabels.indexOf("Dimension");
  const dimensionRow = primaryElement.rows[dimensionRowIndex];
  const dimensionValueCell = dimensionRow.cells[1] as FlowingElement;
  assert.equal(dimensionValueCell.type, "flowing");
  assert.equal(dimensionValueCell.elements.length, 2);
  const dimensionTextElement = dimensionValueCell.elements[0] as {
    type: string;
    value: string;
    modifiers?: { copyable?: boolean; };
  };
  assert.equal(dimensionTextElement.type, "string-short");
  assert.equal(dimensionTextElement.value, "1024x1024");
  assert.equal(dimensionTextElement.modifiers?.copyable, true);
  const dimensionRatioElement = dimensionValueCell.elements[1] as { type: string; value: number; };
  assert.equal(dimensionRatioElement.type, "ratio");
  assert.equal(dimensionRatioElement.value, 1);

  // 2. Civitai Resources section: Collapsible Group
  const resourcesElement = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(resourcesElement.type, "collapsible-group");
  assert.equal(resourcesElement.title, "Civitai Resources");
  assert.equal(resourcesElement.defaultExpanded, false);
  assert.equal(resourcesElement.elements.length, 1);

  const resourcesTable = resourcesElement.elements[0] as TableElement;
  assert.equal(resourcesTable.type, "table");
  assert.ok(resourcesTable.columns);
  const resourceHeaders = resourcesTable.columns.map((column) => column.header);
  assert.deepEqual(resourceHeaders, [ "Type", "Model Version Id" ]);
  assert.equal(resourcesTable.rows.length, 2);
  const row0Cells = resourcesTable.rows[0].cells as Array<{
    type: string;
    value?: string;
    modifiers?: { copyable?: boolean; };
  }>;
  assert.equal(row0Cells[0].value, "checkpoint");
  assert.equal(row0Cells[0].modifiers?.copyable, undefined);
  assert.equal(row0Cells[1].value, "641087");
  assert.equal(row0Cells[1].modifiers?.copyable, true);
  const row1Cells = resourcesTable.rows[1].cells as Array<{
    type: string;
    value?: string;
    modifiers?: { copyable?: boolean; };
  }>;
  assert.equal(row1Cells[0].value, "lora");
  assert.equal(row1Cells[0].modifiers?.copyable, undefined);
  assert.equal(row1Cells[1].value, "210432");
  assert.equal(row1Cells[1].modifiers?.copyable, true);

  // 3. Secondary section: Collapsible Group
  const secondaryElement = uiContainer.elements[2] as CollapsibleGroupElement;
  assert.equal(secondaryElement.type, "collapsible-group");
  assert.equal(secondaryElement.title, "Details");
  assert.equal(secondaryElement.defaultExpanded, false);
  assert.equal(secondaryElement.elements.length, 1);

  const secondaryTable = secondaryElement.elements[0] as TableElement;
  assert.equal(secondaryTable.type, "table");
  assert.ok(secondaryTable.rows.length > 0);

  const secondaryRowLabels = secondaryTable.rows.map(
    (row) =>
    {
      const firstCell = row.cells[0] as { type: string; value?: string; };
      return firstCell.value;
    }
  );

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
  assert.equal(secondaryRowLabels.includes("Hash (vae)"), false);
  assert.equal(secondaryRowLabels.includes("Hash (lora:detail)"), false);
  assert.equal(secondaryRowLabels.includes("Created Date"), false);

  // Serialization to string works
  const serializedJson = uiContainer.toString();
  assert.ok(serializedJson.length > 0);
  assert.equal(typeof serializedJson, "string");
});

test("toUiContainer handles empty and minimal metadata gracefully", () =>
{
  const retriever = new CivitaiRetriever();

  // Empty metadata produces no elements
  const emptyContainer = retriever.toUiContainer({});
  assert.equal(emptyContainer.elements.length, 0);

  // Minimal metadata with only prompt produces 1 table element with Prompt
  const promptOnlyContainer = retriever.toUiContainer({ prompt: "lone prompt" });
  assert.equal(promptOnlyContainer.elements.length, 1);
  const promptTable = promptOnlyContainer.elements[0] as TableElement;
  assert.equal((promptTable.rows[0].cells[0] as { value?: string }).value, "Prompt");

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
  assert.equal(uiContainer.elements.length, 3);

  const primaryTable = uiContainer.elements[0] as TableElement;
  const primaryLabels = primaryTable.rows.map((row) => (row.cells[0] as { value?: string; }).value);
  assert.ok(primaryLabels.includes("Model"));
  assert.ok(primaryLabels.includes("Prompt"));

  const resourcesGroup = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(resourcesGroup.type, "collapsible-group");
  assert.equal(resourcesGroup.title, "Resources");
  assert.equal(resourcesGroup.defaultExpanded, false);
  assert.equal(resourcesGroup.elements.length, 1);

  const resourcesTable = resourcesGroup.elements[0] as TableElement;
  assert.equal(resourcesTable.type, "table");
  assert.ok(resourcesTable.columns);
  assert.equal(resourcesTable.columns.length, 3);
  assert.equal(resourcesTable.columns[0].header, "Type");
  assert.equal(resourcesTable.columns[0].width, 25);
  assert.equal(resourcesTable.columns[1].header, "Name");
  assert.equal(resourcesTable.columns[1].width, 50);
  assert.equal(resourcesTable.columns[2].header, "Weight");
  assert.equal(resourcesTable.columns[2].width, 25);

  assert.equal(resourcesTable.rows.length, 1);
  const resourceRow0Cells = resourcesTable.rows[0].cells as Array<{
    type: string;
    value?: string | number;
    modifiers?: { copyable?: boolean; };
  }>;
  assert.equal(resourceRow0Cells[0].value, "lora");
  assert.equal(resourceRow0Cells[0].modifiers?.copyable, undefined);
  assert.equal(resourceRow0Cells[1].value, "DetailTweaker");
  assert.equal(resourceRow0Cells[1].modifiers?.copyable, true);
  assert.equal(resourceRow0Cells[2].value, 0.6);
  assert.equal(resourceRow0Cells[2].modifiers?.copyable, true);

  const secondaryGroup = uiContainer.elements[2] as CollapsibleGroupElement;
  assert.equal(secondaryGroup.type, "collapsible-group");
  assert.equal(secondaryGroup.title, "Details");
  const secondaryTable = secondaryGroup.elements[0] as TableElement;
  const secondaryLabels = secondaryTable.rows.map((row) => (row.cells[0] as { value?: string; }).value);

  assert.ok(secondaryLabels.includes("Schedule type"));
  assert.ok(secondaryLabels.includes("CustomTag"));
});

test("toUiContainer displays civitaiResources with only used columns among type, modelVersionId, modelName, modelVersionName", () =>
{
  const retriever = new CivitaiRetriever();
  const meta: ImageMeta =
    {
      Model: "Pony Diffusion V6",
      civitaiResources:
        [
          {
            type: "checkpoint",
            modelVersionId: 290640,
            // @ts-ignore
            modelName: "Pony Diffusion V6 XL",
            modelVersionName: "V6 (start with this)"
          },
          {
            type: "lora",
            modelVersionId: 350000,
            // @ts-ignore
            modelName: "Detailed Eyes"
          }
        ]
    };

  const uiContainer = retriever.toUiContainer(meta);
  assert.equal(uiContainer.elements.length, 2);

  const resourcesElement = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(resourcesElement.type, "collapsible-group");
  assert.equal(resourcesElement.title, "Civitai Resources");
  assert.equal(resourcesElement.elements.length, 1);

  const resourcesTable = resourcesElement.elements[0] as TableElement;
  assert.equal(resourcesTable.type, "table");
  assert.ok(resourcesTable.columns);

  // All 4 columns are used across the two items
  const headers = resourcesTable.columns.map((column) => column.header);
  assert.deepEqual(headers, [ "Type", "Model Version Id", "Model Name", "Model Version Name" ]);

  assert.equal(resourcesTable.rows.length, 2);
  const row0 = resourcesTable.rows[0].cells as Array<{ value?: string; modifiers?: { copyable?: boolean; }; }>;
  assert.equal(row0[0].value, "checkpoint");
  assert.equal(row0[0].modifiers?.copyable, undefined);
  assert.equal(row0[1].value, "290640");
  assert.equal(row0[1].modifiers?.copyable, true);
  assert.equal(row0[2].value, "Pony Diffusion V6 XL");
  assert.equal(row0[2].modifiers?.copyable, true);
  assert.equal(row0[3].value, "V6 (start with this)");
  assert.equal(row0[3].modifiers?.copyable, true);

  const row1 = resourcesTable.rows[1].cells as Array<{ value?: string; modifiers?: { copyable?: boolean; }; }>;
  assert.equal(row1[0].value, "lora");
  assert.equal(row1[0].modifiers?.copyable, undefined);
  assert.equal(row1[1].value, "350000");
  assert.equal(row1[1].modifiers?.copyable, true);
  assert.equal(row1[2].value, "Detailed Eyes");
  assert.equal(row1[2].modifiers?.copyable, true);
  assert.equal(row1[3].value, "");
});

test("toUiContainer handles resources table with Type, Name, Weight columns ignoring extra fields and falling back to modelName", () =>
{
  const retriever = new CivitaiRetriever();

  // Empty resources array does not produce a collapsible group
  const emptyContainer = retriever.toUiContainer({
    Model: "SDXL",
    resources: []
  });
  assert.equal(emptyContainer.elements.length, 1);
  assert.equal(emptyContainer.elements[0].type, "table");

  // Resources with extra ignored fields, modelName fallback, and missing weight
  const container = retriever.toUiContainer({
    Model: "SDXL",
    resources:
      [
        {
          type: "checkpoint",
          modelName: "SDXL Base",
          modelVersionId: 101010,
          modelVersionName: "1.0",
          hash: "a1b2c3d4"
        },
        {
          type: "lora",
          name: "AddDetail",
          weight: 0.85,
          modelVersionId: 202020
        }
      ]
  });

  assert.equal(container.elements.length, 2);
  const resourceGroup = container.elements[1] as CollapsibleGroupElement;
  assert.equal(resourceGroup.type, "collapsible-group");
  assert.equal(resourceGroup.title, "Resources");
  assert.equal(resourceGroup.elements.length, 1);

  const resourceTable = resourceGroup.elements[0] as TableElement;
  assert.equal(resourceTable.columns.length, 3);
  const headers = resourceTable.columns.map((column) => column.header);
  assert.deepEqual(headers, [ "Type", "Name", "Weight" ]);
  assert.equal(resourceTable.columns[0].width, 25);
  assert.equal(resourceTable.columns[1].width, 50);
  assert.equal(resourceTable.columns[2].width, 25);

  assert.equal(resourceTable.rows.length, 2);
  const row0 = resourceTable.rows[0].cells as Array<{ value?: string | number; modifiers?: { copyable?: boolean; }; }>;
  assert.equal(row0[0].value, "checkpoint");
  assert.equal(row0[0].modifiers?.copyable, undefined);
  assert.equal(row0[1].value, "SDXL Base");
  assert.equal(row0[1].modifiers?.copyable, true);
  assert.equal(row0[2].value, "");

  const row1 = resourceTable.rows[1].cells as Array<{ value?: string | number; modifiers?: { copyable?: boolean; }; }>;
  assert.equal(row1[0].value, "lora");
  assert.equal(row1[0].modifiers?.copyable, undefined);
  assert.equal(row1[1].value, "AddDetail");
  assert.equal(row1[1].modifiers?.copyable, true);
  assert.equal(row1[2].value, 0.85);
  assert.equal(row1[2].modifiers?.copyable, true);
});

test("toUiContainer shifts width and height into Dimension entry with ratio and omits Created Date", () =>
{
  const retriever = new CivitaiRetriever();
  const meta: ImageMeta & Record<string, unknown> =
    {
      Model: "SDXL",
      prompt: "A cinematic shot of a mountain",
      width: 1024,
      height: 768,
      "Created Date": "2024-09-23T06:17:42.9952795Z",
      ExtraInfo: "SomeValue"
    };

  const uiContainer = retriever.toUiContainer(meta);
  assert.equal(uiContainer.elements.length, 2);

  // 1. Primary table
  const primaryTable = uiContainer.elements[0] as TableElement;
  const primaryLabels = primaryTable.rows.map((row) => (row.cells[0] as { value?: string; }).value);
  assert.ok(primaryLabels.includes("Dimension"));
  assert.equal(primaryLabels.includes("width"), false);
  assert.equal(primaryLabels.includes("height"), false);
  assert.equal(primaryLabels.includes("Created Date"), false);

  const dimensionRowIndex = primaryLabels.indexOf("Dimension");
  const dimensionRow = primaryTable.rows[dimensionRowIndex];
  const dimensionCell = dimensionRow.cells[1] as FlowingElement;
  assert.equal(dimensionCell.type, "flowing");
  assert.equal(dimensionCell.elements.length, 2);

  const textElement = dimensionCell.elements[0] as {
    type: string;
    value: string;
    modifiers?: { copyable?: boolean; };
  };
  assert.equal(textElement.type, "string-short");
  assert.equal(textElement.value, "1024x768");
  assert.equal(textElement.modifiers?.copyable, true);

  const ratioElement = dimensionCell.elements[1] as { type: string; value: number; };
  assert.equal(ratioElement.type, "ratio");
  assert.equal(ratioElement.value, 1024 / 768);

  // 2. Secondary collapsible table
  const secondaryGroup = uiContainer.elements[1] as CollapsibleGroupElement;
  assert.equal(secondaryGroup.type, "collapsible-group");
  assert.equal(secondaryGroup.title, "Details");
  const secondaryTable = secondaryGroup.elements[0] as TableElement;
  const secondaryLabels = secondaryTable.rows.map((row) => (row.cells[0] as { value?: string; }).value);

  assert.ok(secondaryLabels.includes("ExtraInfo"));
  assert.equal(secondaryLabels.includes("width"), false);
  assert.equal(secondaryLabels.includes("height"), false);
  assert.equal(secondaryLabels.includes("Created Date"), false);
});


