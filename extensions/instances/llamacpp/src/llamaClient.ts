import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";

import { Communicator, Helper } from "@picteus/extension-sdk";

import { LlamaDownloader } from "./llamaDownloader.js";


interface ExtendedMessage
{

  readonly content?: string | null | Array<{ readonly text?: string }>;
  readonly reasoning_content?: string;
  readonly reasoning?: string;

}

export interface LlamaServerHealth
{

  readonly isReachable: boolean;
  readonly isReady: boolean;
  readonly status: string;
  readonly details?: string;

}

export interface LlamaModel
{

  readonly id: string;
  readonly name: string;
  readonly comment?: string;

}

export interface CuratedLlamaModel extends LlamaModel
{

  readonly defaultRepository: string;
  readonly aliases?: readonly string[];

}

export interface LlamaModelDetail extends LlamaModel
{

  readonly serverId?: string;
  readonly defaultRepository?: string;
  readonly aliases?: readonly string[];
  readonly isAvailableOnServer?: boolean;

}

export interface BaseVisionRequestOptions
{

  readonly model: string;
  readonly imageBase64: string;
  readonly temperature?: number;

}

export interface ChatRequestOptions extends BaseVisionRequestOptions
{

  readonly prompt: string;
  readonly maxTokens?: number;

}

export interface TagExtractionOptions extends BaseVisionRequestOptions
{

  readonly tags: readonly string[];
  readonly promptTemplate: string;

}

export interface EnsureModelOptions
{

  readonly communicator?: Communicator;

}

export interface BaseExecutionResult
{

  readonly model: string;
  readonly durationInMilliseconds: number;
  readonly modelDetail?: LlamaModelDetail;

}

export interface ChatResponseResult extends BaseExecutionResult
{

  readonly content: string;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;

}

export interface TagExtractionResult extends BaseExecutionResult
{

  readonly tags: string[];

}

const CURATED_LLAMA_MODELS: readonly CuratedLlamaModel[] = [
  // Qwen 2.5-VL & Qwen 2-VL
  {
    id: "qwen2.5-vl-7b",
    name: "Qwen 2.5-VL 7B",
    defaultRepository: "ggml-org/Qwen2.5-VL-7B-Instruct-GGUF",
    comment: "Flagship vision-language model with state-of-the-art document, OCR, and visual reasoning (7B)",
    aliases: [ "qwen2.5vl", "qwen2.5-vl", "qwen2.5-vl-7b-instruct", "qwen-2.5-vl-7b" ]
  },
  {
    id: "qwen2.5-vl-3b",
    name: "Qwen 2.5-VL 3B",
    defaultRepository: "ggml-org/Qwen2.5-VL-3B-Instruct-GGUF",
    comment: "Lightweight and fast vision-language model offering exceptional OCR and detail recognition (3B)",
    aliases: [ "qwen2.5-vl-3b-instruct", "qwen-2.5-vl-3b" ]
  },
  {
    id: "qwen2.5-vl-32b",
    name: "Qwen 2.5-VL 32B",
    defaultRepository: "ggml-org/Qwen2.5-VL-32B-Instruct-GGUF",
    comment: "High-capacity vision model for complex document layouts, dense text, and advanced reasoning (32B)",
    aliases: [ "qwen2.5-vl-32b-instruct", "qwen-2.5-vl-32b" ]
  },
  {
    id: "qwen2-vl-2b",
    name: "Qwen 2-VL 2B",
    defaultRepository: "ggml-org/Qwen2-VL-2B-Instruct-GGUF",
    comment: "Ultra-compact vision model suitable for resource-constrained systems (2B)",
    aliases: [ "qwen2-vl", "qwen2vl" ]
  },

  // Google Gemma 3
  {
    id: "gemma-3-4b",
    name: "Gemma 3 4B",
    defaultRepository: "ggml-org/gemma-3-4b-it-GGUF",
    comment: "Google multimodal model offering strong spatial reasoning and natural image captioning (4B)",
    aliases: [ "gemma3", "gemma-3", "gemma-3-4b-it" ]
  },
  {
    id: "gemma-3-12b",
    name: "Gemma 3 12B",
    defaultRepository: "ggml-org/gemma-3-12b-it-GGUF",
    comment: "Balanced Google vision-language model with high-fidelity visual understanding (12B)",
    aliases: [ "gemma-3-12b-it" ]
  },
  {
    id: "gemma-3-27b",
    name: "Gemma 3 27B",
    defaultRepository: "ggml-org/gemma-3-27b-it-GGUF",
    comment: "Large-scale Google vision model for comprehensive scene analysis and instruction following (27B)",
    aliases: [ "gemma-3-27b-it" ]
  },

  // Mistral Pixtral & Mistral Small
  {
    id: "pixtral-12b",
    name: "Pixtral 12B",
    defaultRepository: "ggml-org/pixtral-12b-GGUF",
    comment: "Mistral multimodal model featuring a native-resolution vision encoder for complex images (12B)",
    aliases: [ "pixtral", "pixtral-12b-2409" ]
  },
  {
    id: "mistral-small-3.1-24b",
    name: "Mistral Small 3.1 24B",
    defaultRepository: "ggml-org/Mistral-Small-3.1-24B-Instruct-2503-GGUF",
    comment: "Mistral advanced reasoning model with multi-image and document understanding capabilities (24B)",
    aliases: [ "mistral-small3.2", "mistral-small" ]
  },

  // Meta Llama 3.2 Vision
  {
    id: "llama-3.2-11b-vision",
    name: "Llama 3.2 Vision 11B",
    defaultRepository: "bartowski/Llama-3.2-11B-Vision-Instruct-GGUF:Q4_K_M",
    comment: "Meta vision-language model fine-tuned for high-detail image description and question answering (11B)",
    aliases: [ "llama3.2-vision", "llama-3.2-vision", "llama-3.2-11b" ]
  },

  // SmolVLM Series
  {
    id: "smolvlm2-2.2b",
    name: "SmolVLM 2 2.2B",
    defaultRepository: "ggml-org/SmolVLM2-2.2B-Instruct-GGUF",
    comment: "Compact and efficient multimodal model by Hugging Face optimized for local on-device inference (2.2B)",
    aliases: [ "smolvlm", "smolvlm2", "smolvlm-2.2b" ]
  },
  {
    id: "smolvlm-500m",
    name: "SmolVLM 500M",
    defaultRepository: "ggml-org/SmolVLM-500M-Instruct-GGUF",
    comment: "Ultra-lightweight multimodal model designed for quick tagging and low-resource environments (500M)",
    aliases: [ "smolvlm-500m-instruct" ]
  },

  // Moondream 2
  {
    id: "moondream2",
    name: "Moondream 2",
    defaultRepository: "ggml-org/moondream2-20250414-GGUF",
    comment: "Very fast, tiny vision model tailored for rapid image captioning and visual queries (1.4B)",
    aliases: [ "moondream", "moondream2-text-model" ]
  },

  // InternVL Series
  {
    id: "internvl2.5-4b",
    name: "InternVL 2.5 4B",
    defaultRepository: "ggml-org/InternVL2_5-4B-GGUF",
    comment: "High-performance multimodal model with strong OCR and general scene understanding (4B)",
    aliases: [ "internvl2.5", "internvl-4b" ]
  },
  {
    id: "internvl3-8b",
    name: "InternVL 3 8B",
    defaultRepository: "ggml-org/InternVL3-8B-Instruct-GGUF",
    comment: "Advanced vision model with enhanced multi-aspect analysis and visual comprehension (8B)",
    aliases: [ "internvl3", "internvl-8b" ]
  },

  // OpenBMB MiniCPM-V
  {
    id: "minicpm-v-2.6",
    name: "MiniCPM-V 2.6",
    defaultRepository: "openbmb/MiniCPM-V-2_6-gguf:Q4_K_M",
    comment: "Top-tier compact vision model with superior optical character recognition and visual reasoning (8B)",
    aliases: [ "minicpm-v", "minicpm" ]
  },

  // Classic LLaVA
  {
    id: "llava-1.5-7b",
    name: "LLaVA 1.5 7B",
    defaultRepository: "mys/ggml_llava-v1.5-7b:q4_k",
    comment: "Pioneering open-source vision-language model for general visual instruction following (7B)",
    aliases: [ "llava", "llava1.5", "llava-v1.5-7b" ]
  },
  {
    id: "llava-llama3-8b",
    name: "LLaVA Llama 3 8B",
    defaultRepository: "xtuner/llava-llama-3-8b-v1_1-gguf:Q4_K_M",
    comment: "LLaVA visual architecture integrated with Meta Llama 3 language foundation (8B)",
    aliases: [ "llava-llama3", "llava-llama-3" ]
  },

  // IBM Granite Vision
  {
    id: "granite-3.2-vision-8b",
    name: "Granite 3.2 Vision 8B",
    defaultRepository: "ibm-granite/granite-3.2-8b-instruct-GGUF:Q4_K_M",
    comment: "Enterprise-grade vision-language model by IBM designed for visual inspection and document analysis (8B)",
    aliases: [ "granite3.2-vision", "granite-vision" ]
  }
];

export class LlamaClient
{

  public readonly baseUrl: string;

  private readonly openai: OpenAI;

  private readonly llamaDownloader: LlamaDownloader = new LlamaDownloader();

  private currentLoadedModel?: string;

  public static findCuratedModel(modelIdentifier: string): CuratedLlamaModel | undefined
  {
    const lowerIdentifier = modelIdentifier.toLowerCase();
    const normalizedIdentifier = LlamaClient.normalizeModelIdentifier(modelIdentifier);
    const cleanedBaseIdentifier = LlamaClient.cleanServerModelId(modelIdentifier).toLowerCase();

    // 1. Direct match on id
    const idMatch = CURATED_LLAMA_MODELS.find((candidate) =>
    {
      const lowerCandidateId = candidate.id.toLowerCase();
      return lowerCandidateId === lowerIdentifier || lowerCandidateId === normalizedIdentifier || lowerCandidateId === cleanedBaseIdentifier;
    });
    if (idMatch !== undefined)
    {
      return idMatch;
    }

    // 2. Match on default repository (exact or normalized)
    const repoMatch = CURATED_LLAMA_MODELS.find((candidate) =>
    {
      const lowerRepo = candidate.defaultRepository.toLowerCase();
      const normalizedRepo = LlamaClient.normalizeModelIdentifier(candidate.defaultRepository);
      const cleanedRepo = LlamaClient.cleanServerModelId(candidate.defaultRepository).toLowerCase();
      return lowerRepo === lowerIdentifier || normalizedRepo === lowerIdentifier || normalizedRepo === normalizedIdentifier || lowerRepo === normalizedIdentifier || cleanedRepo === cleanedBaseIdentifier;
    });
    if (repoMatch !== undefined)
    {
      return repoMatch;
    }

    // 3. Match on aliases
    const aliasMatch = CURATED_LLAMA_MODELS.find((candidate) =>
    {
      return candidate.aliases?.some((alias) =>
      {
        const lowerAlias = alias.toLowerCase();
        const normalizedAlias = LlamaClient.normalizeModelIdentifier(alias);
        const cleanedAlias = LlamaClient.cleanServerModelId(alias).toLowerCase();
        return lowerAlias === lowerIdentifier || normalizedAlias === lowerIdentifier || normalizedAlias === normalizedIdentifier || lowerAlias === normalizedIdentifier || cleanedAlias === cleanedBaseIdentifier;
      }) === true;
    });
    if (aliasMatch !== undefined)
    {
      return aliasMatch;
    }

    return undefined;
  }

  private static normalizeModelIdentifier(rawIdentifier: string): string
  {
    let normalized = rawIdentifier.toLowerCase().replace(/\.(gguf|bin)$/i, "");
    if (normalized.includes(":") === true)
    {
      normalized = normalized.split(":")[0] ?? normalized;
    }
    normalized = normalized.replace(/-(saved|custom|user|copy|default)$/i, "");
    return normalized;
  }

  private static cleanServerModelId(rawId: string): string
  {
    let baseName = rawId;
    if (baseName.includes("/") === true)
    {
      const segments = baseName.split("/");
      const lastSegment = segments[segments.length - 1];
      if (lastSegment !== undefined && lastSegment.length > 0)
      {
        baseName = lastSegment;
      }
    }

    if (baseName.includes(":") === true)
    {
      baseName = baseName.split(":")[0] ?? baseName;
    }

    baseName = baseName.replace(/\.(gguf|bin)$/i, "");
    baseName = baseName.replace(/-(saved|custom|user|copy|default)$/i, "");
    return baseName.length > 0 ? baseName : rawId;
  }

  private static buildServerModelDetail(rawServerId: string, commentOverride?: string): LlamaModelDetail
  {
    const matchedCurated = LlamaClient.findCuratedModel(rawServerId);
    return {
      id: matchedCurated?.id ?? LlamaClient.cleanServerModelId(rawServerId),
      serverId: rawServerId,
      name: matchedCurated?.name ?? LlamaClient.computeModelDisplayName(rawServerId),
      comment: commentOverride ?? matchedCurated?.comment,
      defaultRepository: matchedCurated?.defaultRepository,
      aliases: matchedCurated?.aliases,
      isAvailableOnServer: true
    };
  }

  private static computeModelDisplayName(modelId: string): string
  {
    const matchedCurated = LlamaClient.findCuratedModel(modelId);
    if (matchedCurated !== undefined)
    {
      return matchedCurated.name;
    }

    let baseName = LlamaClient.cleanServerModelId(modelId);
    let quantizationSuffix = "";
    if (modelId.includes(":") === true)
    {
      const rawQuantization = modelId.split(":")[1] ?? "";
      if (rawQuantization.length > 0)
      {
        quantizationSuffix = rawQuantization.replace(/_0$/, "").toUpperCase();
      }
    }

    baseName = baseName.replace(/-gguf$/i, "").replace(/-it$/i, "").replace(/-instruct(-\d+)?$/i, "");
    const words = baseName.split(/[-_]+/).filter((word) => word.length > 0);
    const capitalizedWords = words.map((word) =>
    {
      if (/^\d+[A-Za-z]+$/.test(word) === true || /^[A-Z0-9]+$/.test(word) === true)
      {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

    if (quantizationSuffix.length > 0)
    {
      capitalizedWords.push(quantizationSuffix);
    }

    const displayName = capitalizedWords.join(" ");
    return displayName.length > 0 ? displayName : modelId;
  }

  constructor(baseUrl: string)
  {
    const sanitizedBaseUrl = baseUrl.endsWith("/") === true ? baseUrl.slice(0, -1) : baseUrl;
    this.baseUrl = sanitizedBaseUrl;
    this.openai = new OpenAI({
      baseURL: `${sanitizedBaseUrl}/v1`,
      apiKey: "unused"
    });
  }

  public async checkHealth(): Promise<LlamaServerHealth>
  {
    try
    {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5_000)
      });
      if (response.ok === true)
      {
        const payload = (await response.json()) as { status?: string };
        const status = typeof payload.status === "string" ? payload.status : "ok";
        return {
          isReachable: true,
          isReady: status === "ok",
          status: status
        };
      }
      return {
        isReachable: true,
        isReady: false,
        status: `HTTP ${response.status}`,
        details: response.statusText
      };
    }
    catch (error: unknown)
    {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isReachable: false,
        isReady: false,
        status: "offline",
        details: errorMessage
      };
    }
  }

  public async loadModel(model: string, isForcingReload: boolean): Promise<boolean>
  {
    let modelDetail = await this.resolveModelDetail(model, isForcingReload);
    if (modelDetail?.isAvailableOnServer !== true && isForcingReload === false)
    {
      modelDetail = await this.resolveModelDetail(model, true);
    }

    const resolvedModel = modelDetail?.serverId ?? modelDetail?.id ?? model;
    const response = await fetch(`${this.baseUrl}/models/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: resolvedModel }),
      signal: AbortSignal.timeout(120_000)
    });

    if (response.ok === true)
    {
      this.currentLoadedModel = model;
      return true;
    }

    const responseText = await response.text();

    // If the model is already running or loaded on the server, loading succeeded
    if (response.status === 400 && (responseText.toLowerCase().includes("already running") === true || responseText.toLowerCase().includes("already loaded") === true))
    {
      this.currentLoadedModel = model;
      return true;
    }

    // If the server doesn't support router mode, we verify whether the active model matches the requested model
    if (response.status === 404 || response.status === 405)
    {
      const activeModel = await this.getActiveModelId();
      if (activeModel !== undefined)
      {
        const activeCurated = LlamaClient.findCuratedModel(activeModel);
        const requestedCurated = LlamaClient.findCuratedModel(model);
        if (activeModel.toLowerCase() === model.toLowerCase() ||
          (activeCurated !== undefined && activeCurated.id === requestedCurated?.id))
        {
          this.currentLoadedModel = model;
          return true;
        }
      }
    }

    this.currentLoadedModel = undefined;
    if (response.status === 404)
    {
      throw new Error(`The model '${model}' was not found on the llama.cpp server (HTTP 404)`);
    }
    throw new Error(`Could not load the model '${model}': llama.cpp server responded with HTTP status ${response.status} and text '${responseText}'`);
  }

  public async ensureModel(model: string, options?: EnsureModelOptions): Promise<boolean>
  {
    if (this.currentLoadedModel === model)
    {
      return true;
    }

    let hasAttemptedDownload = false;
    while (true)
    {
      try
      {
        await this.loadModel(model, hasAttemptedDownload);
        const logKind = hasAttemptedDownload === true ? "info" : "debug";
        const message = hasAttemptedDownload === true ? `The llama.cpp server has loaded the tensors for newly downloaded model '${model}'` : `The llama.cpp server has loaded the tensors for the model '${model}'`;
        options?.communicator?.sendLog(message, logKind);
        return true;
      }
      catch (error: unknown)
      {
        this.currentLoadedModel = undefined;
        const reason = error instanceof Error ? error.message : String(error);

        // If the model was not found and download has not been tried yet, attempt on-demand download
        if (hasAttemptedDownload === false && reason.toLowerCase().includes("not found") === true && options?.communicator !== undefined)
        {
          hasAttemptedDownload = true;
          options.communicator.sendLog(`Model '${model}' is not present on the llama.cpp server. Attempting on-demand download…`, "debug");
          const isDownloadSuccessful = await this.llamaDownloader.downloadModel({
            model: model,
            communicator: options.communicator,
            baseUrl: this.baseUrl
          });
          if (isDownloadSuccessful === true)
          {
            try
            {
              await this.fetchServerModels(true);
            }
            catch
            {
              // We ignore refresh errors and proceed to the next load attempt
            }
            continue;
          }
        }

        const failureMessage = hasAttemptedDownload === true
          ? `Failed to load newly downloaded model '${model}' into llama.cpp server: ${reason}`
          : `Model '${model}' is not available on the llama.cpp server. In llama.cpp, go to Models, search for '${model}', and click Download. Details: '${reason}'`;
        options?.communicator?.sendLog(failureMessage, "warn");
        return false;
      }
    }
  }

  public async getAllModelDetails(isForcingReload: boolean): Promise<LlamaModelDetail[]>
  {
    const serverDetails = await this.fetchServerModels(isForcingReload);
    const serverModelIds = new Set<string>(serverDetails.map((detail) => detail.id));
    const mergedDetails: LlamaModelDetail[] = [ ...serverDetails ];
    for (const curatedModel of CURATED_LLAMA_MODELS)
    {
      if (serverModelIds.has(curatedModel.id) === false)
      {
        mergedDetails.push({ ...curatedModel, isAvailableOnServer: false });
      }
    }
    return mergedDetails;
  }

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const { completion, durationInMilliseconds, resolvedModelName, modelDetail } =
      await this.executeVisionCompletion(
        options,
        options.prompt,
        {
          temperature: options.temperature ?? 0.2,
          maxTokens: options.maxTokens ?? 2048
        }
      );

    const content = this.extractChoiceContent(completion.choices[0], { withAnswerExtraction: true });

    return {
      content: content,
      durationInMilliseconds: durationInMilliseconds,
      model: resolvedModelName,
      modelDetail: modelDetail,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens
    };
  }

  public async extractTagsWithSchema(options: TagExtractionOptions): Promise<TagExtractionResult>
  {
    const promptText = options.promptTemplate.replace(Helper.TAGS_PLACEHOLDER, options.tags.join(", "));
    const jsonSchema =
      {
        name: "extracted_tags",
        strict: true,
        schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              description: "The list of tags that best match the image.",
              items: {
                type: "string",
                enum: options.tags as string[]
              }
            }
          },
          required: [ "tags" ],
          additionalProperties: false
        }
      };

    const { completion, durationInMilliseconds, resolvedModelName, modelDetail } =
      await this.executeVisionCompletion(
        options,
        promptText,
        {
          temperature: options.temperature ?? 0.1,
          responseFormat: {
            type: "json_schema",
            json_schema: jsonSchema
          }
        },
        "The tag extraction request to the llama.cpp server failed"
      );

    const rawContent = this.extractChoiceContent(completion.choices[0]);
    const matchedTags = this.extractMatchedTags(rawContent, options.tags);

    return {
      tags: matchedTags,
      durationInMilliseconds: durationInMilliseconds,
      model: resolvedModelName,
      modelDetail: modelDetail
    };
  }

  private async executeVisionCompletion(
    options: BaseVisionRequestOptions,
    promptText: string,
    executionParameters: {
      readonly temperature: number;
      readonly maxTokens?: number;
      readonly responseFormat?: ChatCompletionCreateParamsNonStreaming["response_format"];
    },
    errorPrefix?: string
  ): Promise<{
    readonly completion: ChatCompletion;
    readonly durationInMilliseconds: number;
    readonly resolvedModelName: string;
    readonly modelDetail?: LlamaModelDetail;
  }>
  {
    const modelDetail = await this.resolveModelDetail(options.model, false);
    const activeModel = modelDetail?.serverId ?? modelDetail?.id ?? options.model;
    const messages: ChatCompletionMessageParam[] =
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${options.imageBase64}`
              }
            }
          ]
        }
      ];

    const startTimestamp = Date.now();
    let completion: ChatCompletion;
    try
    {
      completion = await this.openai.chat.completions.create(
        {
          model: activeModel,
          messages,
          temperature: executionParameters.temperature,
          max_tokens: executionParameters.maxTokens,
          response_format: executionParameters.responseFormat
        }
      );
    }
    catch (error: unknown)
    {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const prefix = errorPrefix ?? "The request to the llama.cpp server failed. Reason";
      throw new Error(`${prefix}: '${errorMessage}'`);
    }

    return {
      completion: completion,
      durationInMilliseconds: Date.now() - startTimestamp,
      resolvedModelName: modelDetail?.id ?? completion.model ?? activeModel,
      modelDetail: modelDetail
    };
  }

  private async resolveModelDetail(modelIdentifier: string, isForcingReload: boolean): Promise<LlamaModelDetail | undefined>
  {
    const allDetails = await this.getAllModelDetails(isForcingReload);
    const lower = modelIdentifier.toLowerCase();
    const normalized = LlamaClient.normalizeModelIdentifier(modelIdentifier);
    const cleanedBase = LlamaClient.cleanServerModelId(modelIdentifier).toLowerCase();

    // 1. Exact match on id or serverId (prioritizing available server models)
    const matchingDetails = allDetails.filter((detail) =>
    {
      const detailServerId = detail.serverId?.toLowerCase();
      const detailNormalizedServerId = detail.serverId !== undefined ? LlamaClient.normalizeModelIdentifier(detail.serverId) : undefined;
      return detail.id.toLowerCase() === lower || detail.id.toLowerCase() === normalized || detailServerId === lower || detailNormalizedServerId === normalized;
    });
    const exactMatch = matchingDetails.find((detail) => detail.isAvailableOnServer === true) ?? matchingDetails[0];
    if (exactMatch !== undefined)
    {
      return exactMatch;
    }

    // 2. Curated match via aliases or repository
    const curated = LlamaClient.findCuratedModel(modelIdentifier);
    if (curated !== undefined)
    {
      const curatedMatch = allDetails.find((detail) => detail.id === curated.id);
      if (curatedMatch !== undefined)
      {
        return curatedMatch;
      }
    }

    // 3. Fallback: match by checking if any available server model's repo or cleaned ID matches
    const fallbackServerMatch = allDetails.find((detail) =>
    {
      if (detail.isAvailableOnServer !== true)
      {
        return false;
      }
      const detailCleanedBase = LlamaClient.cleanServerModelId(detail.serverId ?? detail.id).toLowerCase();
      return detailCleanedBase === cleanedBase;
    });
    if (fallbackServerMatch !== undefined)
    {
      return fallbackServerMatch;
    }

    // 4. Fallback synthesized detail
    return {
      id: modelIdentifier,
      name: LlamaClient.computeModelDisplayName(modelIdentifier),
      isAvailableOnServer: false
    };
  }

  private async getActiveModelId(): Promise<string | undefined>
  {
    try
    {
      const modelsPage = await this.openai.models.list();
      if (modelsPage.data.length > 0)
      {
        return modelsPage.data[0]?.id;
      }
    }
    catch
    {
      // We fall back to undefined if model listing fails
    }
    return undefined;
  }

  private async fetchServerModels(isForcingReload: boolean): Promise<LlamaModelDetail[]>
  {
    if (isForcingReload === true)
    {
      try
      {
        await fetch(`${this.baseUrl}/models?reload=1`, {
          method: "GET",
          signal: AbortSignal.timeout(3_000)
        });
      }
      catch
      {
        // We ignore errors when triggering preset reload
      }
    }

    const reloadQuery = isForcingReload === true ? "?reload=1" : "";
    try
    {
      const response = await fetch(`${this.baseUrl}/v1/models${reloadQuery}`, {
        signal: AbortSignal.timeout(5_000)
      });
      if (response.ok === true)
      {
        const payload = (await response.json()) as {
          data?: Array<{
            id?: string;
            architecture?: { input_modalities?: string[] };
            tags?: string[];
          }>;
        };
        if (Array.isArray(payload.data) === true)
        {
          return payload.data
            .filter((item): item is {
              id: string;
              architecture?: { input_modalities?: string[] };
              tags?: string[];
            } => typeof item.id === "string" && item.id.length > 0)
            .map((item) =>
            {
              const modalities = item.architecture?.input_modalities;
              let comment: string | undefined;
              if (Array.isArray(modalities) === true && modalities.length > 0)
              {
                comment = `Input modalities: ${modalities.join(", ")}`;
              }
              else if (Array.isArray(item.tags) === true && item.tags.length > 0)
              {
                comment = `Tags: ${item.tags.join(", ")}`;
              }

              return LlamaClient.buildServerModelDetail(item.id, comment);
            });
        }
      }
    }
    catch
    {
      // We fall back to OpenAI client listing below
    }

    try
    {
      const modelsPage = await this.openai.models.list();
      return modelsPage.data.map((item) => LlamaClient.buildServerModelDetail(item.id));
    }
    catch
    {
      return [];
    }
  }

  private extractAnswerFromReasoning(reasoning: string): string
  {
    const trimmedReasoning = reasoning.trim();
    if (trimmedReasoning.length === 0)
    {
      return "";
    }

    const conclusionMarkers = [
      /(?:final\s*(?:output|answer|response|choice|result)|conclusion|summary)\s*(?:\(.*?\))?:\s*(.+)$/is,
      /\n(?:final\s*(?:output|answer|response|choice|result)|conclusion|summary)\s*:\s*(.+)$/is,
      /(?:to\s+summarize|in\s+summary|in\s+conclusion)[,:]\s*(.+)$/is
    ];

    for (const marker of conclusionMarkers)
    {
      const match = marker.exec(trimmedReasoning);
      if (match !== null && match[1] !== undefined && match[1].trim().length > 0)
      {
        return match[1].trim();
      }
    }

    const paragraphs = trimmedReasoning.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0 && paragraph.toLowerCase().startsWith("thinking process") === false);

    if (paragraphs.length > 0)
    {
      const lastParagraph = paragraphs[paragraphs.length - 1];
      if (lastParagraph !== undefined && lastParagraph.length > 0)
      {
        return lastParagraph;
      }
    }

    return trimmedReasoning;
  }

  private extractChoiceContent(choice?: ChatCompletion.Choice, options?: {
    readonly withAnswerExtraction?: boolean
  }): string
  {
    const message = choice?.message as ExtendedMessage | undefined;

    let content = "";
    if (typeof message?.content === "string")
    {
      content = message.content.trim();
    }
    else if (Array.isArray(message?.content) === true)
    {
      content = (message?.content ?? []).map((part) => (typeof part.text === "string" ? part.text : "")).join("").trim();
    }

    const choiceWithText = choice as unknown as { readonly text?: string } | undefined;
    if (content.length === 0 && typeof choiceWithText?.text === "string")
    {
      content = choiceWithText.text.trim();
    }

    // We strip thinking tags if present in content
    if (content.includes("</think>") === true)
    {
      const postThinkContent = content.split("</think>")[1]?.trim();
      if (postThinkContent !== undefined && postThinkContent.length > 0)
      {
        content = postThinkContent;
      }
    }

    // If content is empty, e.g., model generated only reasoning or hit the token limit during thinking
    if (content.length === 0)
    {
      const reasoning = message?.reasoning_content ?? message?.reasoning;
      if (typeof reasoning === "string" && reasoning.trim().length > 0)
      {
        content = options?.withAnswerExtraction === true ? this.extractAnswerFromReasoning(reasoning) : reasoning.trim();
      }
    }

    return content;
  }

  private extractMatchedTags(rawContent: string, candidateTags: readonly string[]): string[]
  {
    const allowedTagsSet = new Set<string>(candidateTags);

    try
    {
      const parsedObject = JSON.parse(rawContent) as { readonly tags?: unknown };
      if (Array.isArray(parsedObject.tags) === true)
      {
        return parsedObject.tags
          .filter((item): item is string => typeof item === "string" && allowedTagsSet.has(item) === true);
      }
    }
    catch
    {
      // In case structured parsing fails, we fallback to safe token matching
    }

    return candidateTags.filter((candidateTag) =>
    {
      const escapedTag = candidateTag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(`\\b${escapedTag}\\b`, "i");
      return pattern.test(rawContent) === true;
    });
  }

}
