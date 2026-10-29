import OpenAI, { APIError, AuthenticationError, RateLimitError } from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessage
} from "openai/resources/chat/completions";

import { Helper } from "@picteus/extension-sdk";


type ExtraCompletionParams = Omit<ChatCompletionCreateParamsNonStreaming, "model" | "messages" | "max_tokens" | "max_completion_tokens">;

interface TagExtractionStrategy
{

  readonly prompt: string;
  readonly extraParams: ExtraCompletionParams;
  readonly parseTags: (message: ChatCompletionMessage | undefined) => string[] | undefined;

}

const SELECT_TAGS_NAME = "select_tags";

// Shared regexes matching o-series, GPT-5 / GPT-6+ unified reasoning models, and ChatGPT Instant aliases
const REASONING_VISION_PATTERNS: readonly RegExp[] = [
  /^o\d+(?:[-.]|$)/,
  /^gpt-(?:[5-9]|\d{2,})(?:[-.]|$)/,
  /^(?:chatgpt-(?:[5-9]|\d{2,})|chat-latest)(?:[-.]|$)/
];

const EXTRA_REASONING_PREFIXES: readonly string[] = [
  "codex", "gpt-oss", "computer-use", "gpt-daybreak", "gpt-rosalind"
];

const VISION_EXCLUDED_SUBSTRINGS: readonly string[] = [
  "text-embedding", "embedding", "whisper", "tts", "audio", "realtime", "transcribe",
  "moderation", "dall-e", "gpt-image", "chatgpt-image", "gpt-live", "gpt-oss",
  "babbage", "davinci", "instruct", "search-preview", "computer-use", "codex",
  // Responses-API-only variants (unsupported in v1/chat/completions)
  "deep-research", "-pro", "-cyber", "gpt-daybreak", "gpt-rosalind",
  // Text-only snapshots within otherwise multimodal families
  "o1-mini", "o1-preview", "o3-mini"
];

// Starting with GPT-5.4 and GPT-6, Chat Completions does not support tool calling with default reasoning effort
const UNSUPPORTED_CHAT_TOOL_PATTERNS: readonly RegExp[] = [
  /^gpt-5\.(?:[4-9]|\d{2,})(?:[-.]|$)/,
  /^gpt-(?:[6-9]|\d{2,})(?:[-.]|$)/
];


export interface BaseRequestOptions
{

  readonly model: string;
  readonly imageBase64: string;
  readonly maxTokens?: number;

}

export interface ChatRequestOptions extends BaseRequestOptions
{

  readonly prompt: string;

}

export interface TagExtractionOptions extends BaseRequestOptions
{

  readonly tags: string[];
  readonly promptTemplate: string;

}

export interface BaseResponseResult
{

  readonly durationInMilliseconds: number;
  readonly model: string;

}

export interface ChatResponseResult extends BaseResponseResult
{

  readonly content: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;

}

export interface TagExtractionResult extends BaseResponseResult
{

  readonly tags: string[];

}

export interface OpenAiModelDetail
{

  readonly id: string;
  readonly name: string;
  readonly comment?: string;

}

export interface OpenAiErrorOptions
{

  readonly status?: number;
  readonly isApiKeyInvalid?: boolean;
  readonly isQuotaExceeded?: boolean;
  readonly cause?: unknown;

}

export class OpenAiError extends Error
{

  public readonly status?: number;

  public readonly isApiKeyInvalid: boolean;

  public readonly isQuotaExceeded: boolean;

  constructor(message: string, options?: OpenAiErrorOptions)
  {
    super(message);
    this.name = "OpenAiError";
    this.status = options?.status;
    this.isApiKeyInvalid = options?.isApiKeyInvalid ?? false;
    this.isQuotaExceeded = options?.isQuotaExceeded ?? false;
    this.cause = options?.cause;
  }

}

export class OpenAiClient
{

  private readonly openai: OpenAI;

  constructor(apiKey: string)
  {
    this.openai = new OpenAI({ apiKey });
  }

  public async getAvailableModelDetails(): Promise<OpenAiModelDetail[]>
  {
    try
    {
      const retrievedModels: OpenAiModelDetail[] = [];
      const seenModelIdentifiers: Set<string> = new Set<string>();

      for await (const modelInfo of await this.openai.models.list())
      {
        if (this.isVisionCapableModel(modelInfo.id) && !seenModelIdentifiers.has(modelInfo.id))
        {
          seenModelIdentifiers.add(modelInfo.id);
          retrievedModels.push(
            {
              id: modelInfo.id,
              name: modelInfo.id,
              comment: `OpenAI vision model (${modelInfo.id})`
            }
          );
        }
      }

      return retrievedModels;
    }
    catch (error: unknown)
    {
      throw this.createOpenAiError(error, "Failed to retrieve available models from the OpenAI API");
    }
  }

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const startTimestamp: number = Date.now();
    const response: ChatCompletion = await this.createVisionCompletion(
      options,
      options.prompt,
      undefined,
      "The request to the OpenAI API failed"
    );

    return {
      content: this.extractTextFromMessage(response.choices?.[0]?.message),
      durationInMilliseconds: Date.now() - startTimestamp,
      model: response.model ?? options.model,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens
    };
  }

  public async extractTags(options: TagExtractionOptions): Promise<TagExtractionResult>
  {
    const startTimestamp: number = Date.now();
    const promptText: string = options.promptTemplate.replace(Helper.TAGS_PLACEHOLDER, options.tags.join(", "));
    const candidateTagsSet: Set<string> = new Set<string>(options.tags);
    // noinspection SqlResolve
    const description: string = "Select the tags from the candidate list that accurately apply to the image.";
    const tagSelectionSchema: Record<string, unknown> =
      {
        type: "object",
        properties:
          {
            tags:
              {
                type: "array",
                description: "The list of selected tags that apply to the image.",
                items: { type: "string", enum: options.tags }
              }
          },
        required: [ "tags" ],
        additionalProperties: false
      };

    const strategies: TagExtractionStrategy[] = [];
    if (this.supportsChatCompletionsToolCalling(options.model))
    {
      strategies.push(
        {
          prompt: promptText,
          extraParams:
            {
              tools: [
                {
                  type: "function",
                  function: { name: SELECT_TAGS_NAME, description, strict: true, parameters: tagSelectionSchema }
                }
              ],
              tool_choice: { type: "function", function: { name: SELECT_TAGS_NAME } }
            },
          parseTags: (message) => this.extractTagsFromToolCalls(message, candidateTagsSet)
        }
      );
    }

    strategies.push(
      {
        prompt: promptText,
        extraParams:
          {
            response_format:
              {
                type: "json_schema",
                json_schema: { name: SELECT_TAGS_NAME, description, strict: true, schema: tagSelectionSchema }
              }
          },
        parseTags: (message) =>
        {
          const rawText: string = this.extractTextFromMessage(message);
          return rawText.length > 0 ? this.parseCandidateTagsFromText(rawText, options.tags, candidateTagsSet) : undefined;
        }
      },
      {
        prompt: `${promptText}\n\nReturn ONLY a JSON object in the exact format: {"tags": ["tag1", "tag2"]} containing only matching tags from the candidate list.`,
        extraParams: { response_format: { type: "json_object" } },
        parseTags: (message) => this.parseCandidateTagsFromText(this.extractTextFromMessage(message), options.tags, candidateTagsSet)
      }
    );

    for (let index = 0; index < strategies.length; index++)
    {
      const strategy: TagExtractionStrategy = strategies[index];
      const isLastStrategy: boolean = index === strategies.length - 1;

      try
      {
        const response: ChatCompletion = await this.createVisionCompletion(
          options,
          strategy.prompt,
          strategy.extraParams,
          isLastStrategy ? "The tag extraction request to the OpenAI API failed" : undefined
        );
        const matchedTags: string[] | undefined = strategy.parseTags(response.choices?.[0]?.message);
        if (matchedTags !== undefined || isLastStrategy)
        {
          return {
            tags: matchedTags ?? [],
            durationInMilliseconds: Date.now() - startTimestamp,
            model: response.model ?? options.model
          };
        }
      }
      catch (error: unknown)
      {
        const openAiError: OpenAiError = this.createOpenAiError(error);
        if (isLastStrategy || openAiError.isApiKeyInvalid || openAiError.isQuotaExceeded)
        {
          throw openAiError;
        }
      }
    }

    return { tags: [], durationInMilliseconds: Date.now() - startTimestamp, model: options.model };
  }

  public isReasoningModel(modelId: string): boolean
  {
    const baseModelId: string = this.normalizeBaseModelId(modelId);
    return REASONING_VISION_PATTERNS.some((pattern) => pattern.test(baseModelId)) || EXTRA_REASONING_PREFIXES.some((prefix) => baseModelId.startsWith(prefix));
  }

  public isVisionCapableModel(modelId: string): boolean
  {
    const baseModelId: string = this.normalizeBaseModelId(modelId);
    return !VISION_EXCLUDED_SUBSTRINGS.some((excluded) => baseModelId.includes(excluded)) && REASONING_VISION_PATTERNS.some((pattern) => pattern.test(baseModelId));
  }

  private async createVisionCompletion(
    options: BaseRequestOptions,
    prompt: string,
    extraParams?: ExtraCompletionParams,
    errorPrefix?: string
  ): Promise<ChatCompletion>
  {
    const isReasoning: boolean = this.isReasoningModel(options.model);
    const supportsReasoningEffort: boolean = isReasoning && !this.normalizeBaseModelId(options.model).includes("chat-latest");
    const tokenParameters: { max_completion_tokens?: number; max_tokens?: number } =
      options.maxTokens === undefined
        ? {}
        : isReasoning
          ? { max_completion_tokens: options.maxTokens }
          : { max_tokens: options.maxTokens };

    try
    {
      return await this.openai.chat.completions.create(
        {
          model: options.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${options.imageBase64}`, detail: "auto" }
                },
                {
                  type: "text",
                  text: prompt
                }
              ]
            }
          ],
          ...(supportsReasoningEffort ? { reasoning_effort: "low" } : {}),
          ...extraParams,
          ...tokenParameters
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createOpenAiError(error, errorPrefix);
    }
  }

  private normalizeBaseModelId(modelId: string): string
  {
    const withoutFineTunePrefix: string = modelId.trim().toLowerCase().replace(/^ft[:-]/, "");
    const colonIndex: number = withoutFineTunePrefix.indexOf(":");
    return colonIndex === -1 ? withoutFineTunePrefix : withoutFineTunePrefix.slice(0, colonIndex);
  }

  private supportsChatCompletionsToolCalling(modelId: string): boolean
  {
    const baseModelId: string = this.normalizeBaseModelId(modelId);
    return !UNSUPPORTED_CHAT_TOOL_PATTERNS.some((pattern) => pattern.test(baseModelId));
  }

  private extractTagsFromToolCalls(
    message: ChatCompletionMessage | undefined,
    candidateTagsSet: ReadonlySet<string>
  ): string[] | undefined
  {
    for (const toolCall of message?.tool_calls ?? [])
    {
      if (toolCall.type === "function" && toolCall.function.name === SELECT_TAGS_NAME)
      {
        const parsedTags: string[] | undefined = this.parseTagsJson(toolCall.function.arguments, candidateTagsSet);
        if (parsedTags !== undefined)
        {
          return parsedTags;
        }
      }
    }
    return undefined;
  }

  private parseTagsJson(jsonText: string, candidateTagsSet: ReadonlySet<string>): string[] | undefined
  {
    try
    {
      const parsed = JSON.parse(jsonText) as { readonly tags?: unknown };
      if (Array.isArray(parsed?.tags))
      {
        return parsed.tags.filter((tag): tag is string => typeof tag === "string" && candidateTagsSet.has(tag));
      }
    }
    catch
    {
      // Ignored: caller falls back to alternative parsing
    }
    return undefined;
  }

  private parseCandidateTagsFromText(
    text: string,
    candidateTags: readonly string[],
    candidateTagsSet: ReadonlySet<string>
  ): string[]
  {
    const jsonMatch: RegExpMatchArray | null = text.match(/\{[\s\S]*}/);
    if (jsonMatch !== null)
    {
      const parsedTags: string[] | undefined = this.parseTagsJson(jsonMatch[0], candidateTagsSet);
      if (parsedTags !== undefined)
      {
        return parsedTags;
      }
    }

    return candidateTags.filter(
      (candidateTag) =>
      {
        const escapedTag: string = candidateTag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        return new RegExp(`\\b${escapedTag}\\b`, "i").test(text);
      }
    );
  }

  private extractTextFromMessage(message: ChatCompletionMessage | undefined): string
  {
    const content: unknown = message?.content;
    if (typeof content === "string")
    {
      return content.trim();
    }
    if (Array.isArray(content))
    {
      return content
        .filter((part): part is {
          readonly text: string
        } => typeof part === "object" && part !== null && typeof (part as { text?: unknown }).text === "string")
        .map((part) => part.text)
        .join("\n")
        .trim();
    }
    return "";
  }

  private createOpenAiError(error: unknown, prefix?: string): OpenAiError
  {
    if (error instanceof OpenAiError)
    {
      return prefix !== undefined ? new OpenAiError(`${prefix}: ${error.message}`, error) : error;
    }

    let status: number | undefined;
    let isApiKeyInvalid: boolean = false;
    let isQuotaExceeded: boolean = false;
    let message: string;

    if (error instanceof APIError || (typeof error === "object" && error !== null && "status" in error))
    {
      const apiError = error as APIError;
      status = apiError.status;
      isApiKeyInvalid = status === 401 || error instanceof AuthenticationError;
      isQuotaExceeded = status === 429 || error instanceof RateLimitError;
      const apiErrorMessage: string | undefined = (apiError.error as {
        readonly message?: string
      } | undefined)?.message;

      if (isApiKeyInvalid)
      {
        message = "The OpenAI API key is invalid";
      }
      else if (isQuotaExceeded)
      {
        message = "The OpenAI API quota or rate limit has been exceeded";
      }
      else
      {
        message = typeof apiErrorMessage === "string" && apiErrorMessage.length > 0 ? apiErrorMessage : apiError.message;
      }
    }
    else
    {
      message = error instanceof Error ? error.message : String(error);
    }

    return new OpenAiError(
      prefix !== undefined ? `${prefix}: ${message}` : message,
      { status, isApiKeyInvalid, isQuotaExceeded, cause: error }
    );
  }

}
