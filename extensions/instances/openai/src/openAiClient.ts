import OpenAI, { APIError, AuthenticationError, RateLimitError } from "openai";
import type { ChatCompletion, ChatCompletionMessage } from "openai/resources/chat/completions";

import { Helper } from "@picteus/extension-sdk";


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
    this.openai = new OpenAI({ apiKey: apiKey });
  }

  public async getAvailableModelDetails(): Promise<OpenAiModelDetail[]>
  {
    try
    {
      const modelsPage = await this.openai.models.list();
      const retrievedModels: OpenAiModelDetail[] = [];
      const seenModelIdentifiers: Set<string> = new Set<string>();

      for await (const modelInfo of modelsPage)
      {
        if (this.isVisionCapableModel(modelInfo.id) === true && seenModelIdentifiers.has(modelInfo.id) === false)
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
    const tokenParameters = this.computeTokenParameters(options.model, options.maxTokens);
    let response: ChatCompletion;

    try
    {
      response = await this.openai.chat.completions.create(
        {
          model: options.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url:
                    {
                      url: `data:image/jpeg;base64,${options.imageBase64}`,
                      detail: "auto"
                    }
                },
                {
                  type: "text",
                  text: options.prompt
                }
              ]
            }
          ],
          ...tokenParameters
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createOpenAiError(error, "The request to the OpenAI API failed");
    }

    const durationInMilliseconds: number = Date.now() - startTimestamp;
    const choice = response.choices !== undefined && response.choices.length > 0 ? response.choices[0] : undefined;
    const captionText: string = this.extractTextFromMessage(choice?.message);

    return {
      content: captionText,
      durationInMilliseconds: durationInMilliseconds,
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
    const tokenParameters = this.computeTokenParameters(options.model, options.maxTokens);

    // We attempt tool-based structured tag extraction first
    try
    {
      // noinspection SqlResolve
      const description: string = "Select the tags from the candidate list that accurately apply to the image.";
      const response: ChatCompletion = await this.openai.chat.completions.create(
        {
          model: options.model,
          tools: [
            {
              type: "function",
              function:
                {
                  name: "select_tags",
                  description: description,
                  strict: true,
                  parameters:
                    {
                      type: "object",
                      properties:
                        {
                          tags:
                            {
                              type: "array",
                              description: "The list of selected tags that apply to the image.",
                              items:
                                {
                                  type: "string",
                                  enum: options.tags
                                }
                            }
                        },
                      required: [ "tags" ],
                      additionalProperties: false
                    }
                }
            }
          ],
          tool_choice:
            {
              type: "function",
              function:
                {
                  name: "select_tags"
                }
            },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url:
                    {
                      url: `data:image/jpeg;base64,${options.imageBase64}`,
                      detail: "auto"
                    }
                },
                {
                  type: "text",
                  text: promptText
                }
              ]
            }
          ],
          ...tokenParameters
        }
      );

      const choice = response.choices !== undefined && response.choices.length > 0 ? response.choices[0] : undefined;
      if (choice?.message?.tool_calls !== undefined)
      {
        for (const toolCall of choice.message.tool_calls)
        {
          if (toolCall.type === "function" && toolCall.function.name === "select_tags")
          {
            const parsedArguments = JSON.parse(toolCall.function.arguments) as { readonly tags?: unknown };
            if (Array.isArray(parsedArguments?.tags) === true)
            {
              const matchedTags: string[] = parsedArguments.tags.filter(
                (tag): tag is string =>
                {
                  return typeof tag === "string" && candidateTagsSet.has(tag) === true;
                }
              );

              return {
                tags: matchedTags,
                durationInMilliseconds: Date.now() - startTimestamp,
                model: response.model ?? options.model
              };
            }
          }
        }
      }
    }
    catch (error: unknown)
    {
      const openAiError: OpenAiError = this.createOpenAiError(error);
      if (openAiError.isApiKeyInvalid === true || openAiError.isQuotaExceeded === true)
      {
        throw openAiError;
      }
      // We fall back to prompt-based extraction below
    }

    const fallbackPrompt: string = `${promptText}\n\nReturn ONLY a JSON object in the exact format: {"tags": ["tag1", "tag2"]} containing only matching tags from the candidate list.`;
    let fallbackResponse: ChatCompletion;

    try
    {
      fallbackResponse = await this.openai.chat.completions.create(
        {
          model: options.model,
          response_format:
            {
              type: "json_object"
            },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url:
                    {
                      url: `data:image/jpeg;base64,${options.imageBase64}`,
                      detail: "auto"
                    }
                },
                {
                  type: "text",
                  text: fallbackPrompt
                }
              ]
            }
          ],
          ...tokenParameters
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createOpenAiError(error, "The tag extraction request to the OpenAI API failed");
    }

    const fallbackChoice = fallbackResponse.choices !== undefined && fallbackResponse.choices.length > 0 ? fallbackResponse.choices[0] : undefined;
    const rawText: string = this.extractTextFromMessage(fallbackChoice?.message);
    const matchedTags: string[] = this.parseCandidateTagsFromText(rawText, options.tags);

    return {
      tags: matchedTags,
      durationInMilliseconds: Date.now() - startTimestamp,
      model: fallbackResponse.model ?? options.model
    };
  }

  private computeTokenParameters(model: string, maxTokens?: number): Record<string, number>
  {
    if (maxTokens === undefined)
    {
      return {};
    }

    if (this.isReasoningModel(model) === true)
    {
      return {
        max_completion_tokens: maxTokens
      };
    }

    return {
      max_tokens: maxTokens
    };
  }

  private isReasoningModel(modelId: string): boolean
  {
    const lowerCaseModelId: string = modelId.toLowerCase();
    const reasoningPrefixes: readonly string[] = [ "o1", "o3", "o4" ];
    return reasoningPrefixes.some(
      (prefix) =>
      {
        return lowerCaseModelId.startsWith(prefix) === true;
      }
    );
  }

  private parseCandidateTagsFromText(text: string, candidateTags: string[]): string[]
  {
    const candidateTagsSet: Set<string> = new Set<string>(candidateTags);
    try
    {
      const jsonMatch: RegExpMatchArray | null = text.match(/\{[\s\S]*}/);
      if (jsonMatch !== null)
      {
        const parsedJson = JSON.parse(jsonMatch[0]) as { readonly tags?: unknown };
        if (Array.isArray(parsedJson?.tags) === true)
        {
          return parsedJson.tags.filter(
            (tag): tag is string =>
            {
              return typeof tag === "string" && candidateTagsSet.has(tag) === true;
            }
          );
        }
      }
    }
    catch
    {
      // We fall back to token pattern matching below
    }

    const matchedTags: string[] = [];
    for (const candidateTag of candidateTags)
    {
      const escapedTag: string = candidateTag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const pattern: RegExp = new RegExp(`\\b${escapedTag}\\b`, "i");
      if (pattern.test(text) === true && candidateTagsSet.has(candidateTag) === true)
      {
        matchedTags.push(candidateTag);
      }
    }
    return matchedTags;
  }

  private extractTextFromMessage(message: ChatCompletionMessage | undefined): string
  {
    if (message === undefined || message.content === null || message.content === undefined)
    {
      return "";
    }
    if (typeof message.content === "string")
    {
      return message.content.trim();
    }
    const rawContent: unknown = message.content;
    if (Array.isArray(rawContent) === true)
    {
      const textParts: string[] = [];
      for (const part of rawContent)
      {
        if (typeof part === "object" && part !== null && "text" in part && typeof (part as {
          text?: unknown
        }).text === "string")
        {
          textParts.push((part as { text: string }).text);
        }
      }
      return textParts.join("\n").trim();
    }
    return "";
  }

  private isVisionCapableModel(modelId: string): boolean
  {
    const lowerCaseModelId: string = modelId.toLowerCase();

    const excludedSubstrings: readonly string[] = [
      "text-embedding",
      "embedding",
      "whisper",
      "tts",
      "audio",
      "realtime",
      "transcribe",
      "moderation",
      "dall-e",
      "gpt-image",
      "babbage",
      "davinci",
      "instruct",
      "search-preview",
      "computer-use",
      "codex",
      "o1-mini"
    ];

    const hasExcludedSubstring: boolean = excludedSubstrings.some(
      (excluded) =>
      {
        return lowerCaseModelId.includes(excluded) === true;
      }
    );

    if (hasExcludedSubstring === true)
    {
      return false;
    }

    const visionPrefixes: readonly string[] = [
      "gpt-4o",
      "gpt-4.1",
      "gpt-4-turbo",
      "gpt-4-vision",
      "gpt-5",
      "gpt-6",
      "chatgpt-4o",
      "o1",
      "o3",
      "o4"
    ];

    return visionPrefixes.some(
      (prefix) =>
      {
        return lowerCaseModelId.startsWith(prefix) === true;
      }
    );
  }

  private createOpenAiError(error: unknown, prefix?: string): OpenAiError
  {
    if (error instanceof OpenAiError)
    {
      return error;
    }

    let status: number | undefined;
    let isApiKeyInvalid: boolean = false;
    let isQuotaExceeded: boolean = false;
    let message: string;

    if (error instanceof APIError || (typeof error === "object" && error !== null && "status" in error))
    {
      const apiError = error as APIError;
      status = apiError.status;
      isApiKeyInvalid = apiError.status === 401 || error instanceof AuthenticationError;
      isQuotaExceeded = apiError.status === 429 || error instanceof RateLimitError;

      const rawError = apiError.error as {
        readonly message?: string;
        readonly type?: string;
      } | undefined;
      const apiErrorMessage = rawError?.message;

      let subtitle: string;
      if (isApiKeyInvalid === true)
      {
        subtitle = "The OpenAI API key is invalid";
      }
      else if (isQuotaExceeded === true)
      {
        subtitle = "The OpenAI API quota or rate limit has been exceeded";
      }
      else if (typeof apiErrorMessage === "string" && apiErrorMessage.length > 0)
      {
        subtitle = apiErrorMessage;
      }
      else
      {
        subtitle = apiError.message;
      }

      message = subtitle;
    }
    else if (error instanceof Error)
    {
      message = error.message;
    }
    else
    {
      message = String(error);
    }

    const fullMessage = prefix !== undefined ? `${prefix}: ${message}` : message;

    return new OpenAiError(
      fullMessage,
      {
        status: status,
        isApiKeyInvalid: isApiKeyInvalid,
        isQuotaExceeded: isQuotaExceeded,
        cause: error
      }
    );
  }

}
