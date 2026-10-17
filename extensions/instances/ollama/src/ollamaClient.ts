import { type ChatResponse, type ModelResponse, Ollama } from "ollama";

import { Helper } from "@picteus/extension-sdk";


export interface OllamaServerHealth
{

  readonly isReachable: boolean;
  readonly isReady: boolean;
  readonly version?: string;
  readonly details?: string;

}

export interface ChatRequestOptions
{

  readonly model: string;
  readonly prompt: string;
  readonly image: Uint8Array;

}

export interface ChatResponseResult
{

  readonly content: string;
  readonly durationInMilliseconds: number;
  readonly model: string;

}

export interface TagExtractionOptions
{

  readonly model: string;
  readonly promptTemplate: string;
  readonly tags: string[];
  readonly image: Uint8Array;

}

export interface TagExtractionResult
{

  readonly tags: string[];
  readonly durationInMilliseconds: number;
  readonly model: string;

}

export interface OllamaModelDetail
{

  readonly id: string;
  readonly name: string;
  readonly comment?: string;

}

interface OllamaModelItem extends ModelResponse
{

  readonly capabilities?: string[];

}

export class OllamaClient
{

  private readonly baseUrl: string;

  private readonly ollama: Ollama;

  constructor(baseUrl: string)
  {
    const sanitizedBaseUrl = baseUrl.endsWith("/") === true ? baseUrl.slice(0, -1) : baseUrl;
    this.baseUrl = sanitizedBaseUrl;
    this.ollama = new Ollama(
      {
        host: sanitizedBaseUrl
      }
    );
  }

  public async checkHealth(): Promise<OllamaServerHealth>
  {
    try
    {
      const versionResponse = await this.ollama.version();
      return {
        isReachable: true,
        isReady: true,
        version: versionResponse.version
      };
    }
    catch (error: unknown)
    {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isReachable: false,
        isReady: false,
        details: errorMessage
      };
    }
  }

  public async pullModel(model: string): Promise<void>
  {
    await this.ollama.pull({ model });
  }

  public async getAvailableModelDetails(): Promise<OllamaModelDetail[]>
  {
    const response = await this.ollama.list();
    const modelDetails: OllamaModelDetail[] = [];

    for (const model of response.models as OllamaModelItem[])
    {
      if (this.isVisionCapableModel(model) === true)
      {
        const commentDetails: string[] = [];
        if (typeof model.details?.parameter_size === "string" && model.details.parameter_size.length > 0)
        {
          commentDetails.push(model.details.parameter_size);
        }
        if (typeof model.details?.quantization_level === "string" && model.details.quantization_level.length > 0)
        {
          commentDetails.push(model.details.quantization_level);
        }
        if (typeof model.details?.format === "string" && model.details.format.length > 0)
        {
          commentDetails.push(model.details.format.toUpperCase());
        }
        modelDetails.push(
          {
            id: model.name,
            name: this.computeModelDisplayName(model.name),
            comment: commentDetails.length > 0 ? `Ollama model (${commentDetails.join(", ")})` : `Ollama model (${model.name})`
          }
        );
      }
    }

    return modelDetails;
  }

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const startTimestamp = Date.now();
    let response: ChatResponse = await this.ollama.chat(
      {
        model: options.model,
        messages:
          [
            {
              role: "user",
              content: options.prompt,
              images:
                [
                  options.image
                ]
            }
          ]
      }
    );

    const durationInMilliseconds = Date.now() - startTimestamp;
    return {
      content: response.message.content,
      durationInMilliseconds: durationInMilliseconds,
      model: options.model
    };
  }

  public async extractTags(options: TagExtractionOptions): Promise<TagExtractionResult>
  {
    const promptText = options.promptTemplate.replace(Helper.TAGS_PLACEHOLDER, options.tags.join(", "));
    const chatResult = await this.generateChatCompletion(
      {
        model: options.model,
        prompt: promptText,
        image: options.image
      }
    );

    const collectedTags: string[] = [];
    for (const tag of options.tags)
    {
      const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern = new RegExp(`\\b${escapedTag}\\b`, "i");
      if (pattern.test(chatResult.content) === true)
      {
        collectedTags.push(tag);
      }
    }

    return {
      tags: collectedTags,
      durationInMilliseconds: chatResult.durationInMilliseconds,
      model: options.model
    };
  }

  private computeModelDisplayName(modelName: string): string
  {
    const sanitized = modelName.trim();
    if (sanitized.length === 0)
    {
      return "Ollama";
    }

    const friendlyDisplayNames: Record<string, string> =
      {
        "gemma4": "Gemma 4",
        "gemma3": "Gemma 3",
        "qwen2.5vl": "Qwen 2.5-VL",
        "qwen2.5-vl": "Qwen 2.5-VL",
        "qwen3-vl": "Qwen 3-VL",
        "llama3.2-vision": "Llama 3.2 Vision",
        "pixtral": "Pixtral",
        "minicpm-v": "MiniCPM-V",
        "moondream": "Moondream",
        "smolvlm": "SmolVLM",
        "llava": "LLaVA",
        "llava-llama3": "LLaVA Llama 3",
        "llava-phi3": "LLaVA Phi 3",
        "bakllava": "BakLLaVA",
        "granite3.2-vision": "Granite 3.2 Vision",
        "mistral-small3.2": "Mistral Small 3.2",
        "nemotron3": "Nemotron 3"
      };

    // We strip repository prefixes if any (e.g., "library/llava" -> "llava")
    const withoutRepository = sanitized.includes("/") === true
      ? sanitized.split("/").slice(1).join("/")
      : sanitized;

    const segments = withoutRepository.split(":");
    const baseName = segments[0] ?? "";
    const tag = segments[1] ?? "";

    const baseDisplayName = friendlyDisplayNames[baseName] ?? this.formatModelBaseName(baseName);

    if (tag.length > 0 && tag !== "latest")
    {
      const formattedTag = tag
        .split(/[-_]+/)
        .map(
          (segment) =>
          {
            if (/^\d+[A-Za-z]+$/.test(segment) === true || /^[A-Z0-9]+$/.test(segment) === true)
            {
              return segment.toUpperCase();
            }
            return segment.charAt(0).toUpperCase() + segment.slice(1);
          }
        )
        .join(" ");

      return `${baseDisplayName} ${formattedTag}`.trim();
    }

    return baseDisplayName;
  }

  private formatModelBaseName(baseName: string): string
  {
    const words: string[] = baseName.split(/[-_]+/).filter((word) => word.length > 0);
    const capitalizedWords: string[] = words.map(
      (word) =>
      {
        if (/^\d+[A-Za-z]+$/.test(word) === true || /^[A-Z0-9]+$/.test(word) === true)
        {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
    );
    const displayName: string = capitalizedWords.join(" ");
    return displayName.length > 0 ? displayName : baseName;
  }

  private isVisionCapableModel(model: OllamaModelItem): boolean
  {
    if (Array.isArray(model.capabilities) === true)
    {
      return model.capabilities.includes("vision");
    }

    // We check families and known vision prefixes if capabilities are not returned
    const families: string[] = model.details?.families ?? [];
    if (families.some((family) => family.toLowerCase().includes("clip") === true || family.toLowerCase().includes("vl") === true))
    {
      return true;
    }

    const lowerCaseName: string = model.name.toLowerCase();
    const visionKeywords: readonly string[] = [ "vl", "vision", "llava", "bakllava", "moondream", "minicpm", "pixtral", "smolvlm" ];
    return visionKeywords.some((keyword) => lowerCaseName.includes(keyword) === true);
  }

}
