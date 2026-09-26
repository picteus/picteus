import { test } from "node:test";
import { strict as assert } from "node:assert/strict";

import {
  type CollapsibleGroupElement,
  type DimensionsElement,
  type FlowingElement,
  ImageFeatureFormat,
  ImageFeatureType,
  type MarkdownBlockElement,
  type RatioElement,
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
    value: string;
  }).value === "Dimensions");
  assert.ok(dimensionsRow);
  const dimensionsCell = dimensionsRow.cells[1] as FlowingElement;
  assert.equal(dimensionsCell.type, "flowing");
  assert.equal(dimensionsCell.elements.length, 2);
  const dimensionsItem = dimensionsCell.elements[0] as DimensionsElement;
  assert.equal(dimensionsItem.type, "dimensions");
  assert.equal(dimensionsItem.width, 1344);
  assert.equal(dimensionsItem.height, 768);
  const dimensionsRatio = dimensionsCell.elements[1] as RatioElement;
  assert.equal(dimensionsRatio.type, "ratio");
  assert.equal(dimensionsRatio.value, 1344 / 768);

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
  assert.ok(loraTable.columns);
  assert.equal(loraTable.columns.length, 3);
  assert.equal(loraTable.columns[0].header, "Name");
  assert.equal(loraTable.columns[1].header, "Model Strength");
  assert.equal(loraTable.columns[2].header, "CLIP Strength");
  assert.equal((loraTable.rows[0].cells[0] as { value: string }).value, "detail_slider_v1.safetensors");
  assert.equal((loraTable.rows[0].cells[1] as { value: number }).value, 0.85);
  assert.equal((loraTable.rows[0].cells[2] as { value: number }).value, 0.8);

  // Verify ControlNet collapsible group
  const controlNetGroup = collapsibleGroups.find((group) => group.title === "ControlNet & Adapters");
  assert.equal(controlNetGroup?.summary, "1 adapter");
  const controlNetTable = controlNetGroup?.elements[0] as TableElement;
  assert.equal(controlNetTable.columns.length, 4);
  assert.equal(controlNetTable.columns[0].header, "Name");
  assert.equal(controlNetTable.columns[1].header, "Strength");
  assert.equal(controlNetTable.columns[2].header, "Start Percent");
  assert.equal(controlNetTable.columns[3].header, "End Percent");
  assert.equal((controlNetTable.rows[0].cells[0] as { value: string }).value, "controlnet_depth_sdxl.safetensors");
  assert.equal((controlNetTable.rows[0].cells[1] as { value: number }).value, 0.75);
  assert.equal((controlNetTable.rows[0].cells[2] as { value: number }).value, 0);
  assert.equal((controlNetTable.rows[0].cells[3] as { value: number }).value, 0.8);

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

test("ComfyUIAnalyzer resolves dimensions from linked PrimitiveNode inputs in prompt DAG", () =>
{
  const linkedDimensionsPrompt = {
    "1": {
      class_type: "PrimitiveNode",
      inputs: {
        value: 1280
      }
    },
    "2": {
      class_type: "PrimitiveNode",
      inputs: {
        value: 720
      }
    },
    "3": {
      class_type: "EmptyLatentImage",
      inputs: {
        width: [ "1", 0 ],
        height: [ "2", 0 ],
        batch_size: 1
      }
    },
    "4": {
      class_type: "KSampler",
      inputs: {
        latent_image: [ "3", 0 ],
        steps: 20,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, linkedDimensionsPrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const dimensionsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Dimensions");

  assert.ok(dimensionsRow);
  const dimensionsCell = dimensionsRow.cells[1] as FlowingElement;
  assert.equal(dimensionsCell.type, "flowing");
  const dimensionsItem = dimensionsCell.elements[0] as DimensionsElement;
  assert.equal(dimensionsItem.type, "dimensions");
  assert.equal(dimensionsItem.width, 1280);
  assert.equal(dimensionsItem.height, 720);
  const dimensionsRatio = dimensionsCell.elements[1] as RatioElement;
  assert.equal(dimensionsRatio.type, "ratio");
  assert.equal(dimensionsRatio.value, 1280 / 720);
});

test("ComfyUIAnalyzer resolves dimensions from resolution preset string in prompt", () =>
{
  const presetPrompt = {
    "1": {
      class_type: "CR SDXL Aspect Ratio",
      inputs: {
        aspect_ratio: "16:9 (1344x768)",
        batch_size: 1
      }
    },
    "2": {
      class_type: "KSampler",
      inputs: {
        latent_image: [ "1", 0 ],
        steps: 25,
        cfg: 6.0,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1.0
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, presetPrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const dimensionsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Dimensions");

  assert.ok(dimensionsRow);
  const dimensionsCell = dimensionsRow.cells[1] as FlowingElement;
  assert.equal(dimensionsCell.type, "flowing");
  const dimensionsItem = dimensionsCell.elements[0] as DimensionsElement;
  assert.equal(dimensionsItem.type, "dimensions");
  assert.equal(dimensionsItem.width, 1344);
  assert.equal(dimensionsItem.height, 768);
  const dimensionsRatio = dimensionsCell.elements[1] as RatioElement;
  assert.equal(dimensionsRatio.type, "ratio");
  assert.equal(dimensionsRatio.value, 1344 / 768);
});

test("ComfyUIAnalyzer resolves dimensions through LatentUpscaleBy DAG link", () =>
{
  const upscalePrompt = {
    "1": {
      class_type: "EmptyLatentImage",
      inputs: {
        width: 512,
        height: 512,
        batch_size: 1
      }
    },
    "2": {
      class_type: "LatentUpscaleBy",
      inputs: {
        samples: [ "1", 0 ],
        scale_by: 2.0
      }
    },
    "3": {
      class_type: "KSampler",
      inputs: {
        latent_image: [ "2", 0 ],
        steps: 20,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 0.5
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, upscalePrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const dimensionsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Dimensions");

  assert.ok(dimensionsRow);
  const dimensionsCell = dimensionsRow.cells[1] as FlowingElement;
  assert.equal(dimensionsCell.type, "flowing");
  const dimensionsItem = dimensionsCell.elements[0] as DimensionsElement;
  assert.equal(dimensionsItem.type, "dimensions");
  assert.equal(dimensionsItem.width, 1024);
  assert.equal(dimensionsItem.height, 1024);
  const dimensionsRatio = dimensionsCell.elements[1] as RatioElement;
  assert.equal(dimensionsRatio.value, 1);
});

test("ComfyUIAnalyzer resolves linked seed from PrimitiveNode in prompt DAG", () =>
{
  const linkedSeedPrompt = {
    "1": {
      class_type: "PrimitiveNode",
      inputs: {
        value: 1234567890
      }
    },
    "2": {
      class_type: "KSampler",
      inputs: {
        seed: [ "1", 0 ],
        steps: 20,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, linkedSeedPrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const seedRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Seed");

  assert.ok(seedRow);
  assert.equal((seedRow?.cells[1] as { value: string }).value, "1234567890");
});

test("ComfyUIAnalyzer resolves seed from RandomNoise linked to SamplerCustom in prompt DAG", () =>
{
  const customSamplerPrompt = {
    "1": {
      class_type: "RandomNoise",
      inputs: {
        noise_seed: 987654321
      }
    },
    "2": {
      class_type: "SamplerCustom",
      inputs: {
        noise: [ "1", 0 ],
        steps: 30,
        cfg: 5.0,
        sampler_name: "dpmpp_2m"
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, customSamplerPrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const seedRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Seed");

  assert.ok(seedRow);
  assert.equal((seedRow?.cells[1] as { value: string }).value, "987654321");
});

test("ComfyUIAnalyzer resolves seed correctly from KSamplerAdvanced and workflow links", () =>
{
  const workflowWithAdvancedSampler = {
    nodes: [
      {
        id: 10,
        type: "PrimitiveNode",
        mode: 0,
        widgets_values: [ 4455667788, "fixed" ]
      },
      {
        id: 20,
        type: "KSamplerAdvanced",
        mode: 0,
        inputs: [
          { name: "noise_seed", type: "INT", link: 101 }
        ],
        widgets_values: [ "enable", 0, "fixed", 20, 7.0, "euler", "normal", 0, 10000, "disable" ]
      }
    ],
    links: [
      [ 101, 10, 0, 20, 0, "INT" ]
    ],
    groups: [],
    version: 0.4
  };

  const analyzer = new ComfyUIAnalyzer(workflowWithAdvancedSampler, undefined, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const seedRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Seed");

  assert.ok(seedRow);
  assert.equal((seedRow?.cells[1] as { value: string }).value, "4455667788");
});

test("ComfyUIAnalyzer correctly preserves seed 0 without treating it as undefined", () =>
{
  const zeroSeedPrompt = {
    "1": {
      class_type: "KSampler",
      inputs: {
        seed: 0,
        steps: 20,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, zeroSeedPrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;
  const seedRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Seed");

  assert.ok(seedRow);
  assert.equal((seedRow?.cells[1] as { value: string }).value, "0");
});

test("ComfyUIAnalyzer safely handles NaN, strings, and default numeric values in prompt inputs", () =>
{
  const messyPrompt = {
    "1": {
      class_type: "KSampler",
      inputs: {
        seed: 12345,
        steps: " 28 ",
        cfg: "7.5",
        denoise: "not-a-number",
        sampler_name: "euler",
        scheduler: "normal"
      }
    },
    "2": {
      class_type: "LoraLoader",
      inputs: {
        lora_name: "test_lora.safetensors",
        strength_model: "0.9",
        strength_clip: null
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, messyPrompt, {});
  const uiContainer = analyzer.toUiContainer();
  const primaryTable = uiContainer.elements[0] as TableElement;

  const stepsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Steps");
  assert.equal((stepsRow?.cells[1] as { value: number }).value, 28);

  const cfgRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "CFG Scale");
  assert.equal((cfgRow?.cells[1] as { value: number }).value, 7.5);

  const denoiseRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string;
  }).value === "Denoise");
  assert.equal(denoiseRow, undefined);
});

test("ComfyUIAnalyzer extracts workflow notes from standard and custom note nodes into collapsible group", () =>
{
  const workflowWithNotes = {
    nodes: [
      {
        id: 1,
        type: "KSampler",
        title: "KSampler",
        widgets_values: [ 12345, "fixed", 20, 7.0, "euler", "normal", 1.0 ]
      },
      {
        id: 2,
        type: "Note",
        title: "Setup Instructions",
        widgets_values: [ "Use SDXL base model with refiner at step 16." ]
      },
      {
        id: 3,
        type: "MarkdownNote",
        title: "Note",
        widgets_values: [ "# Important\n- Enable DPM++ 2M SDE\n- Set Karras scheduler" ]
      },
      {
        id: 4,
        type: "Note_O",
        title: "Note_O",
        widgets_values: [ "Quality of Life note: Remember to increase batch size." ]
      },
      {
        id: 5,
        type: "StickyNote",
        title: "Floyo Sticky Note",
        widgets_values: [ "Yellow sticky note: Check latent scale factor." ]
      },
      {
        id: 6,
        type: "CR Markdown Note",
        title: "Comfyroll Note",
        widgets_values: { markdown: "Comfyroll styling recipe notes." }
      },
      {
        id: 7,
        type: "PrimitiveNode",
        title: "Workflow Documentation",
        widgets_values: [ "Universal documentation primitive note." ]
      }
    ],
    links: []
  };

  const analyzer = new ComfyUIAnalyzer(workflowWithNotes, undefined, {});
  const notes = analyzer.getNotes();
  assert.equal(notes.length, 6);
  assert.equal(notes[0].title, "Setup Instructions");
  assert.equal(notes[0].content, "Use SDXL base model with refiner at step 16.");
  assert.equal(notes[1].title, undefined);
  assert.ok(notes[1].content.includes("# Important"));
  assert.equal(notes[2].title, undefined);
  assert.equal(notes[2].content, "Quality of Life note: Remember to increase batch size.");
  assert.equal(notes[3].title, "Floyo Sticky Note");
  assert.equal(notes[3].content, "Yellow sticky note: Check latent scale factor.");
  assert.equal(notes[4].title, "Comfyroll Note");
  assert.equal(notes[4].content, "Comfyroll styling recipe notes.");
  assert.equal(notes[5].title, "Workflow Documentation");
  assert.equal(notes[5].content, "Universal documentation primitive note.");

  const uiContainer = analyzer.toUiContainer();
  const collapsibleGroups = uiContainer.elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  const notesGroup = collapsibleGroups.find((group) => group.title === "Workflow Notes");

  assert.ok(notesGroup);
  assert.equal(notesGroup.summary, "6 notes");
  assert.equal(notesGroup.defaultExpanded, false);

  const notesTable = notesGroup.elements[0] as TableElement;
  assert.equal(notesTable.rows.length, 6);

  // Check markdown element
  const firstRowCell1 = notesTable.rows[0].cells[1] as MarkdownBlockElement;
  assert.equal(firstRowCell1.type, "markdown");
  assert.equal(firstRowCell1.content, "Use SDXL base model with refiner at step 16.");
  assert.equal(firstRowCell1.modifiers?.copyable, true);

  // Check title numbering fallback for generic titles
  assert.equal((notesTable.rows[0].cells[0] as { value: string }).value, "Setup Instructions");
  assert.equal((notesTable.rows[1].cells[0] as { value: string }).value, "Note 2");
  assert.equal((notesTable.rows[2].cells[0] as { value: string }).value, "Note 3");
  assert.equal((notesTable.rows[3].cells[0] as { value: string }).value, "Floyo Sticky Note");

  // Check disabling via settings
  const disabledAnalyzer = new ComfyUIAnalyzer(workflowWithNotes, undefined, { extractWorkflowNotes: false });
  const disabledContainer = disabledAnalyzer.toUiContainer();
  const disabledGroups = disabledContainer.elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  assert.equal(disabledGroups.some((group) => group.title === "Workflow Notes"), false);
});

test("ComfyUIAnalyzer extracts notes from prompt execution DAG", () =>
{
  const promptWithNotes = {
    "1": {
      class_type: "KSampler",
      inputs: {
        seed: 42,
        steps: 25,
        cfg: 7.0
      }
    },
    "2": {
      class_type: "Note",
      _meta: {
        title: "API Prompt Note"
      },
      inputs: {
        text: "This image was generated via ComfyUI API endpoint."
      }
    },
    "3": {
      class_type: "MarkdownNote",
      inputs: {
        text: "## API Parameters\n- Batch: 1\n- Resolution: 1024x1024"
      }
    }
  };

  const analyzer = new ComfyUIAnalyzer(undefined, promptWithNotes, {});
  const notes = analyzer.getNotes();
  assert.equal(notes.length, 2);
  assert.equal(notes[0].title, "API Prompt Note");
  assert.equal(notes[0].content, "This image was generated via ComfyUI API endpoint.");
  assert.equal(notes[1].title, undefined);
  assert.ok(notes[1].content.includes("## API Parameters"));

  const uiContainer = analyzer.toUiContainer();
  const collapsibleGroups = uiContainer.elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  const notesGroup = collapsibleGroups.find((group) => group.title === "Workflow Notes");
  assert.ok(notesGroup);
  assert.equal(notesGroup.summary, "2 notes");
});

