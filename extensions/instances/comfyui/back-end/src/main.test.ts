import { expect, test } from "@jest/globals";

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


test("ComfyUIAnalyzer extracts full generation recipe into ViewKit UiContainer", async () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {});
  const uiContainer = analyzer.toUiContainer();

  expect(uiContainer).toBeDefined();
  expect(uiContainer.schemaVersion).toBe("1.0");

  const elements = uiContainer.elements;
  expect(elements.length).toBeGreaterThanOrEqual(2);

  // 1. Primary section: 2-column table
  expect(elements[0].type).toBe("table");
  const primaryTable = elements[0] as TableElement;
  expect(primaryTable.rows.length).toBeGreaterThan(0);

  const rowLabels = primaryTable.rows.map((row: TableRow) => (row.cells[0] as { value: string }).value);
  expect(rowLabels).toContain("Prompt");
  expect(rowLabels).toContain("Negative Prompt");
  expect(rowLabels).toContain("Model");
  expect(rowLabels).toContain("Sampler");
  expect(rowLabels).toContain("Steps");
  expect(rowLabels).toContain("CFG Scale");
  expect(rowLabels).toContain("Seed");
  expect(rowLabels).toContain("Dimensions");
  expect(rowLabels).toContain("VAE");

  // Verify specific values in primary table
  const promptRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Prompt");
  expect((promptRow?.cells[1] as { value: string }).value).toContain("astronaut in a futuristic neon jungle");

  const negativePromptRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Negative Prompt");
  expect((negativePromptRow?.cells[1] as { value: string }).value).toContain("worst quality");

  const modelRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Model");
  expect((modelRow?.cells[1] as { value: string }).value).toBe("sd_xl_base_1.0.safetensors");

  const samplerRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Sampler");
  expect((samplerRow?.cells[1] as { value: string }).value).toBe("dpmpp_2m (karras)");

  const stepsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Steps");
  expect((stepsRow?.cells[1] as { value: number }).value).toBe(30);

  const cfgRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "CFG Scale");
  expect((cfgRow?.cells[1] as { value: number }).value).toBe(6.5);

  const seedRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as { value: string }).value === "Seed");
  expect((seedRow?.cells[1] as { value: string }).value).toBe("849204128");

  const dimensionsRow = primaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Dimensions");
  expect((dimensionsRow?.cells[1] as { value: string }).value).toContain("1344 × 768");

  // 2. Collapsible groups
  const collapsibleGroups = elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  const groupTitles = collapsibleGroups.map((group) => group.title);

  expect(groupTitles).toContain("LoRAs");
  expect(groupTitles).toContain("ControlNet & Adapters");
  expect(groupTitles).toContain("Upscaling & Refinement");
  expect(groupTitles).toContain("Input Images");
  expect(groupTitles).toContain("Workflow Topology");

  // Verify LoRAs collapsible group
  const loraGroup = collapsibleGroups.find((group) => group.title === "LoRAs");
  expect(loraGroup?.summary).toBe("1 LoRA");
  expect(loraGroup?.elements.length).toBe(1);
  const loraTable = loraGroup?.elements[0] as TableElement;
  expect((loraTable.rows[0].cells[0] as { value: string }).value).toBe("detail_slider_v1.safetensors");
  expect((loraTable.rows[0].cells[1] as { value: string }).value).toContain("Model: 0.85");

  // Verify ControlNet collapsible group
  const controlNetGroup = collapsibleGroups.find((group) => group.title === "ControlNet & Adapters");
  expect(controlNetGroup?.summary).toBe("1 adapter");
  const controlNetTable = controlNetGroup?.elements[0] as TableElement;
  expect((controlNetTable.rows[0].cells[0] as { value: string }).value).toBe("controlnet_depth_sdxl.safetensors");
  expect((controlNetTable.rows[0].cells[1] as { value: string }).value).toContain("Strength: 0.75");

  // Verify Upscaling collapsible group
  const upscaleGroup = collapsibleGroups.find((group) => group.title === "Upscaling & Refinement");
  const upscaleTable = upscaleGroup?.elements[0] as TableElement;
  const upscaleModelRow = upscaleTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Upscale Model");
  expect((upscaleModelRow?.cells[1] as { value: string }).value).toBe("4x-UltraSharp.pth");

  // Verify Input Images collapsible group
  const inputGroup = collapsibleGroups.find((group) => group.title === "Input Images");
  const inputTable = inputGroup?.elements[0] as TableElement;
  expect((inputTable.rows[0].cells[1] as { value: string }).value).toBe("input_reference_depth.png");

  // Verify Workflow Topology collapsible group
  const topologyGroup = collapsibleGroups.find((group) => group.title === "Workflow Topology");
  expect(topologyGroup?.elements.length).toBe(2);
  const topologySummaryTable = topologyGroup?.elements[0] as TableElement;
  const totalNodesRow = topologySummaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Total Nodes");
  expect((totalNodesRow?.cells[1] as { value: number }).value).toBe(13);
  const activeNodesRow = topologySummaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Active Nodes");
  expect((activeNodesRow?.cells[1] as { value: number }).value).toBe(12);
  const bypassedNodesRow = topologySummaryTable.rows.find((row: TableRow) => (row.cells[0] as {
    value: string
  }).value === "Bypassed Nodes");
  expect((bypassedNodesRow?.cells[1] as { value: number }).value).toBe(1);

  // 3. Serialization check
  const jsonString = uiContainer.toString();
  const parsed = JSON.parse(jsonString);
  expect(parsed.schemaVersion).toBe("1.0");
  expect(parsed.elements.length).toBe(elements.length);
});


test("ComfyUIAnalyzer computeFeatures returns ImageFeature with UI format", async () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {});
  const features = analyzer.computeFeatures();

  expect(features.length).toBe(1);
  expect(features[0].type).toBe(ImageFeatureType.Recipe);
  expect(features[0].format).toBe(ImageFeatureFormat.Ui);
  expect(features[0].value).toContain("\"schemaVersion\":\"1.0\"");
});


test("ComfyUIAnalyzer computeTags extracts relevant category tags", async () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {});
  const tags = analyzer.computeTags();

  expect(tags).toContain("model");
  expect(tags).toContain("sampling");
  expect(tags).toContain("conditioning");
  expect(tags).toContain("lora");
  expect(tags).toContain("controlnet");
  expect(tags).toContain("upscaling");
  expect(tags).toContain("image");
  expect(tags).not.toContain("other");
  expect(tags).not.toContain("utils");
});


test("ComfyUIAnalyzer respects settings to disable optional sections", async () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, samplePrompt, {
    extractLoRAsAndAdapters: false,
    extractUpscalingAndRefinement: false,
    extractWorkflowTopology: false
  });

  const uiContainer = analyzer.toUiContainer();
  const collapsibleGroups = uiContainer.elements.filter((element: UiElement) => element.type === "collapsible-group") as CollapsibleGroupElement[];
  const groupTitles = collapsibleGroups.map((group) => group.title);

  expect(groupTitles).not.toContain("LoRAs");
  expect(groupTitles).not.toContain("ControlNet & Adapters");
  expect(groupTitles).not.toContain("Upscaling & Refinement");
  expect(groupTitles).not.toContain("Workflow Topology");
  expect(groupTitles).toContain("Input Images");
});


test("ComfyUIAnalyzer works with workflow-only input", async () =>
{
  const analyzer = new ComfyUIAnalyzer(sampleWorkflow, undefined, {});
  const uiContainer = analyzer.toUiContainer();

  expect(uiContainer).toBeDefined();
  expect(uiContainer.elements.length).toBeGreaterThan(0);

  const primaryTable = uiContainer.elements[0] as TableElement;
  const rowLabels = primaryTable.rows.map((row: TableRow) => (row.cells[0] as { value: string }).value);
  expect(rowLabels).toContain("Model");
  expect(rowLabels).toContain("Sampler");
  expect(rowLabels).toContain("Steps");
  expect(rowLabels).toContain("Prompt");
});


test("ComfyUIAnalyzer works with prompt-only input", async () =>
{
  const analyzer = new ComfyUIAnalyzer(undefined, samplePrompt, {});
  const uiContainer = analyzer.toUiContainer();

  expect(uiContainer).toBeDefined();
  expect(uiContainer.elements.length).toBeGreaterThan(0);

  const primaryTable = uiContainer.elements[0] as TableElement;
  const rowLabels = primaryTable.rows.map((row: TableRow) => (row.cells[0] as { value: string }).value);
  expect(rowLabels).toContain("Prompt");
  expect(rowLabels).toContain("Negative Prompt");
  expect(rowLabels).toContain("Model");
  expect(rowLabels).toContain("Sampler");
});
