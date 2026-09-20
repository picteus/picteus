import { test } from "node:test";
import assert from "node:assert/strict";

import {
  type CollapsibleGroupElement,
  ImageFeatureFormat,
  ImageFeatureType,
  type TableElement,
  type TableRow,
  type UiElement
} from "@picteus/extension-sdk";

import { ComfyUIAnalyzer } from "./analyzers";


const samplePrompt = {
  "1": {
    class_type: "CheckpointLoaderSimple",
    inputs: {
      ckpt_name: "sd_xl_base_1.0.safetensors"
    }
  },
  "2": {
    class_type: "VAELoader",
    inputs: {
      vae_name: "sdxl_vae.safetensors"
    }
  },
  "3": {
    class_type: "LoraLoader",
    inputs: {
      lora_name: "detail_slider_v1.safetensors",
      strength_model: 0.85,
      strength_clip: 0.8,
      model: [ "1", 0 ],
      clip: [ "1", 1 ]
    }
  },
  "4": {
    class_type: "CLIPTextEncode",
    inputs: {
      text: "A cinematic photography of an astronaut in a futuristic neon jungle, intricate detail, 8k resolution, photorealistic",
      clip: [ "3", 1 ]
    }
  },
  "5": {
    class_type: "CLIPTextEncode",
    inputs: {
      text: "low quality, blurry, worst quality, distorted anatomy, text, watermark",
      clip: [ "3", 1 ]
    }
  },
  "6": {
    class_type: "EmptyLatentImage",
    inputs: {
      width: 1344,
      height: 768,
      batch_size: 1
    }
  },
  "7": {
    class_type: "ControlNetLoader",
    inputs: {
      control_net_name: "controlnet_depth_sdxl.safetensors"
    }
  },
  "8": {
    class_type: "ControlNetApplyAdvanced",
    inputs: {
      strength: 0.75,
      start_percent: 0.0,
      end_percent: 0.8,
      positive: [ "4", 0 ],
      control_net: [ "7", 0 ]
    }
  },
  "9": {
    class_type: "KSampler",
    inputs: {
      seed: 849204128,
      steps: 30,
      cfg: 6.5,
      sampler_name: "dpmpp_2m",
      scheduler: "karras",
      denoise: 1.0,
      model: [ "3", 0 ],
      positive: [ "8", 0 ],
      negative: [ "5", 0 ],
      latent_image: [ "6", 0 ]
    }
  },
  "10": {
    class_type: "UpscaleModelLoader",
    inputs: {
      model_name: "4x-UltraSharp.pth"
    }
  },
  "11": {
    class_type: "LoadImage",
    inputs: {
      image: "input_reference_depth.png"
    }
  },
  "12": {
    class_type: "FaceDetailer",
    inputs: {
      model_name: "bbox/face_yolov8m.pt"
    }
  }
};

const sampleWorkflow = {
  nodes: [
    {
      id: 1,
      type: "CheckpointLoaderSimple",
      title: "Base Model",
      widgets_values: [ "sd_xl_base_1.0.safetensors" ],
      mode: 0
    },
    {
      id: 2,
      type: "VAELoader",
      title: "SDXL VAE",
      widgets_values: [ "sdxl_vae.safetensors" ],
      mode: 0
    },
    {
      id: 3,
      type: "LoraLoader",
      title: "Detail Slider",
      widgets_values: [ "detail_slider_v1.safetensors", 0.85, 0.8 ],
      mode: 0
    },
    {
      id: 4,
      type: "CLIPTextEncode",
      title: "Positive Prompt",
      widgets_values: [ "A cinematic photography of an astronaut in a futuristic neon jungle, intricate detail, 8k resolution, photorealistic" ],
      mode: 0
    },
    {
      id: 5,
      type: "CLIPTextEncode",
      title: "Negative Prompt",
      widgets_values: [ "low quality, blurry, worst quality, distorted anatomy, text, watermark" ],
      mode: 0
    },
    {
      id: 6,
      type: "EmptyLatentImage",
      title: "Latent Dimensions",
      widgets_values: [ 1344, 768, 1 ],
      mode: 0
    },
    {
      id: 7,
      type: "ControlNetLoader",
      title: "Depth Model",
      widgets_values: [ "controlnet_depth_sdxl.safetensors" ],
      mode: 0
    },
    {
      id: 8,
      type: "ControlNetApplyAdvanced",
      title: "Apply Depth",
      mode: 0
    },
    {
      id: 9,
      type: "KSampler",
      title: "Base KSampler",
      widgets_values: [ 849204128, "fixed", 30, 6.5, "dpmpp_2m", "karras", 1.0 ],
      mode: 0
    },
    {
      id: 10,
      type: "UpscaleModelLoader",
      title: "4x Upscaler",
      widgets_values: [ "4x-UltraSharp.pth" ],
      mode: 0
    },
    {
      id: 11,
      type: "LoadImage",
      title: "Depth Reference",
      widgets_values: [ "input_reference_depth.png" ],
      mode: 0
    },
    {
      id: 12,
      type: "FaceDetailer",
      title: "Face Fixer",
      mode: 0
    },
    {
      id: 13,
      type: "Reroute",
      title: "Bypassed Helper",
      mode: 2
    }
  ],
  groups: [
    { title: "Model Setup & LoRA", color: "#3f51b5" },
    { title: "Prompt Conditioning", color: "#4caf50" },
    { title: "Sampling & Post-Processing", color: "#ff9800" }
  ],
  version: 0.4
};


test("ComfyUIAnalyzer extracts full generation recipe into ViewKit UiContainer", () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {});
  const uiContainer = analyzer.toUiContainer();

  assert.ok(uiContainer);
  assert.equal(uiContainer.schemaVersion, "1.0");

  const elements = uiContainer.elements;
  assert.ok(elements.length >= 2);

  // 1. Primary section: 2-column table
  assert.equal(elements[0].type, "table");
  const primaryTable = elements[0] as TableElement;
  assert.ok(primaryTable.rows.length > 0);

  const rowLabels = primaryTable.rows.map((row: TableRow) => (row.cells[0] as { value: string }).value);
  assert.ok(rowLabels.includes("Prompt"));
  assert.ok(rowLabels.includes("Negative Prompt"));
  assert.ok(rowLabels.includes("Model"));
  assert.ok(rowLabels.includes("Sampler"));
  assert.ok(rowLabels.includes("Steps"));
  assert.ok(rowLabels.includes("CFG Scale"));
  assert.ok(rowLabels.includes("Seed"));
  assert.ok(rowLabels.includes("Dimensions"));
  assert.ok(rowLabels.includes("VAE"));

  // Verify specific values in primary table
  const promptRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Prompt");
  assert.ok((promptRow?.cells[1] as { value: string }).value.includes("astronaut in a futuristic neon jungle"));

  const negativePromptRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Negative Prompt");
  assert.ok((negativePromptRow?.cells[1] as { value: string }).value.includes("worst quality"));

  const modelRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Model");
  assert.equal((modelRow?.cells[1] as { value: string }).value, "sd_xl_base_1.0.safetensors");

  const samplerRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Sampler");
  assert.equal((samplerRow?.cells[1] as { value: string }).value, "dpmpp_2m (karras)");

  const stepsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Steps");
  assert.equal((stepsRow?.cells[1] as { value: number }).value, 30);

  const cfgRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "CFG Scale");
  assert.equal((cfgRow?.cells[1] as { value: number }).value, 6.5);

  const seedRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Seed");
  assert.equal((seedRow?.cells[1] as { value: string }).value, "849204128");

  const dimensionsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Dimensions");
  assert.ok((dimensionsRow?.cells[1] as { value: string }).value.includes("1344 × 768"));

  // 2. Collapsible groups
  const collapsibleGroups = elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  const groupTitles = collapsibleGroups.map((group) => group.title);

  assert.ok(groupTitles.includes("LoRAs"));
  assert.ok(groupTitles.includes("ControlNet & Adapters"));
  assert.ok(groupTitles.includes("Upscaling & Refinement"));
  assert.ok(groupTitles.includes("Input Images"));
  assert.ok(groupTitles.includes("Workflow Topology"));

  // Verify LoRAs collapsible group
  const loraGroup = collapsibleGroups.find((group) => group.title === "LoRAs");
  assert.equal(loraGroup?.summary, "1 LoRA");
  assert.equal(loraGroup?.elements.length, 1);
  const loraTable = loraGroup?.elements[0] as TableElement;
  assert.equal((loraTable.rows[0].cells[0] as { value: string }).value, "detail_slider_v1.safetensors");
  assert.ok((loraTable.rows[0].cells[1] as { value: string }).value.includes("Model: 0.85"));

  // Verify ControlNet collapsible group
  const controlNetGroup = collapsibleGroups.find((group) => group.title === "ControlNet & Adapters");
  assert.equal(controlNetGroup?.summary, "1 adapter");
  const controlNetTable = controlNetGroup?.elements[0] as TableElement;
  assert.equal((controlNetTable.rows[0].cells[0] as { value: string }).value, "controlnet_depth_sdxl.safetensors");
  assert.ok((controlNetTable.rows[0].cells[1] as { value: string }).value.includes("Strength: 0.75"));

  // Verify Upscaling collapsible group
  const upscaleGroup = collapsibleGroups.find((group) => group.title === "Upscaling & Refinement");
  const upscaleTable = upscaleGroup?.elements[0] as TableElement;
  const upscaleModelRow = upscaleTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Upscale Model");
  assert.equal((upscaleModelRow?.cells[1] as { value: string }).value, "4x-UltraSharp.pth");

  // Verify Input Images collapsible group
  const inputGroup = collapsibleGroups.find((group) => group.title === "Input Images");
  const inputTable = inputGroup?.elements[0] as TableElement;
  assert.equal((inputTable.rows[0].cells[1] as { value: string }).value, "input_reference_depth.png");

  // Verify Workflow Topology collapsible group
  const topologyGroup = collapsibleGroups.find((group) => group.title === "Workflow Topology");
  assert.equal(topologyGroup?.elements.length, 2);
  const topologySummaryTable = topologyGroup?.elements[0] as TableElement;
  const totalNodesRow = topologySummaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Total Nodes");
  assert.equal((totalNodesRow?.cells[1] as { value: number }).value, 13);
  const activeNodesRow = topologySummaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Active Nodes");
  assert.equal((activeNodesRow?.cells[1] as { value: number }).value, 12);
  const bypassedNodesRow = topologySummaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Bypassed Nodes");
  assert.equal((bypassedNodesRow?.cells[1] as { value: number }).value, 1);

  // 3. Serialization check
  const jsonString = uiContainer.toString();
  const parsed = JSON.parse(jsonString);
  assert.equal(parsed.schemaVersion, "1.0");
  assert.equal(parsed.elements.length, elements.length);
});

test("ComfyUIAnalyzer computeFeatures returns ImageFeature with UI format", () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {});
  const features = analyzer.computeFeatures();

  assert.equal(features.length, 1);
  assert.equal(features[0].type, ImageFeatureType.Recipe);
  assert.equal(features[0].format, ImageFeatureFormat.Ui);
  assert.ok(String(features[0].value).includes("\"schemaVersion\":\"1.0\""));
});

test("ComfyUIAnalyzer computeTags extracts relevant category tags", () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {});
  const tags = analyzer.computeTags();

  assert.ok(tags.includes("model"));
  assert.ok(tags.includes("sampling"));
  assert.ok(tags.includes("conditioning"));
  assert.ok(tags.includes("lora"));
  assert.ok(tags.includes("controlnet"));
  assert.ok(tags.includes("upscaling"));
  assert.ok(tags.includes("image"));
  assert.equal(tags.includes("other"), false);
  assert.equal(tags.includes("utils"), false);
});

test("ComfyUIAnalyzer respects settings to disable optional sections", () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {
    extractLoRAsAndAdapters: false,
    extractUpscalingAndRefinement: false,
    extractWorkflowTopology: false
  });

  const uiContainer = analyzer.toUiContainer();
  const collapsibleGroups = uiContainer.elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  const groupTitles = collapsibleGroups.map((group) => group.title);

  assert.equal(groupTitles.includes("LoRAs"), false);
  assert.equal(groupTitles.includes("ControlNet & Adapters"), false);
  assert.equal(groupTitles.includes("Upscaling & Refinement"), false);
  assert.equal(groupTitles.includes("Workflow Topology"), false);
  assert.ok(groupTitles.includes("Input Images"));
});

test("ComfyUIAnalyzer works with workflow-only input", () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, undefined, {});
  const uiContainer = analyzer.toUiContainer();

  assert.ok(uiContainer);
  assert.ok(uiContainer.elements.length > 0);

  const primaryTable = uiContainer.elements[0] as TableElement;
  const rowLabels = primaryTable.rows.map((row: TableRow) => (row.cells[0] as { value: string }).value);
  assert.ok(rowLabels.includes("Model"));
  assert.ok(rowLabels.includes("Sampler"));
  assert.ok(rowLabels.includes("Steps"));
  assert.ok(rowLabels.includes("Prompt"));
});

test("ComfyUIAnalyzer works with prompt-only input", () =>
{
  const analyzer = new ComfyUIAnalyzer(undefined, samplePrompt, {});
  const uiContainer = analyzer.toUiContainer();

  assert.ok(uiContainer);
  assert.ok(uiContainer.elements.length > 0);

  const primaryTable = uiContainer.elements[0] as TableElement;
  const rowLabels = primaryTable.rows.map((row: TableRow) => (row.cells[0] as { value: string }).value);
  assert.ok(rowLabels.includes("Prompt"));
  assert.ok(rowLabels.includes("Negative Prompt"));
  assert.ok(rowLabels.includes("Model"));
  assert.ok(rowLabels.includes("Sampler"));
});
