import {
  collapsibleGroup,
  createUiContainer,
  dimensions,
  flowing,
  identifier,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  numberUnbounded,
  ratio,
  Separator,
  string,
  strings,
  table,
  tableColumn,
  TableColumnAlign,
  TableColumnWidthMode,
  type TableRow,
  tableRow,
  TextIntensity,
  TextWeight,
  type UiContainer,
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

  constructor(private readonly workflow: Json | undefined, private readonly prompt: Json, private readonly settings: ComfyUIAnalyzerSettings)
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

  toUiContainer(): UiContainer
  {
    const primaryRows: TableRow[] = [];
    const firstColumnOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
    const copyableOptions = { modifiers: { copyable: true } };
    const commonTableOptions =
      {
        withRowSeparators: true,
        columns:
          [
            tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
            tableColumn({ align: TableColumnAlign.left })
          ]
      };

    // 1. Positive Prompt
    if (this.samplerData.positivePrompt !== undefined && this.samplerData.positivePrompt.trim().length > 0)
    {
      primaryRows.push(tableRow([
        string("Prompt", firstColumnOptions),
        string(this.samplerData.positivePrompt.trim(), copyableOptions)
      ]));
    }

    // 2. Negative Prompt
    if (this.samplerData.negativePrompt !== undefined && this.samplerData.negativePrompt.trim().length > 0)
    {
      primaryRows.push(tableRow([
        string("Negative Prompt", firstColumnOptions),
        string(this.samplerData.negativePrompt.trim(), copyableOptions)
      ]));
    }

    // 3. Model / Checkpoint
    if (this.samplerData.modelName !== undefined && this.samplerData.modelName.length > 0)
    {
      primaryRows.push(tableRow([
        string("Model", firstColumnOptions),
        identifier(this.samplerData.modelName, copyableOptions)
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
        string("Sampler", firstColumnOptions),
        string(samplerParts.join(" "), copyableOptions)
      ]));
    }

    // 5. Steps
    if (this.samplerData.steps !== undefined)
    {
      primaryRows.push(tableRow([
        string("Steps", firstColumnOptions),
        numberUnbounded(this.samplerData.steps, copyableOptions)
      ]));
    }

    // 6. CFG Scale
    if (this.samplerData.cfg !== undefined)
    {
      primaryRows.push(tableRow([
        string("CFG Scale", firstColumnOptions),
        numberUnbounded(this.samplerData.cfg, copyableOptions)
      ]));
    }

    // 7. Seed
    if (this.samplerData.seed !== undefined)
    {
      primaryRows.push(tableRow([
        string("Seed", firstColumnOptions),
        identifier(String(this.samplerData.seed), copyableOptions)
      ]));
    }

    // 8. Dimensions & Aspect Ratio
    if (this.samplerData.width !== undefined && this.samplerData.height !== undefined && this.samplerData.width > 0 && this.samplerData.height > 0)
    {
      const aspectRatio = this.samplerData.width / this.samplerData.height;
      primaryRows.push(tableRow([
        string("Dimensions", firstColumnOptions),
        flowing([
          dimensions(this.samplerData.width, this.samplerData.height, copyableOptions),
          ratio(aspectRatio)
        ])
      ]));
    }

    // 9. Denoise (when less than 1.0)
    if (this.samplerData.denoise !== undefined && this.samplerData.denoise < 1)
    {
      primaryRows.push(tableRow([
        string("Denoise", firstColumnOptions),
        numberUnbounded(this.samplerData.denoise, copyableOptions)
      ]));
    }

    // 10. VAE
    if (this.samplerData.vaeName !== undefined && this.samplerData.vaeName.length > 0)
    {
      primaryRows.push(tableRow([
        string("VAE", firstColumnOptions),
        identifier(this.samplerData.vaeName, copyableOptions)
      ]));
    }

    // 11. CLIP Encoders
    if (this.samplerData.clipNames !== undefined && this.samplerData.clipNames.length > 0)
    {
      primaryRows.push(tableRow([
        string("CLIP", firstColumnOptions),
        flowing(this.samplerData.clipNames.map(clipName => identifier(clipName, {
          ...copyableOptions,
          modifiers: { monospace: true }
        })), { separator: Separator.dot })
      ]));
    }

    const elements: UiElement[] = [];

    // Primary Table
    if (primaryRows.length > 0)
    {
      elements.push(table(primaryRows, commonTableOptions));
    }

    // Collapsible: LoRAs
    if (this.settings.extractLoRAsAndAdapters !== false && this.loras.length > 0)
    {
      const loraColumns =
        [
          tableColumn({
            header: "Name",
            align: TableColumnAlign.left,
            width: 50
          }),
          tableColumn({
            header: "Model Strength",
            align: TableColumnAlign.left,
            width: 25
          }),
          tableColumn({
            header: "CLIP Strength",
            align: TableColumnAlign.left,
            width: 25
          })
        ];

      const loraRows: TableRow[] = this.loras.map(
        (lora) =>
        {
          const nameCell = identifier(lora.name, { ...firstColumnOptions, ...copyableOptions });
          const modelStrengthCell = lora.modelStrength !== undefined
            ? numberUnbounded(lora.modelStrength, copyableOptions)
            : string("");
          const clipStrengthCell = lora.clipStrength !== undefined
            ? numberUnbounded(lora.clipStrength, copyableOptions)
            : string("");

          return tableRow([
            nameCell,
            modelStrengthCell,
            clipStrengthCell
          ]);
        }
      );

      elements.push(collapsibleGroup(
        "LoRAs",
        [
          table(loraRows, {
            withRowSeparators: true,
            columns: loraColumns
          })
        ],
        {
          summary: `${this.loras.length} ${this.loras.length === 1 ? "LoRA" : "LoRAs"}`,
          defaultExpanded: false
        }
      ));
    }

    // Collapsible: ControlNets & Adapters
    if (this.settings.extractLoRAsAndAdapters !== false && this.controlNets.length > 0)
    {
      const controlNetColumns =
        [
          tableColumn({
            header: "Name",
            align: TableColumnAlign.left,
            width: 40
          }),
          tableColumn({
            header: "Strength",
            align: TableColumnAlign.left,
            width: 20
          }),
          tableColumn({
            header: "Start Percent",
            align: TableColumnAlign.left,
            width: 20
          }),
          tableColumn({
            header: "End Percent",
            align: TableColumnAlign.left,
            width: 20
          })
        ];

      const controlNetRows: TableRow[] = this.controlNets.map(
        (controlNet) =>
        {
          const nameCell = identifier(controlNet.name, { ...firstColumnOptions, ...copyableOptions });
          const strengthCell = controlNet.strength !== undefined
            ? numberUnbounded(controlNet.strength, copyableOptions)
            : string("");
          const startPercentCell = controlNet.startPercent !== undefined
            ? numberUnbounded(controlNet.startPercent, copyableOptions)
            : string("");
          const endPercentCell = controlNet.endPercent !== undefined
            ? numberUnbounded(controlNet.endPercent, copyableOptions)
            : string("");

          return tableRow([
            nameCell,
            strengthCell,
            startPercentCell,
            endPercentCell
          ]);
        }
      );

      elements.push(collapsibleGroup(
        "ControlNet & Adapters",
        [
          table(controlNetRows, {
            withRowSeparators: true,
            columns: controlNetColumns
          })
        ],
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
          string("Upscale Model", firstColumnOptions),
          identifier(this.upscaleData.modelName, copyableOptions)
        ]));
      }
      if (this.upscaleData.scaleFactor !== undefined)
      {
        upscaleRows.push(tableRow([
          string("Scale Factor", firstColumnOptions),
          numberUnbounded(this.upscaleData.scaleFactor, copyableOptions)
        ]));
      }
      if (this.upscaleData.refinerSampler !== undefined)
      {
        upscaleRows.push(tableRow([
          string("Refiner Sampler", firstColumnOptions),
          string(this.upscaleData.refinerSampler, copyableOptions)
        ]));
      }
      if (this.upscaleData.refinerSteps !== undefined)
      {
        upscaleRows.push(tableRow([
          string("Refiner Steps", firstColumnOptions),
          numberUnbounded(this.upscaleData.refinerSteps, copyableOptions)
        ]));
      }
      if (this.upscaleData.refinerDenoise !== undefined)
      {
        upscaleRows.push(tableRow([
          string("Refiner Denoise", firstColumnOptions),
          numberUnbounded(this.upscaleData.refinerDenoise, copyableOptions)
        ]));
      }
      if (this.upscaleData.faceDetailerModel !== undefined)
      {
        upscaleRows.push(tableRow([
          string("Face Detailer", firstColumnOptions),
          string(this.upscaleData.faceDetailerModel, copyableOptions)
        ]));
      }

      if (upscaleRows.length > 0)
      {
        elements.push(collapsibleGroup(
          "Upscaling & Refinement",
          [ table(upscaleRows, commonTableOptions) ],
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
          string(`Image ${imageIndex + 1}`, firstColumnOptions),
          identifier(imageFileName, copyableOptions)
        ]);
      });

      elements.push(collapsibleGroup(
        "Input Images",
        [ table(inputRows, commonTableOptions) ],
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
        tableRow([ string("Total Nodes", firstColumnOptions), numberUnbounded(this.topology.totalNodes) ]),
        tableRow([ string("Active Nodes", firstColumnOptions), numberUnbounded(this.topology.activeNodes) ])
      ];
      if (this.topology.bypassedNodes > 0)
      {
        summaryRows.push(tableRow([ string("Bypassed Nodes", firstColumnOptions), numberUnbounded(this.topology.bypassedNodes) ]));
      }
      if (this.topology.groups.length > 0)
      {
        summaryRows.push(tableRow([ string("Workflow Groups", firstColumnOptions), strings(this.topology.groups, { separator: Separator.dot }) ]));
      }
      if (this.topology.customNodePacks.length > 0)
      {
        summaryRows.push(tableRow([ string("Custom Packs", firstColumnOptions), strings(this.topology.customNodePacks, { separator: Separator.dot }) ]));
      }

      topologyElements.push(table(summaryRows, commonTableOptions));

      const categoryRows: TableRow[] = [];
      const sortedCategories = Object.entries(this.topology.categories).sort((categoryA, categoryB) => categoryB[1].count - categoryA[1].count);
      for (const [ category, data ] of sortedCategories)
      {
        categoryRows.push(tableRow([
          string(category, firstColumnOptions),
          numberUnbounded(data.count),
          strings(data.types, { separator: Separator.dot })
        ]));
      }

      if (categoryRows.length > 0)
      {
        topologyElements.push(table(categoryRows, {
          withRowSeparators: true,
          columns: [
            { header: "Category", width: 25 },
            { header: "Count", width: 15 },
            { header: "Node Types", width: 60 }
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

  getAspectRatio(): number | undefined
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
      let primarySamplerScore = -1;

      for (const [ _nodeId, node ] of Object.entries(this.prompt))
      {
        const classType: string = (node["class_type"] || "").toLowerCase();
        const isSampler = classType.includes("ksampler") || classType.includes("samplercustom") || classType.includes("sampler");
        if (isSampler)
        {
          const inputs = node["inputs"] || {};
          const denoise = this.parseNumber(inputs["denoise"], 1);
          const isDetailerOrUpscaler = classType.includes("facedetailer") || classType.includes("detailer") || classType.includes("upscale") || classType.includes("inpaint");

          let score = 0;
          if (!isDetailerOrUpscaler)
          {
            score += 10;
          }
          if (denoise === 1)
          {
            score += 5;
          }
          else if (denoise > 0)
          {
            score += denoise;
          }

          if (score > primarySamplerScore)
          {
            primarySamplerScore = score;
            primarySamplerNode = node;
          }
        }
      }

      if (primarySamplerNode)
      {
        const inputs = primarySamplerNode["inputs"] || {};
        const rawSeed = inputs["seed"] ?? inputs["noise_seed"] ?? inputs["seed_value"] ?? inputs["noise"];
        samplerData.seed = this.resolveSeedInput(rawSeed);
        samplerData.steps = this.parseNumber(inputs["steps"]);
        samplerData.cfg = this.parseNumber(inputs["cfg"]);
        samplerData.samplerName = inputs["sampler_name"];
        samplerData.scheduler = inputs["scheduler"];
        samplerData.denoise = this.parseNumber(inputs["denoise"]);

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

        // We trace latent dimensions via latent_image, samples, or latent links
        const latentLink = inputs["latent_image"] ?? inputs["samples"] ?? inputs["latent"];
        if (latentLink)
        {
          const dimensions = this.traceLatentDimensionsFromPromptDag(latentLink);
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
      }

      // If dimensions are not yet resolved, search all prompt nodes
      if (samplerData.width === undefined)
      {
        for (const node of Object.values(this.prompt))
        {
          const classType: string = (node["class_type"] || "").toLowerCase();
          if (classType.includes("latent") || classType.includes("resolution") || classType.includes("aspect") || classType.includes("emptyimage") || classType.includes("loader") || classType.includes("scale"))
          {
            const dimensions = this.extractDimensionsFromNode(node);
            if (dimensions)
            {
              samplerData.width = dimensions.width;
              samplerData.height = dimensions.height;
              samplerData.batchSize = dimensions.batchSize;
              break;
            }
          }
        }
      }

      // If seed is not yet resolved from primary sampler, search prompt nodes
      if (samplerData.seed === undefined)
      {
        for (const node of Object.values(this.prompt))
        {
          const classType: string = (node["class_type"] || "").toLowerCase();
          const inputs = node["inputs"] || {};
          if (classType.includes("seed") || classType.includes("noise"))
          {
            const candidateSeed = inputs["seed"] ?? inputs["noise_seed"] ?? inputs["seed_value"] ?? inputs["value"] ?? inputs["int"];
            const resolvedSeed = this.resolveSeedInput(candidateSeed);
            if (resolvedSeed !== undefined)
            {
              samplerData.seed = resolvedSeed;
              break;
            }
          }
        }
      }
    }

    // We fallback or supplement with workflow UI graph analysis
    if (this.workflow && Array.isArray(this.workflow.nodes))
    {
      if (samplerData.width === undefined)
      {
        const workflowDimensions = this.extractDimensionsFromWorkflow();
        if (workflowDimensions)
        {
          samplerData.width = workflowDimensions.width;
          samplerData.height = workflowDimensions.height;
          samplerData.batchSize = workflowDimensions.batchSize;
        }
      }

      if (samplerData.seed === undefined)
      {
        const workflowSeed = this.extractSeedFromWorkflow();
        if (workflowSeed !== undefined)
        {
          samplerData.seed = workflowSeed;
        }
      }

      for (const node of this.workflow.nodes)
      {
        const nodeType: string = (node["type"] || "").toLowerCase();
        const widgetsValues: unknown = node["widgets_values"];
        const nodeTitle: string = (node["title"] || "").toLowerCase();

        // Sampler parameters
        if (nodeType.includes("ksampler") && Array.isArray(widgetsValues))
        {
          if (samplerData.seed === undefined)
          {
            const parsedSeed = this.parseSeed(widgetsValues[0]);
            if (parsedSeed !== undefined)
            {
              samplerData.seed = parsedSeed;
            }
          }
          if (samplerData.steps === undefined)
          {
            samplerData.steps = this.parseNumber(widgetsValues[2]);
          }
          if (samplerData.cfg === undefined)
          {
            samplerData.cfg = this.parseNumber(widgetsValues[3]);
          }
          if (samplerData.samplerName === undefined && typeof widgetsValues[4] === "string")
          {
            samplerData.samplerName = widgetsValues[4];
          }
          if (samplerData.scheduler === undefined && typeof widgetsValues[5] === "string")
          {
            samplerData.scheduler = widgetsValues[5];
          }
          if (samplerData.denoise === undefined)
          {
            samplerData.denoise = this.parseNumber(widgetsValues[6]);
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

  private parseNumber(value: unknown): number | undefined;
  private parseNumber(value: unknown, defaultValue: number): number;
  private parseNumber(value: unknown, defaultValue?: number): number | undefined
  {
    if (value === undefined || value === null)
    {
      return defaultValue;
    }

    if (typeof value === "number")
    {
      return Number.isFinite(value) === true ? value : defaultValue;
    }

    if (typeof value === "string")
    {
      const trimmed = value.trim();
      if (trimmed.length === 0)
      {
        return defaultValue;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) === true ? parsed : defaultValue;
    }

    return defaultValue;
  }

  private parseSeed(value: unknown): number | string | undefined
  {
    if (value === undefined || value === null)
    {
      return undefined;
    }

    if (typeof value === "number")
    {
      return Number.isFinite(value) === true && value >= 0 && Math.floor(value) === value
        ? value
        : undefined;
    }

    if (typeof value === "bigint")
    {
      return value >= 0n ? value.toString() : undefined;
    }

    if (typeof value === "string")
    {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed) === true && trimmed.length > 0)
      {
        const asNumber = Number(trimmed);
        return Number.isSafeInteger(asNumber) === true ? asNumber : trimmed;
      }
    }

    return undefined;
  }

  private resolveSeedInput(inputValue: unknown, visitedNodeIds: Set<string> = new Set<string>()): number | string | undefined
  {
    const parsedDirectSeed = this.parseSeed(inputValue);
    if (parsedDirectSeed !== undefined)
    {
      return parsedDirectSeed;
    }

    if (Array.isArray(inputValue) === true && inputValue.length > 0)
    {
      const sourceNodeId = String(inputValue[0]);
      if (visitedNodeIds.has(sourceNodeId) === true)
      {
        return undefined;
      }
      visitedNodeIds.add(sourceNodeId);

      // Check prompt DAG
      if (this.prompt)
      {
        const sourceNode = this.prompt[sourceNodeId];
        if (sourceNode)
        {
          const inputs = sourceNode["inputs"] || {};
          const candidateKeys = [
            "seed",
            "noise_seed",
            "seed_value",
            "value",
            "int",
            "val",
            "number",
            "integer",
            "noise"
          ];

          for (const candidateKey of candidateKeys)
          {
            const candidateValue = inputs[candidateKey];
            if (candidateValue !== undefined)
            {
              const resolved = this.resolveSeedInput(candidateValue, visitedNodeIds);
              if (resolved !== undefined)
              {
                return resolved;
              }
            }
          }
        }
      }

      // Check workflow UI graph
      if (this.workflow && Array.isArray(this.workflow.nodes) === true)
      {
        const workflowNode = this.workflow.nodes.find(
          (node: Json) => String(node["id"]) === sourceNodeId
        );
        if (workflowNode)
        {
          const widgetsValues = workflowNode["widgets_values"];
          if (Array.isArray(widgetsValues) === true)
          {
            for (const widgetValue of widgetsValues)
            {
              const parsedWidgetSeed = this.parseSeed(widgetValue);
              if (parsedWidgetSeed !== undefined)
              {
                return parsedWidgetSeed;
              }
            }
          }
          else if (widgetsValues && typeof widgetsValues === "object")
          {
            const widgetRecord = widgetsValues as Record<string, unknown>;
            const candidateKeys = [ "seed", "noise_seed", "value", "int" ];
            for (const candidateKey of candidateKeys)
            {
              const parsedRecordSeed = this.parseSeed(widgetRecord[candidateKey]);
              if (parsedRecordSeed !== undefined)
              {
                return parsedRecordSeed;
              }
            }
          }
        }
      }
    }

    return undefined;
  }

  private parseDimensionsFromString(text: string): { width: number; height: number; } | undefined
  {
    const match = /(\d{3,5})\s*[\u00D7xX*:]\s*(\d{3,5})/.exec(text);
    if (match)
    {
      const width = this.parseNumber(match[1]);
      const height = this.parseNumber(match[2]);
      if (width !== undefined && height !== undefined && width > 0 && height > 0 && width <= 16384 && height <= 16384)
      {
        return { width, height };
      }
    }
    return undefined;
  }

  private resolveNumericInput(inputValue: unknown): number | undefined
  {
    const directNumber = this.parseNumber(inputValue);
    if (directNumber !== undefined)
    {
      return directNumber;
    }

    if (Array.isArray(inputValue) === true && inputValue.length > 0 && this.prompt)
    {
      const sourceNodeId = String(inputValue[0]);
      const sourceNode = this.prompt[sourceNodeId];
      if (sourceNode)
      {
        const inputs = sourceNode["inputs"] || {};
        const candidateKeys = [
          "value",
          "int",
          "val",
          "number",
          "width",
          "height",
          "integer"
        ];
        for (const candidateKey of candidateKeys)
        {
          const candidateValue = inputs[candidateKey];
          if (candidateValue !== undefined)
          {
            const resolved = this.resolveNumericInput(candidateValue);
            if (resolved !== undefined)
            {
              return resolved;
            }
          }
        }
      }
      if (this.workflow && Array.isArray(this.workflow.nodes) === true)
      {
        const workflowNode = this.workflow.nodes.find(
          (node: Json) => String(node["id"]) === sourceNodeId
        );
        if (workflowNode && Array.isArray(workflowNode["widgets_values"]) === true)
        {
          const firstWidgetNumber = this.parseNumber(workflowNode["widgets_values"][0]);
          if (firstWidgetNumber !== undefined)
          {
            return firstWidgetNumber;
          }
        }
      }
    }
    return undefined;
  }

  private extractDimensionsFromNode(node: Json): { width: number; height: number; batchSize?: number; } | undefined
  {
    const inputs = node["inputs"] || {};

    const rawWidth = inputs["width"] ?? inputs["empty_latent_width"] ?? inputs["latent_width"] ?? inputs["image_width"];
    const rawHeight = inputs["height"] ?? inputs["empty_latent_height"] ?? inputs["latent_height"] ?? inputs["image_height"];
    if (rawWidth !== undefined && rawHeight !== undefined)
    {
      const width = this.resolveNumericInput(rawWidth);
      const height = this.resolveNumericInput(rawHeight);
      if (width !== undefined && height !== undefined && width > 0 && height > 0)
      {
        const rawBatchSize = inputs["batch_size"] ?? inputs["batch"];
        const batchSize = rawBatchSize !== undefined ? this.resolveNumericInput(rawBatchSize) : undefined;
        return { width, height, batchSize };
      }
    }

    const stringKeys = [ "resolution", "size", "aspect_ratio", "dimensions", "preset", "empty_latent_preset" ];
    for (const stringKey of stringKeys)
    {
      const stringValue = inputs[stringKey];
      if (typeof stringValue === "string")
      {
        const parsed = this.parseDimensionsFromString(stringValue);
        if (parsed)
        {
          const rawBatchSize = inputs["batch_size"] ?? inputs["batch"];
          const batchSize = rawBatchSize !== undefined ? this.resolveNumericInput(rawBatchSize) : undefined;
          return { width: parsed.width, height: parsed.height, batchSize };
        }
      }
    }

    return undefined;
  }

  private traceLatentDimensionsFromPromptDag(linkTarget: unknown): {
    width: number;
    height: number;
    batchSize?: number;
  } | undefined
  {
    if (!Array.isArray(linkTarget) || linkTarget.length < 1 || !this.prompt)
    {
      return undefined;
    }

    const targetNodeId: string = String(linkTarget[0]);
    const visitedNodeIds = new Set<string>();

    const resolveDimensions = (nodeId: string): { width: number; height: number; batchSize?: number; } | undefined =>
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

      // 1. Direct extraction from node inputs
      const directDimensions = this.extractDimensionsFromNode(targetNode);
      if (directDimensions)
      {
        return directDimensions;
      }

      // 2. UpscaleBy: multiplies upstream dimensions by scale factor
      if (classType.includes("upscaleby") || classType.includes("scaleby"))
      {
        const upstreamTarget = inputs["samples"] ?? inputs["latent_image"] ?? inputs["latent"] ?? inputs["image"] ?? inputs["pixels"];
        if (upstreamTarget && Array.isArray(upstreamTarget))
        {
          const upstreamDimensions = resolveDimensions(String(upstreamTarget[0]));
          if (upstreamDimensions)
          {
            const scaleBy = this.resolveNumericInput(inputs["scale_by"] ?? inputs["upscale_by"] ?? inputs["scale"]);
            if (scaleBy !== undefined && scaleBy > 0)
            {
              return {
                width: Math.round(upstreamDimensions.width * scaleBy),
                height: Math.round(upstreamDimensions.height * scaleBy),
                batchSize: upstreamDimensions.batchSize
              };
            }
            return upstreamDimensions;
          }
        }
      }

      // 3. Upstream latent / image links
      const upstreamKeys = [
        "samples",
        "latent_image",
        "latent",
        "samples1",
        "samples2",
        "latent_image1",
        "latent_image2",
        "pixels",
        "image",
        "images"
      ];
      for (const upstreamKey of upstreamKeys)
      {
        const upstreamTarget = inputs[upstreamKey];
        if (upstreamTarget && Array.isArray(upstreamTarget))
        {
          const upstreamDimensions = resolveDimensions(String(upstreamTarget[0]));
          if (upstreamDimensions)
          {
            return upstreamDimensions;
          }
        }
      }

      // 4. Passthrough nodes (e.g. Reroute, PrimitiveNode, Bus)
      for (const [ _key, inputValue ] of Object.entries(inputs))
      {
        if (Array.isArray(inputValue) && inputValue.length >= 2)
        {
          const upstreamDimensions = resolveDimensions(String(inputValue[0]));
          if (upstreamDimensions)
          {
            return upstreamDimensions;
          }
        }
      }

      return undefined;
    };

    return resolveDimensions(targetNodeId);
  }

  private extractDimensionsFromWorkflow(): { width: number; height: number; batchSize?: number; } | undefined
  {
    if (!this.workflow || !Array.isArray(this.workflow.nodes))
    {
      return undefined;
    }

    const linksMap = new Map<number, { originId: number; originSlot: number; }>();
    if (Array.isArray(this.workflow.links))
    {
      for (const link of this.workflow.links)
      {
        if (Array.isArray(link) && link.length >= 4)
        {
          const linkId = this.parseNumber(link[0]);
          const originId = this.parseNumber(link[1]);
          const originSlot = this.parseNumber(link[2]);
          if (linkId !== undefined && originId !== undefined && originSlot !== undefined)
          {
            linksMap.set(linkId, { originId, originSlot });
          }
        }
      }
    }

    const nodesMap = new Map<string, Json>();
    for (const node of this.workflow.nodes)
    {
      nodesMap.set(String(node["id"]), node);
    }

    const resolveWorkflowInput = (node: Json, inputName: string): number | undefined =>
    {
      if (Array.isArray(node["inputs"]))
      {
        const inputSlot = node["inputs"].find(
          (input: Json) => (input["name"] || "").toLowerCase() === inputName.toLowerCase()
        );
        if (inputSlot && inputSlot["link"] !== undefined && inputSlot["link"] !== null)
        {
          const linkId = this.parseNumber(inputSlot["link"]);
          if (linkId !== undefined)
          {
            const linkInfo = linksMap.get(linkId);
            if (linkInfo)
            {
              const originNode = nodesMap.get(String(linkInfo.originId));
              if (originNode && Array.isArray(originNode["widgets_values"]))
              {
                const firstWidget = this.parseNumber(originNode["widgets_values"][0]);
                if (firstWidget !== undefined)
                {
                  return firstWidget;
                }
              }
            }
          }
        }
      }
      return undefined;
    };

    for (const node of this.workflow.nodes)
    {
      if (node["mode"] !== undefined && this.parseNumber(node["mode"]) !== 0)
      {
        continue;
      }
      const nodeType: string = (node["type"] || "").toLowerCase();
      const widgetsValues: unknown = node["widgets_values"];

      // Check linked inputs first
      const linkedWidth = resolveWorkflowInput(node, "width");
      const linkedHeight = resolveWorkflowInput(node, "height");
      if (linkedWidth !== undefined && linkedHeight !== undefined && linkedWidth > 0 && linkedHeight > 0)
      {
        return { width: linkedWidth, height: linkedHeight };
      }

      if (Array.isArray(widgetsValues))
      {
        if (nodeType.includes("latent") || nodeType.includes("image") || nodeType.includes("resolution") || nodeType.includes("aspect"))
        {
          const firstWidget = this.parseNumber(widgetsValues[0]);
          const secondWidget = this.parseNumber(widgetsValues[1]);
          if (firstWidget !== undefined && secondWidget !== undefined)
          {
            if (firstWidget >= 64 && secondWidget >= 64 && firstWidget <= 16384 && secondWidget <= 16384)
            {
              const batchSize = this.parseNumber(widgetsValues[2]);
              return { width: firstWidget, height: secondWidget, batchSize };
            }
          }
          for (let index = 0; index < widgetsValues.length - 1; index++)
          {
            const candidateWidth = this.parseNumber(widgetsValues[index]);
            const candidateHeight = this.parseNumber(widgetsValues[index + 1]);
            if (candidateWidth !== undefined && candidateHeight !== undefined && candidateWidth >= 64 && candidateHeight >= 64 && candidateWidth <= 16384 && candidateHeight <= 16384)
            {
              return { width: candidateWidth, height: candidateHeight };
            }
          }
        }

        for (const widgetValue of widgetsValues)
        {
          if (typeof widgetValue === "string")
          {
            const parsed = this.parseDimensionsFromString(widgetValue);
            if (parsed)
            {
              return { width: parsed.width, height: parsed.height };
            }
          }
        }
      }
      else if (widgetsValues && typeof widgetsValues === "object")
      {
        const record = widgetsValues as Record<string, unknown>;
        const rawWidth = this.parseNumber(record["width"] ?? record["empty_latent_width"]);
        const rawHeight = this.parseNumber(record["height"] ?? record["empty_latent_height"]);
        if (rawWidth !== undefined && rawHeight !== undefined && rawWidth > 0 && rawHeight > 0)
        {
          return { width: rawWidth, height: rawHeight };
        }
      }
    }

    return undefined;
  }

  private extractSeedFromWorkflow(): number | string | undefined
  {
    if (!this.workflow || !Array.isArray(this.workflow.nodes))
    {
      return undefined;
    }

    const linksMap = new Map<number, { originId: number; originSlot: number; }>();
    if (Array.isArray(this.workflow.links) === true)
    {
      for (const link of this.workflow.links)
      {
        if (Array.isArray(link) === true && link.length >= 4)
        {
          const linkId = this.parseNumber(link[0]);
          const originId = this.parseNumber(link[1]);
          const originSlot = this.parseNumber(link[2]);
          if (linkId !== undefined && originId !== undefined && originSlot !== undefined)
          {
            linksMap.set(linkId, { originId, originSlot });
          }
        }
      }
    }

    const nodesMap = new Map<string, Json>();
    for (const node of this.workflow.nodes)
    {
      nodesMap.set(String(node["id"]), node);
    }

    const resolveWorkflowSeedInput = (node: Json): number | string | undefined =>
    {
      if (Array.isArray(node["inputs"]) === true)
      {
        const seedInputKeys = [ "seed", "noise_seed", "seed_value", "noise" ];
        for (const candidateKey of seedInputKeys)
        {
          const inputSlot = node["inputs"].find(
            (input: Json) => (input["name"] || "").toLowerCase() === candidateKey
          );
          if (inputSlot && inputSlot["link"] !== undefined && inputSlot["link"] !== null)
          {
            const linkId = this.parseNumber(inputSlot["link"]);
            if (linkId !== undefined)
            {
              const linkInfo = linksMap.get(linkId);
              if (linkInfo)
              {
                const originNode = nodesMap.get(String(linkInfo.originId));
                if (originNode)
                {
                  const originWidgets = originNode["widgets_values"];
                  if (Array.isArray(originWidgets) === true)
                  {
                    for (const widgetValue of originWidgets)
                    {
                      const parsedWidgetSeed = this.parseSeed(widgetValue);
                      if (parsedWidgetSeed !== undefined)
                      {
                        return parsedWidgetSeed;
                      }
                    }
                  }
                  else if (originWidgets && typeof originWidgets === "object")
                  {
                    const widgetRecord = originWidgets as Record<string, unknown>;
                    const candidateRecordKeys = [ "seed", "noise_seed", "value", "int" ];
                    for (const candidateRecordKey of candidateRecordKeys)
                    {
                      const parsedRecordSeed = this.parseSeed(widgetRecord[candidateRecordKey]);
                      if (parsedRecordSeed !== undefined)
                      {
                        return parsedRecordSeed;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      return undefined;
    };

    // 1. Search sampler nodes in workflow
    for (const node of this.workflow.nodes)
    {
      if (node["mode"] !== undefined && this.parseNumber(node["mode"]) !== 0)
      {
        continue;
      }
      const nodeType: string = (node["type"] || "").toLowerCase();
      if (nodeType.includes("ksampler") || nodeType.includes("sampler"))
      {
        // Check linked inputs first
        const linkedSeed = resolveWorkflowSeedInput(node);
        if (linkedSeed !== undefined)
        {
          return linkedSeed;
        }

        // Check direct widgets_values
        const widgetsValues = node["widgets_values"];
        if (Array.isArray(widgetsValues) === true)
        {
          if (nodeType.includes("ksampleradvanced"))
          {
            const seedFromIndex1 = this.parseSeed(widgetsValues[1]);
            if (seedFromIndex1 !== undefined)
            {
              return seedFromIndex1;
            }
            const seedFromIndex0 = this.parseSeed(widgetsValues[0]);
            if (seedFromIndex0 !== undefined)
            {
              return seedFromIndex0;
            }
          }
          else
          {
            for (const widgetValue of widgetsValues)
            {
              const parsedWidgetSeed = this.parseSeed(widgetValue);
              if (parsedWidgetSeed !== undefined)
              {
                return parsedWidgetSeed;
              }
            }
          }
        }
      }
    }

    // 2. Search dedicated seed / noise nodes in workflow
    for (const node of this.workflow.nodes)
    {
      if (node["mode"] !== undefined && this.parseNumber(node["mode"]) !== 0)
      {
        continue;
      }
      const nodeType: string = (node["type"] || "").toLowerCase();
      if (nodeType.includes("seed") || nodeType.includes("randomnoise"))
      {
        const widgetsValues = node["widgets_values"];
        if (Array.isArray(widgetsValues) === true)
        {
          for (const widgetValue of widgetsValues)
          {
            const parsedWidgetSeed = this.parseSeed(widgetValue);
            if (parsedWidgetSeed !== undefined)
            {
              return parsedWidgetSeed;
            }
          }
        }
        else if (widgetsValues && typeof widgetsValues === "object")
        {
          const widgetRecord = widgetsValues as Record<string, unknown>;
          const candidateRecordKeys = [ "seed", "noise_seed", "value", "int" ];
          for (const candidateRecordKey of candidateRecordKeys)
          {
            const parsedRecordSeed = this.parseSeed(widgetRecord[candidateRecordKey]);
            if (parsedRecordSeed !== undefined)
            {
              return parsedRecordSeed;
            }
          }
        }
      }
    }

    return undefined;
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
              modelStrength: this.parseNumber(inputs["strength_model"] ?? inputs["model_strength"]),
              clipStrength: this.parseNumber(inputs["strength_clip"] ?? inputs["clip_strength"])
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
                modelStrength: this.parseNumber(widgetsValues[1]),
                clipStrength: this.parseNumber(widgetsValues[2])
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
              strength: this.parseNumber(inputs["strength"]),
              startPercent: this.parseNumber(inputs["start_percent"]),
              endPercent: this.parseNumber(inputs["end_percent"])
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
              strength: this.parseNumber(inputs["weight"] ?? inputs["strength"])
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
                strength: this.parseNumber(widgetsValues[1]),
                startPercent: this.parseNumber(widgetsValues[2]),
                endPercent: this.parseNumber(widgetsValues[3])
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
            upscaleData.scaleFactor = this.parseNumber(inputs["upscale_by"]);
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
        const mode = this.parseNumber(node["mode"]);
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
