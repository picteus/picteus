import {
  collapsibleGroup,
  createUiContainer,
  identifier,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  numberUnbounded,
  stringLong,
  stringShort,
  table,
  type TableRow,
  tableRow,
  TextIntensity,
  TextWeight,
  type UiContainerClass,
  type UiElement
} from "@picteus/extension-sdk";


type Json = Record<string, any>;

/**
 * Settings controlling which insightful metadata is extracted from ComfyUI workflows.
 */
export interface ComfyUIAnalyzerSettings
{
  readonly extractLoRAsAndAdapters?: boolean;
  readonly extractUpscalingAndRefinement?: boolean;
  readonly extractWorkflowTopology?: boolean;
}

/**
 * Extracted primary sampling and generation parameters.
 */
export interface ComfyUISamplerData
{
  samplerName?: string;
  scheduler?: string;
  steps?: number;
  cfg?: number;
  seed?: number | string;
  denoise?: number;
  positivePrompt?: string;
  negativePrompt?: string;
  modelName?: string;
  vaeName?: string;
  clipNames?: string[];
  width?: number;
  height?: number;
  batchSize?: number;
}

/**
 * Extracted LoRA model details.
 */
export interface ComfyUILoraData
{
  name: string;
  modelStrength?: number;
  clipStrength?: number;
}

/**
 * Extracted ControlNet and adapter details.
 */
export interface ComfyUIControlNetData
{
  name: string;
  strength?: number;
  startPercent?: number;
  endPercent?: number;
}

/**
 * Extracted upscaling, refiner, and face detailer parameters.
 */
export interface ComfyUIUpscaleData
{
  modelName?: string;
  scaleFactor?: number;
  refinerSampler?: string;
  refinerSteps?: number;
  refinerDenoise?: number;
  faceDetailerModel?: string;
}

/**
 * Extracted workflow topology metrics and breakdown.
 */
export interface ComfyUIWorkflowTopology
{
  totalNodes: number;
  activeNodes: number;
  bypassedNodes: number;
  groups: string[];
  categories: Record<string, { count: number; types: string[] }>;
  customNodePacks: string[];
}

/**
 * Analyzes ComfyUI workflows and execution prompts to extract insightful parameters and build ViewKit UI cards.
 */
export class ComfyUIAnalyzer
{

  private readonly samplerData: ComfyUISamplerData;

  private readonly loras: ComfyUILoraData[];

  private readonly controlNets: ComfyUIControlNetData[];

  private readonly upscaleData: ComfyUIUpscaleData;

  private readonly inputImages: string[];

  private readonly topology: ComfyUIWorkflowTopology;

  constructor(private readonly workflow: Json, private readonly prompt: Json, private readonly settings: ComfyUIAnalyzerSettings)
  {
    this.samplerData = this.extractSamplerData();
    this.loras = this.extractLoras();
    this.controlNets = this.extractControlNets();
    this.upscaleData = this.extractUpscaleData();
    this.inputImages = this.extractInputImages();
    this.topology = this.extractTopology();
  }

  computeTags(): string[]
  {
    const tags = new Set<string>();
    for (const category of Object.keys(this.topology.categories))
    {
      if (category !== "other" && category !== "utils")
      {
        tags.add(category);
      }
    }
    return Array.from(tags);
  }

  computeFeatures(): ImageFeature[]
  {
    const imageFeatures: ImageFeature[] = [];
    const uiContainer = this.toUiContainer();
    if (uiContainer.elements.length > 0)
    {
      imageFeatures.push({
        type: ImageFeatureType.Recipe,
        format: ImageFeatureFormat.Ui,
        value: uiContainer.toString()
      });
    }
    return imageFeatures;
  }

  toUiContainer(): UiContainerClass
  {
    const primaryRows: TableRow[] = [];
    const firstColumnOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
    const copyableOptions = { modifiers: { copyable: true } };

    // 1. Positive Prompt
    if (this.samplerData.positivePrompt !== undefined && this.samplerData.positivePrompt.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Prompt", firstColumnOptions),
        stringLong(this.samplerData.positivePrompt.trim(), copyableOptions)
      ]));
    }

    // 2. Negative Prompt
    if (this.samplerData.negativePrompt !== undefined && this.samplerData.negativePrompt.trim().length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Negative Prompt", firstColumnOptions),
        stringLong(this.samplerData.negativePrompt.trim(), copyableOptions)
      ]));
    }

    // 3. Model / Checkpoint
    if (this.samplerData.modelName !== undefined && this.samplerData.modelName.length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("Model", firstColumnOptions),
        stringShort(this.samplerData.modelName, copyableOptions)
      ]));
    }

    // 4. Sampler & Scheduler
    if (this.samplerData.samplerName !== undefined || this.samplerData.scheduler !== undefined)
    {
      const samplerParts: string[] = [];
      if (this.samplerData.samplerName !== undefined)
      {
        samplerParts.push(this.samplerData.samplerName);
      }
      if (this.samplerData.scheduler !== undefined)
      {
        samplerParts.push(`(${this.samplerData.scheduler})`);
      }
      primaryRows.push(tableRow([
        stringShort("Sampler", firstColumnOptions),
        stringShort(samplerParts.join(" "), copyableOptions)
      ]));
    }

    // 5. Steps
    if (this.samplerData.steps !== undefined)
    {
      primaryRows.push(tableRow([
        stringShort("Steps", firstColumnOptions),
        numberUnbounded(this.samplerData.steps, copyableOptions)
      ]));
    }

    // 6. CFG Scale
    if (this.samplerData.cfg !== undefined)
    {
      primaryRows.push(tableRow([
        stringShort("CFG Scale", firstColumnOptions),
        numberUnbounded(this.samplerData.cfg, copyableOptions)
      ]));
    }

    // 7. Seed
    if (this.samplerData.seed !== undefined)
    {
      primaryRows.push(tableRow([
        stringShort("Seed", firstColumnOptions),
        identifier(String(this.samplerData.seed), copyableOptions)
      ]));
    }

    // 8. Dimensions & Aspect Ratio
    if (this.samplerData.width !== undefined && this.samplerData.height !== undefined)
    {
      primaryRows.push(tableRow([
        stringShort("Dimensions", firstColumnOptions),
        stringShort(`${this.samplerData.width} × ${this.samplerData.height}`, copyableOptions)
      ]));
    }

    // 9. Denoise (when less than 1.0)
    if (this.samplerData.denoise !== undefined && this.samplerData.denoise < 1)
    {
      primaryRows.push(tableRow([
        stringShort("Denoise", firstColumnOptions),
        numberUnbounded(this.samplerData.denoise, copyableOptions)
      ]));
    }

    // 10. VAE
    if (this.samplerData.vaeName !== undefined && this.samplerData.vaeName.length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("VAE", firstColumnOptions),
        stringShort(this.samplerData.vaeName, copyableOptions)
      ]));
    }

    // 11. CLIP Encoders
    if (this.samplerData.clipNames !== undefined && this.samplerData.clipNames.length > 0)
    {
      primaryRows.push(tableRow([
        stringShort("CLIP", firstColumnOptions),
        stringShort(this.samplerData.clipNames.join(", "), copyableOptions)
      ]));
    }

    const elements: UiElement[] = [];

    // Primary Table
    if (primaryRows.length > 0)
    {
      elements.push(table(primaryRows, { withRowSeparators: true }));
    }

    // Collapsible: LoRAs
    if (this.settings.extractLoRAsAndAdapters !== false && this.loras.length > 0)
    {
      const loraRows: TableRow[] = this.loras.map((lora) =>
      {
        const strengths: string[] = [];
        if (lora.modelStrength !== undefined)
        {
          strengths.push(`Model: ${lora.modelStrength}`);
        }
        if (lora.clipStrength !== undefined)
        {
          strengths.push(`CLIP: ${lora.clipStrength}`);
        }
        return tableRow([
          stringShort(lora.name, { modifiers: { weight: TextWeight.heavy, copyable: true } }),
          stringShort(strengths.length > 0 ? strengths.join(" | ") : "Standard", copyableOptions)
        ]);
      });

      elements.push(collapsibleGroup(
        "LoRAs",
        [ table(loraRows, { withRowSeparators: true }) ],
        {
          summary: `${this.loras.length} ${this.loras.length === 1 ? "LoRA" : "LoRAs"}`,
          defaultExpanded: false
        }
      ));
    }

    // Collapsible: ControlNets & Adapters
    if (this.settings.extractLoRAsAndAdapters !== false && this.controlNets.length > 0)
    {
      const controlNetRows: TableRow[] = this.controlNets.map((controlNet) =>
      {
        const details: string[] = [];
        if (controlNet.strength !== undefined)
        {
          details.push(`Strength: ${controlNet.strength}`);
        }
        if (controlNet.startPercent !== undefined || controlNet.endPercent !== undefined)
        {
          const startPercentage = Math.round((controlNet.startPercent ?? 0) * 100);
          const endPercentage = Math.round((controlNet.endPercent ?? 1) * 100);
          details.push(`Range: ${startPercentage}% - ${endPercentage}%`);
        }
        return tableRow([
          stringShort(controlNet.name, { modifiers: { weight: TextWeight.heavy, copyable: true } }),
          stringShort(details.length > 0 ? details.join(" | ") : "Active", copyableOptions)
        ]);
      });

      elements.push(collapsibleGroup(
        "ControlNet & Adapters",
        [ table(controlNetRows, { withRowSeparators: true }) ],
        {
          summary: `${this.controlNets.length} ${this.controlNets.length === 1 ? "adapter" : "adapters"}`,
          defaultExpanded: false
        }
      ));
    }

    // Collapsible: Upscaling & Refinement
    if (this.settings.extractUpscalingAndRefinement !== false && this.hasUpscaleData())
    {
      const upscaleRows: TableRow[] = [];
      if (this.upscaleData.modelName !== undefined)
      {
        upscaleRows.push(tableRow([
          stringShort("Upscale Model", firstColumnOptions),
          stringShort(this.upscaleData.modelName, copyableOptions)
        ]));
      }
      if (this.upscaleData.scaleFactor !== undefined)
      {
        upscaleRows.push(tableRow([
          stringShort("Scale Factor", firstColumnOptions),
          numberUnbounded(this.upscaleData.scaleFactor, copyableOptions)
        ]));
      }
      if (this.upscaleData.refinerSampler !== undefined)
      {
        upscaleRows.push(tableRow([
          stringShort("Refiner Sampler", firstColumnOptions),
          stringShort(this.upscaleData.refinerSampler, copyableOptions)
        ]));
      }
      if (this.upscaleData.refinerSteps !== undefined)
      {
        upscaleRows.push(tableRow([
          stringShort("Refiner Steps", firstColumnOptions),
          numberUnbounded(this.upscaleData.refinerSteps, copyableOptions)
        ]));
      }
      if (this.upscaleData.refinerDenoise !== undefined)
      {
        upscaleRows.push(tableRow([
          stringShort("Refiner Denoise", firstColumnOptions),
          numberUnbounded(this.upscaleData.refinerDenoise, copyableOptions)
        ]));
      }
      if (this.upscaleData.faceDetailerModel !== undefined)
      {
        upscaleRows.push(tableRow([
          stringShort("Face Detailer", firstColumnOptions),
          stringShort(this.upscaleData.faceDetailerModel, copyableOptions)
        ]));
      }

      if (upscaleRows.length > 0)
      {
        elements.push(collapsibleGroup(
          "Upscaling & Refinement",
          [ table(upscaleRows, { withRowSeparators: true }) ],
          {
            summary: `${upscaleRows.length} ${upscaleRows.length === 1 ? "property" : "properties"}`,
            defaultExpanded: false
          }
        ));
      }
    }

    // Collapsible: Input Images
    if (this.inputImages.length > 0)
    {
      const inputRows: TableRow[] = this.inputImages.map((imageFileName, imageIndex) =>
      {
        return tableRow([
          stringShort(`Image ${imageIndex + 1}`, firstColumnOptions),
          stringShort(imageFileName, copyableOptions)
        ]);
      });

      elements.push(collapsibleGroup(
        "Input Images",
        [ table(inputRows, { withRowSeparators: true }) ],
        {
          summary: `${this.inputImages.length} ${this.inputImages.length === 1 ? "image" : "images"}`,
          defaultExpanded: false
        }
      ));
    }

    // Collapsible: Workflow Topology
    if (this.settings.extractWorkflowTopology !== false && this.topology.totalNodes > 0)
    {
      const topologyElements: UiElement[] = [];

      const summaryRows: TableRow[] = [
        tableRow([ stringShort("Total Nodes", firstColumnOptions), numberUnbounded(this.topology.totalNodes) ]),
        tableRow([ stringShort("Active Nodes", firstColumnOptions), numberUnbounded(this.topology.activeNodes) ])
      ];
      if (this.topology.bypassedNodes > 0)
      {
        summaryRows.push(tableRow([ stringShort("Bypassed Nodes", firstColumnOptions), numberUnbounded(this.topology.bypassedNodes) ]));
      }
      if (this.topology.groups.length > 0)
      {
        summaryRows.push(tableRow([ stringShort("Workflow Groups", firstColumnOptions), stringShort(this.topology.groups.join(", "), copyableOptions) ]));
      }
      if (this.topology.customNodePacks.length > 0)
      {
        summaryRows.push(tableRow([ stringShort("Custom Packs", firstColumnOptions), stringShort(this.topology.customNodePacks.join(", "), copyableOptions) ]));
      }

      topologyElements.push(table(summaryRows, { withRowSeparators: true }));

      const categoryRows: TableRow[] = [];
      const sortedCategories = Object.entries(this.topology.categories).sort((categoryA, categoryB) => categoryB[1].count - categoryA[1].count);
      for (const [ category, data ] of sortedCategories)
      {
        categoryRows.push(tableRow([
          stringShort(category, { modifiers: { weight: TextWeight.heavy } }),
          numberUnbounded(data.count),
          stringShort(data.types.join(", "), copyableOptions)
        ]));
      }

      if (categoryRows.length > 0)
      {
        topologyElements.push(table(categoryRows, {
          hasHeader: true,
          withRowSeparators: true,
          columns: [
            { header: "Category", width: "25%" },
            { header: "Count", width: "15%" },
            { header: "Node Types", width: "60%" }
          ]
        }));
      }

      elements.push(collapsibleGroup(
        "Workflow Topology",
        topologyElements,
        {
          summary: `${this.topology.totalNodes} nodes (${this.topology.activeNodes} active)`,
          defaultExpanded: false
        }
      ));
    }

    return createUiContainer({ elements });
  }

  getAspectRatio()
  {
    return (this.samplerData.width === undefined || this.samplerData.height === undefined || this.samplerData.height === 0) ? undefined : (this.samplerData.width / this.samplerData.height);
  }

  private hasUpscaleData(): boolean
  {
    return this.upscaleData.modelName !== undefined ||
      this.upscaleData.scaleFactor !== undefined ||
      this.upscaleData.refinerSampler !== undefined ||
      this.upscaleData.faceDetailerModel !== undefined;
  }

  private extractSamplerData(): ComfyUISamplerData
  {
    const samplerData: ComfyUISamplerData = {};

    // We trace nodes through the prompt execution DAG if available
    if (this.prompt && typeof this.prompt === "object")
    {
      let primarySamplerNode: Json | undefined;

      for (const [ _nodeId, node ] of Object.entries(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        if (classType.includes("ksampler") || classType === "samplercustom")
        {
          const inputs = node["inputs"] || {};
          const denoise = inputs["denoise"] !== undefined ? Number(inputs["denoise"]) : 1;
          // We select the base sampler (typically denoise === 1 or first encountered)
          if (primarySamplerNode === undefined || denoise === 1)
          {
            primarySamplerNode = node;
            if (denoise === 1)
            {
              break;
            }
          }
        }
      }

      if (primarySamplerNode)
      {
        const inputs = primarySamplerNode["inputs"] || {};
        samplerData.seed = inputs["seed"] ?? inputs["noise_seed"];
        samplerData.steps = inputs["steps"] !== undefined && typeof inputs["steps"] === "number" ? Number(inputs["steps"]) : undefined;
        samplerData.cfg = inputs["cfg"] !== undefined && typeof inputs["cfg"] === "number" ? Number(inputs["cfg"]) : undefined;
        samplerData.samplerName = inputs["sampler_name"];
        samplerData.scheduler = inputs["scheduler"];
        samplerData.denoise = inputs["denoise"] !== undefined ? Number(inputs["denoise"]) : undefined;

        // We trace positive and negative prompts via conditioning links
        if (inputs["positive"])
        {
          samplerData.positivePrompt = this.tracePromptTextFromPromptDag(inputs["positive"]);
        }
        if (inputs["negative"])
        {
          samplerData.negativePrompt = this.tracePromptTextFromPromptDag(inputs["negative"]);
        }

        // We trace model / checkpoint via model links
        if (inputs["model"])
        {
          samplerData.modelName = this.traceModelNameFromPromptDag(inputs["model"]);
        }

        // We trace latent dimensions via latent_image links
        if (inputs["latent_image"])
        {
          const dimensions = this.traceLatentDimensionsFromPromptDag(inputs["latent_image"]);
          if (dimensions)
          {
            samplerData.width = dimensions.width;
            samplerData.height = dimensions.height;
            samplerData.batchSize = dimensions.batchSize;
          }
        }
      }

      // We inspect other loader nodes if not yet resolved
      for (const node of Object.values(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        const inputs = node["inputs"] || {};

        if (!samplerData.modelName)
        {
          if (classType.includes("checkpointloader"))
          {
            samplerData.modelName = inputs["ckpt_name"];
          }
          else if (classType.includes("unetloader"))
          {
            samplerData.modelName = inputs["unet_name"];
          }
          else if (classType.includes("diffusionmodelloader"))
          {
            samplerData.modelName = inputs["model_name"];
          }
        }

        if (!samplerData.vaeName && classType.includes("vaeloader"))
        {
          samplerData.vaeName = inputs["vae_name"];
        }

        if (classType.includes("cliploader"))
        {
          if (!samplerData.clipNames)
          {
            samplerData.clipNames = [];
          }
          const clipName: string | undefined = inputs["clip_name"] ?? inputs["clip_name1"];
          if (clipName && !samplerData.clipNames.includes(clipName))
          {
            samplerData.clipNames.push(clipName);
          }
          const clipNameTwo: string | undefined = inputs["clip_name2"];
          if (clipNameTwo && !samplerData.clipNames.includes(clipNameTwo))
          {
            samplerData.clipNames.push(clipNameTwo);
          }
        }

        if (samplerData.width === undefined && classType.includes("latent"))
        {
          if (inputs["width"] !== undefined && inputs["height"] !== undefined)
          {
            samplerData.width = Number(inputs["width"]);
            samplerData.height = Number(inputs["height"]);
            samplerData.batchSize = inputs["batch_size"] !== undefined ? Number(inputs["batch_size"]) : undefined;
          }
        }
      }
    }

    // We fallback or supplement with workflow UI graph analysis
    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      for (const node of this.workflow.nodes)
      {
        const nodeType: string = (node["type"] || "").toLowerCase();
        const widgetsValues: unknown = node["widgets_values"];
        const nodeTitle: string = (node["title"] || "").toLowerCase();

        // Sampler parameters
        if (nodeType.includes("ksampler") && Array.isArray(widgetsValues))
        {
          if (samplerData.seed === undefined && widgetsValues[0] !== undefined)
          {
            samplerData.seed = widgetsValues[0];
          }
          if (samplerData.steps === undefined && widgetsValues[2] !== undefined)
          {
            samplerData.steps = typeof widgetsValues[2] !== "number" ? undefined : Number(widgetsValues[2]);
          }
          if (samplerData.cfg === undefined && widgetsValues[3] !== undefined)
          {
            samplerData.cfg = typeof widgetsValues[3] !== "number" ? undefined : Number(widgetsValues[3]);
          }
          if (samplerData.samplerName === undefined && typeof widgetsValues[4] === "string")
          {
            samplerData.samplerName = widgetsValues[4];
          }
          if (samplerData.scheduler === undefined && typeof widgetsValues[5] === "string")
          {
            samplerData.scheduler = widgetsValues[5];
          }
          if (samplerData.denoise === undefined && widgetsValues[6] !== undefined)
          {
            samplerData.denoise = Number(widgetsValues[6]);
          }
        }

        // Checkpoint / Model
        if (!samplerData.modelName && (nodeType.includes("checkpoint") || nodeType.includes("unetloader")) && Array.isArray(widgetsValues))
        {
          if (typeof widgetsValues[0] === "string")
          {
            samplerData.modelName = widgetsValues[0];
          }
        }

        // VAE
        if (!samplerData.vaeName && nodeType.includes("vaeloader") && Array.isArray(widgetsValues))
        {
          if (typeof widgetsValues[0] === "string")
          {
            samplerData.vaeName = widgetsValues[0];
          }
        }

        // Empty Latent Image
        if (samplerData.width === undefined && nodeType.includes("latent") && Array.isArray(widgetsValues))
        {
          if (widgetsValues[0] !== undefined && widgetsValues[1] !== undefined)
          {
            samplerData.width = Number(widgetsValues[0]);
            samplerData.height = Number(widgetsValues[1]);
            samplerData.batchSize = widgetsValues[2] !== undefined ? Number(widgetsValues[2]) : undefined;
          }
        }

        // Text prompt fallback based on node titles
        if (nodeType.includes("cliptextencode") || nodeType.includes("textencode"))
        {
          let promptText: string | undefined;
          if (Array.isArray(widgetsValues) && typeof widgetsValues[0] === "string")
          {
            promptText = widgetsValues[0];
          }
          else if (widgetsValues && typeof widgetsValues === "object" && typeof (widgetsValues as Record<string, unknown>)["text"] === "string")
          {
            promptText = (widgetsValues as Record<string, unknown>)["text"] as string;
          }

          if (promptText && promptText.trim().length > 0)
          {
            if (nodeTitle.includes("neg") && !samplerData.negativePrompt)
            {
              samplerData.negativePrompt = promptText;
            }
            else if ((nodeTitle.includes("pos") || !samplerData.positivePrompt) && !nodeTitle.includes("neg"))
            {
              if (!samplerData.positivePrompt)
              {
                samplerData.positivePrompt = promptText;
              }
            }
          }
        }
      }
    }

    return samplerData;
  }

  private tracePromptTextFromPromptDag(linkTarget: unknown): string | undefined
  {
    if (!Array.isArray(linkTarget) || linkTarget.length < 1 || !this.prompt)
    {
      return undefined;
    }

    const targetNodeId: string = String(linkTarget[0]);
    const visitedNodeIds = new Set<string>();

    const resolveText = (nodeId: string): string | undefined =>
    {
      if (visitedNodeIds.has(nodeId))
      {
        return undefined;
      }
      visitedNodeIds.add(nodeId);

      const targetNode = this.prompt?.[nodeId];
      if (!targetNode)
      {
        return undefined;
      }

      const classType: string = (targetNode["class_type"] || "").toLowerCase();
      const inputs = targetNode["inputs"] || {};

      if (classType.includes("cliptextencode") || classType.includes("textencode") || classType === "showtext" || classType === "primitivenode")
      {
        if (typeof inputs["text"] === "string" && inputs["text"].trim().length > 0)
        {
          return inputs["text"];
        }
        if (typeof inputs["text_g"] === "string" && inputs["text_g"].trim().length > 0)
        {
          const textG: string = inputs["text_g"];
          const textL: string = typeof inputs["text_l"] === "string" ? inputs["text_l"] : "";
          if (textL.trim().length > 0 && textL !== textG)
          {
            return `${textG}\n${textL}`;
          }
          return textG;
        }
        if (typeof inputs["clip_l"] === "string" && inputs["clip_l"].trim().length > 0)
        {
          return inputs["clip_l"];
        }
        if (typeof inputs["t5xxl"] === "string" && inputs["t5xxl"].trim().length > 0)
        {
          return inputs["t5xxl"];
        }
      }

      if (classType.includes("conditioningcombine"))
      {
        const textOne = inputs["conditioning_1"] ? resolveText(String(inputs["conditioning_1"][0])) : undefined;
        const textTwo = inputs["conditioning_2"] ? resolveText(String(inputs["conditioning_2"][0])) : undefined;
        return [ textOne, textTwo ].filter((item) => item !== undefined).join("\n");
      }

      // We pass through upstream positive, negative, conditioning, or clip connections
      if (inputs["positive"] && Array.isArray(inputs["positive"]))
      {
        const upstreamText = resolveText(String(inputs["positive"][0]));
        if (upstreamText)
        {
          return upstreamText;
        }
      }
      if (inputs["negative"] && Array.isArray(inputs["negative"]))
      {
        const upstreamText = resolveText(String(inputs["negative"][0]));
        if (upstreamText)
        {
          return upstreamText;
        }
      }
      if (inputs["conditioning"] && Array.isArray(inputs["conditioning"]))
      {
        const upstreamText = resolveText(String(inputs["conditioning"][0]));
        if (upstreamText)
        {
          return upstreamText;
        }
      }
      if (inputs["clip"] && Array.isArray(inputs["clip"]))
      {
        const upstreamText = resolveText(String(inputs["clip"][0]));
        if (upstreamText)
        {
          return upstreamText;
        }
      }
      if (inputs["text"] && Array.isArray(inputs["text"]))
      {
        const upstreamText = resolveText(String(inputs["text"][0]));
        if (upstreamText)
        {
          return upstreamText;
        }
      }

      return undefined;
    };

    return resolveText(targetNodeId);
  }

  private traceModelNameFromPromptDag(linkTarget: unknown): string | undefined
  {
    if (!Array.isArray(linkTarget) || linkTarget.length < 1 || !this.prompt)
    {
      return undefined;
    }

    const targetNodeId: string = String(linkTarget[0]);
    const visitedNodeIds = new Set<string>();

    const resolveModel = (nodeId: string): string | undefined =>
    {
      if (visitedNodeIds.has(nodeId))
      {
        return undefined;
      }
      visitedNodeIds.add(nodeId);

      const targetNode = this.prompt?.[nodeId];
      if (!targetNode)
      {
        return undefined;
      }

      const classType: string = (targetNode["class_type"] || "").toLowerCase();
      const inputs = targetNode["inputs"] || {};

      if (classType.includes("checkpointloader"))
      {
        return inputs["ckpt_name"];
      }
      if (classType.includes("unetloader"))
      {
        return inputs["unet_name"];
      }
      if (classType.includes("diffusionmodelloader"))
      {
        return inputs["model_name"];
      }

      // We trace upstream model input through LoRA or model modifiers
      if (inputs["model"] && Array.isArray(inputs["model"]))
      {
        return resolveModel(String(inputs["model"][0]));
      }

      return undefined;
    };

    return resolveModel(targetNodeId);
  }

  private traceLatentDimensionsFromPromptDag(linkTarget: unknown): {
    width: number;
    height: number;
    batchSize?: number
  } | undefined
  {
    if (!Array.isArray(linkTarget) || linkTarget.length < 1 || !this.prompt)
    {
      return undefined;
    }

    const targetNodeId: string = String(linkTarget[0]);
    const visitedNodeIds = new Set<string>();

    const resolveDimensions = (nodeId: string): { width: number; height: number; batchSize?: number } | undefined =>
    {
      if (visitedNodeIds.has(nodeId))
      {
        return undefined;
      }
      visitedNodeIds.add(nodeId);

      const targetNode = this.prompt?.[nodeId];
      if (!targetNode)
      {
        return undefined;
      }

      const classType: string = (targetNode["class_type"] || "").toLowerCase();
      const inputs = targetNode["inputs"] || {};

      if (classType.includes("latent"))
      {
        if (inputs["width"] !== undefined && inputs["height"] !== undefined)
        {
          return {
            width: Number(inputs["width"]),
            height: Number(inputs["height"]),
            batchSize: inputs["batch_size"] !== undefined ? Number(inputs["batch_size"]) : undefined
          };
        }
      }

      if (inputs["samples"] && Array.isArray(inputs["samples"]))
      {
        return resolveDimensions(String(inputs["samples"][0]));
      }
      if (inputs["latent_image"] && Array.isArray(inputs["latent_image"]))
      {
        return resolveDimensions(String(inputs["latent_image"][0]));
      }

      return undefined;
    };

    return resolveDimensions(targetNodeId);
  }

  private extractLoras(): ComfyUILoraData[]
  {
    const loras: ComfyUILoraData[] = [];
    const seenLoraNames = new Set<string>();

    if (this.prompt && typeof this.prompt === "object")
    {
      for (const node of Object.values(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        if (classType.includes("lora"))
        {
          const inputs = node["inputs"] || {};
          const loraName: string | undefined = inputs["lora_name"] ?? inputs["name"];
          if (loraName && !seenLoraNames.has(loraName))
          {
            seenLoraNames.add(loraName);
            loras.push({
              name: loraName,
              modelStrength: inputs["strength_model"] !== undefined ? Number(inputs["strength_model"]) : (inputs["model_strength"] !== undefined ? Number(inputs["model_strength"]) : undefined),
              clipStrength: inputs["strength_clip"] !== undefined ? Number(inputs["strength_clip"]) : (inputs["clip_strength"] !== undefined ? Number(inputs["clip_strength"]) : undefined)
            });
          }
        }
      }
    }

    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      for (const node of this.workflow.nodes)
      {
        const nodeType: string = (node["type"] || "").toLowerCase();
        if (nodeType.includes("lora"))
        {
          const widgetsValues: unknown = node["widgets_values"];
          if (Array.isArray(widgetsValues) && typeof widgetsValues[0] === "string")
          {
            const loraName: string = widgetsValues[0];
            if (!seenLoraNames.has(loraName))
            {
              seenLoraNames.add(loraName);
              loras.push({
                name: loraName,
                modelStrength: widgetsValues[1] !== undefined ? Number(widgetsValues[1]) : undefined,
                clipStrength: widgetsValues[2] !== undefined ? Number(widgetsValues[2]) : undefined
              });
            }
          }
        }
      }
    }

    return loras;
  }

  private extractControlNets(): ComfyUIControlNetData[]
  {
    const controlNetMap = new Map<string, ComfyUIControlNetData>();

    if (this.prompt && typeof this.prompt === "object")
    {
      for (const node of Object.values(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        const inputs = node["inputs"] || {};

        if (classType.includes("controlnetapply") || classType.includes("applycontrolnet"))
        {
          let modelName: string | undefined = inputs["control_net_name"] ?? inputs["model_name"];
          if (!modelName && inputs["control_net"] && Array.isArray(inputs["control_net"]))
          {
            const loaderNode = this.prompt[String(inputs["control_net"][0])];
            if (loaderNode && loaderNode["inputs"])
            {
              modelName = loaderNode["inputs"]["control_net_name"] ?? loaderNode["inputs"]["model_name"];
            }
          }

          if (modelName)
          {
            controlNetMap.set(modelName, {
              name: modelName,
              strength: inputs["strength"] !== undefined ? Number(inputs["strength"]) : undefined,
              startPercent: inputs["start_percent"] !== undefined ? Number(inputs["start_percent"]) : undefined,
              endPercent: inputs["end_percent"] !== undefined ? Number(inputs["end_percent"]) : undefined
            });
          }
        }
        else if (classType.includes("ipadapterapply"))
        {
          let modelName: string | undefined = inputs["ipadapter_file"] ?? inputs["model_name"];
          if (!modelName && inputs["ipadapter"] && Array.isArray(inputs["ipadapter"]))
          {
            const loaderNode = this.prompt[String(inputs["ipadapter"][0])];
            if (loaderNode && loaderNode["inputs"])
            {
              modelName = loaderNode["inputs"]["ipadapter_file"] ?? loaderNode["inputs"]["model_name"];
            }
          }

          if (modelName)
          {
            controlNetMap.set(modelName, {
              name: modelName,
              strength: inputs["weight"] !== undefined ? Number(inputs["weight"]) : (inputs["strength"] !== undefined ? Number(inputs["strength"]) : undefined)
            });
          }
        }
        else if (classType.includes("controlnetloader") || classType.includes("ipadaptermodelloader"))
        {
          const modelName: string | undefined = inputs["control_net_name"] ?? inputs["ipadapter_file"] ?? inputs["model_name"];
          if (modelName && !controlNetMap.has(modelName))
          {
            controlNetMap.set(modelName, {
              name: modelName
            });
          }
        }
      }
    }

    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      for (const node of this.workflow.nodes)
      {
        const nodeType: string = (node["type"] || "").toLowerCase();
        if (nodeType.includes("controlnet") || nodeType.includes("ipadapter"))
        {
          const widgetsValues: unknown = node["widgets_values"];
          if (Array.isArray(widgetsValues) && typeof widgetsValues[0] === "string")
          {
            const name: string = widgetsValues[0];
            if (!controlNetMap.has(name))
            {
              controlNetMap.set(name, {
                name,
                strength: widgetsValues[1] !== undefined ? Number(widgetsValues[1]) : undefined
              });
            }
          }
        }
      }
    }

    return Array.from(controlNetMap.values());
  }

  private extractUpscaleData(): ComfyUIUpscaleData
  {
    const upscaleData: ComfyUIUpscaleData = {};

    if (this.prompt && typeof this.prompt === "object")
    {
      for (const node of Object.values(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        const inputs = node["inputs"] || {};

        if (classType.includes("upscalemodelloader"))
        {
          upscaleData.modelName = inputs["model_name"];
        }
        else if (classType.includes("imageupscalewithmodel") || classType.includes("ultimatesdupscale"))
        {
          if (inputs["upscale_by"] !== undefined)
          {
            upscaleData.scaleFactor = typeof inputs["upscale_by"] !== "number" ? undefined : Number(inputs["upscale_by"]);
          }
        }
        else if (classType.includes("facedetailer") || classType.includes("facerestore"))
        {
          upscaleData.faceDetailerModel = inputs["model_name"] ?? inputs["detector"];
        }
      }
    }

    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      for (const node of this.workflow.nodes)
      {
        const nodeType: string = (node["type"] || "").toLowerCase();
        const widgetsValues: unknown = node["widgets_values"];

        if (!upscaleData.modelName && nodeType.includes("upscalemodelloader") && Array.isArray(widgetsValues))
        {
          if (typeof widgetsValues[0] === "string")
          {
            upscaleData.modelName = widgetsValues[0];
          }
        }
      }
    }

    return upscaleData;
  }

  private extractInputImages(): string[]
  {
    const inputImages: string[] = [];
    const seenImageNames = new Set<string>();

    if (this.prompt && typeof this.prompt === "object")
    {
      for (const node of Object.values(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        if (classType.includes("loadimage"))
        {
          const inputs = node["inputs"] || {};
          const imageName: string | undefined = inputs["image"] ?? inputs["fileName"];
          if (imageName && !seenImageNames.has(imageName))
          {
            seenImageNames.add(imageName);
            inputImages.push(imageName);
          }
        }
      }
    }

    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      for (const node of this.workflow.nodes)
      {
        const nodeType: string = (node["type"] || "").toLowerCase();
        if (nodeType.includes("loadimage"))
        {
          const widgetsValues: unknown = node["widgets_values"];
          if (Array.isArray(widgetsValues) && typeof widgetsValues[0] === "string")
          {
            const imageName: string = widgetsValues[0];
            if (!seenImageNames.has(imageName))
            {
              seenImageNames.add(imageName);
              inputImages.push(imageName);
            }
          }
        }
      }
    }

    return inputImages;
  }

  private extractTopology(): ComfyUIWorkflowTopology
  {
    const categories: Record<string, { count: number; types: string[] }> = {};
    const groups: string[] = [];
    const customNodePacks = new Set<string>();
    let totalNodes = 0;
    let activeNodes = 0;
    let bypassedNodes = 0;

    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      totalNodes = this.workflow.nodes.length;
      for (const node of this.workflow.nodes)
      {
        const nodeType: string = node["type"] || "unknown";
        const mode: number | undefined = node["mode"];
        if (mode === 2 || mode === 4)
        {
          bypassedNodes++;
        }
        else
        {
          activeNodes++;
        }

        const category = this.getCategoryForNodeType(nodeType);
        if (!categories[category])
        {
          categories[category] = { count: 0, types: [] };
        }
        categories[category].count++;
        if (!categories[category].types.includes(nodeType))
        {
          categories[category].types.push(nodeType);
        }

        const customPack = this.detectCustomNodePack(nodeType);
        if (customPack)
        {
          customNodePacks.add(customPack);
        }
      }

      if (Array.isArray(this.workflow.groups))
      {
        for (const group of this.workflow.groups)
        {
          if (group["title"] && typeof group["title"] === "string")
          {
            groups.push(group["title"]);
          }
        }
      }
    }
    else if (this.prompt && typeof this.prompt === "object")
    {
      const nodeEntries = Object.entries(this.prompt);
      totalNodes = nodeEntries.length;
      activeNodes = nodeEntries.length;
      for (const [ _nodeId, node ] of nodeEntries)
      {
        const classType: string = node["class_type"] || "unknown";
        const category = this.getCategoryForNodeType(classType);
        if (!categories[category])
        {
          categories[category] = { count: 0, types: [] };
        }
        categories[category].count++;
        if (!categories[category].types.includes(classType))
        {
          categories[category].types.push(classType);
        }

        const customPack = this.detectCustomNodePack(classType);
        if (customPack)
        {
          customNodePacks.add(customPack);
        }
      }
    }

    return {
      totalNodes,
      activeNodes,
      bypassedNodes,
      groups,
      categories,
      customNodePacks: Array.from(customNodePacks)
    };
  }

  private detectCustomNodePack(nodeType: string): string | undefined
  {
    const lowerType = nodeType.toLowerCase();
    if (lowerType.includes("impact") || lowerType.includes("facedetailer"))
    {
      return "ComfyUI-Impact-Pack";
    }
    if (lowerType.includes("ipadapter"))
    {
      return "ComfyUI_IPAdapter_plus";
    }
    if (lowerType.includes("efficient loader") || lowerType.includes("ksampler (efficient)"))
    {
      return "efficiency-nodes-comfyui";
    }
    if (lowerType.startsWith("was_") || lowerType.includes("image filter"))
    {
      return "was-node-suite-comfyui";
    }
    if (lowerType.startsWith("cr ") || lowerType.startsWith("cr_"))
    {
      return "Comfyroll Studio";
    }
    if (lowerType.includes("rgthree"))
    {
      return "rgthree-comfy";
    }
    if (lowerType.includes("animatediff"))
    {
      return "AnimateDiff-Evolved";
    }
    if (lowerType.includes("freeu"))
    {
      return "FreeU";
    }
    return undefined;
  }

  private getCategoryForNodeType(nodeType: string): string
  {
    const lowerType = nodeType.toLowerCase();
    if (lowerType.includes("lora"))
    {
      return "lora";
    }
    if (lowerType.includes("controlnet") || lowerType.includes("ipadapter") || lowerType.includes("instantid"))
    {
      return "controlnet";
    }
    if (lowerType.includes("upscale"))
    {
      return "upscaling";
    }
    if (lowerType.includes("face") || lowerType.includes("roop") || lowerType.includes("reactor") || lowerType.includes("detailer"))
    {
      return "face";
    }
    if (lowerType.includes("mask"))
    {
      return "mask";
    }
    if (lowerType.includes("latent"))
    {
      return "latent";
    }
    if (lowerType.includes("sampler"))
    {
      return "sampling";
    }
    if (lowerType.includes("clip") || lowerType.includes("conditioning") || lowerType.includes("prompt"))
    {
      return "conditioning";
    }
    if (lowerType.includes("saveimage") || lowerType.includes("previewimage") || lowerType.includes("loadimage") || lowerType === "image")
    {
      return "image";
    }
    if (lowerType.includes("checkpoint") || lowerType.includes("model") || lowerType.includes("unet") || lowerType.includes("diffusion"))
    {
      return "model";
    }
    if (lowerType.includes("image"))
    {
      return "image";
    }
    if (lowerType.includes("math") || lowerType.includes("primitive") || lowerType.includes("reroute") || lowerType.includes("note"))
    {
      return "utils";
    }
    return "other";
  }

}
