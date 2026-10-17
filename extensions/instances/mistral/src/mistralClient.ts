import { Mistral } from "@mistralai/mistralai";
import type {
  AssistantMessage,
  BaseModelCard,
  ChatCompletionResponse,
  FTModelCard,
  ModelCapabilities
} from "@mistralai/mistralai/models/components";
import { MistralError as SdkMistralError } from "@mistralai/mistralai/models/errors";

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

export interface MistralModelDetail
{

  readonly id: string;
  readonly name: string;
  readonly comment?: string;

}

export interface MistralErrorOptions
{

  readonly status?: number;
  readonly isApiKeyInvalid?: boolean;
  readonly isQuotaExceeded?: boolean;
  readonly cause?: unknown;

}

export class MistralError extends Error
{

  public readonly status?: number;

  public readonly isApiKeyInvalid: boolean;

  public readonly isQuotaExceeded: boolean;

  constructor(message: string, options?: MistralErrorOptions)
  {
    super(message);
    this.name = "MistralError";
    this.status = options?.status;
    this.isApiKeyInvalid = options?.isApiKeyInvalid ?? false;
    this.isQuotaExceeded = options?.isQuotaExceeded ?? false;
    this.cause = options?.cause;
  }

}

export class MistralClient
{

  private readonly mistral: Mistral;

  constructor(apiKey: string)
  {
    this.mistral = new Mistral({ apiKey });
  }

  public async getAvailableModelDetails(): Promise<MistralModelDetail[]>
  {
    try
    {
      const response = await this.mistral.models.list();
      const modelDetails: MistralModelDetail[] = [];
      const modelCards: Array<BaseModelCard | FTModelCard> = (response.data ?? []).filter((modelCard): modelCard is BaseModelCard | FTModelCard => modelCard.type === "base" || modelCard.type === "fine-tuned");
      const seenModelIdentifiers: Set<string> = new Set<string>();
      for (const modelCard of modelCards)
      {
        if (seenModelIdentifiers.has(modelCard.id) === true)
        {
          continue;
        }

        const capabilities: ModelCapabilities = modelCard.capabilities;
        if (this.isVisionCapableModel(capabilities, modelCard.id) === true)
        {
          seenModelIdentifiers.add(modelCard.id);
          if (modelCard.aliases !== undefined && Array.isArray(modelCard.aliases) === true)
          {
            for (const alias of modelCard.aliases)
            {
              seenModelIdentifiers.add(alias);
            }
          }

          const name: string = modelCard.name !== undefined ? modelCard.name : modelCard.id;
          const comment: string = modelCard.description !== undefined ? modelCard.description : `Mistral AI vision model (${modelCard.id})`;
          modelDetails.push(
            {
              id: modelCard.id,
              name,
              comment
            }
          );
        }
      }
      return modelDetails;
    }
    catch (error: unknown)
    {
      throw this.createMistralError(error, "Failed to retrieve available models from the Mistral API");
    }
  }

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const startTimestamp: number = Date.now();
    let response: ChatCompletionResponse;

    try
    {
      response = await this.mistral.chat.complete(
        {
          model: options.model,
          maxTokens: options.maxTokens ?? 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  imageUrl: `data:image/jpeg;base64,${options.imageBase64}`
                },
                {
                  type: "text",
                  text: options.prompt
                }
              ]
            }
          ]
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createMistralError(error, "The request to the Mistral API failed");
    }

    const durationInMilliseconds: number = Date.now() - startTimestamp;
    const choice = response.choices !== undefined && response.choices.length > 0 ? response.choices[0] : undefined;
    const captionText: string = this.extractTextFromMessage(choice?.message);

    return {
      content: captionText,
      durationInMilliseconds: durationInMilliseconds,
      model: response.model ?? options.model,
      inputTokens: response.usage?.promptTokens,
      outputTokens: response.usage?.completionTokens
    };
  }

  public async extractTags(options: TagExtractionOptions): Promise<TagExtractionResult>
  {
    const startTimestamp: number = Date.now();
    const promptText: string = options.promptTemplate.replace(Helper.TAGS_PLACEHOLDER, options.tags.join(", "));
    const candidateTagsSet: Set<string> = new Set<string>(options.tags);

    // We attempt tool-based structured tag extraction first
    try
    {
      // noinspection SqlResolve
      const description: string = "Select the tags from the candidate list that accurately apply to the image.";
      const response = await this.mistral.chat.complete(
        {
          model: options.model,
          maxTokens: options.maxTokens,
          tools: [
            {
              type: "function",
              function:
                {
                  name: "select_tags",
                  description: description,
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
                      required: [ "tags" ]
                    }
                }
            }
          ],
          toolChoice: "any",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  imageUrl: `data:image/jpeg;base64,${options.imageBase64}`
                },
                {
                  type: "text",
                  text: promptText
                }
              ]
            }
          ]
        }
      );

      const choice = response.choices !== undefined && response.choices.length > 0 ? response.choices[0] : undefined;
      const toolCalls = choice?.message?.toolCalls;

      if (toolCalls !== undefined && toolCalls !== null && toolCalls.length > 0)
      {
        for (const toolCall of toolCalls)
        {
          if (toolCall.function.name === "select_tags")
          {
            let parsedArguments: { readonly tags?: unknown } | undefined;
            if (typeof toolCall.function.arguments === "string")
            {
              try
              {
                parsedArguments = JSON.parse(toolCall.function.arguments) as { readonly tags?: unknown };
              }
              catch
              {
                parsedArguments = undefined;
              }
            }
            else if (typeof toolCall.function.arguments === "object" && toolCall.function.arguments !== null)
            {
              parsedArguments = toolCall.function.arguments as { readonly tags?: unknown };
            }

            if (Array.isArray(parsedArguments?.tags) === true)
            {
              const matchedTags: string[] = (parsedArguments.tags as unknown[]).filter((tag): tag is string => typeof tag === "string" && candidateTagsSet.has(tag) === true);
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
      const mistralError: MistralError = this.createMistralError(error);
      if (mistralError.isApiKeyInvalid === true || mistralError.isQuotaExceeded === true)
      {
        throw mistralError;
      }
      // We fall back to prompt-based extraction below
    }

    const fallbackPrompt: string = `${promptText}\n\nReturn ONLY a JSON object in the exact format: {"tags": ["tag1", "tag2"]} containing only matching tags from the candidate list.`;
    let fallbackResponse: ChatCompletionResponse;

    try
    {
      fallbackResponse = await this.mistral.chat.complete(
        {
          model: options.model,
          maxTokens: options.maxTokens,
          responseFormat:
            {
              type: "json_object"
            },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  imageUrl: `data:image/jpeg;base64,${options.imageBase64}`
                },
                {
                  type: "text",
                  text: fallbackPrompt
                }
              ]
            }
          ]
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createMistralError(error, "The tag extraction request to the Mistral API failed");
    }

    const choice = fallbackResponse.choices !== undefined && fallbackResponse.choices.length > 0 ? fallbackResponse.choices[0] : undefined;
    const rawText: string = this.extractTextFromMessage(choice?.message);
    const tags: string[] = this.parseCandidateTagsFromText(rawText, options.tags);

    return {
      tags,
      durationInMilliseconds: Date.now() - startTimestamp,
      model: fallbackResponse.model ?? options.model
    };
  }

  private isVisionCapableModel(capabilities: ModelCapabilities, modelId: string): boolean
  {
    if (capabilities.vision === true)
    {
      return true;
    }

    return false;
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
          return parsedJson.tags.filter((tag): tag is string => typeof tag === "string" && candidateTagsSet.has(tag) === true);
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

  private extractTextFromMessage(message: AssistantMessage | undefined): string
  {
    if (message === undefined || message === null)
    {
      return "";
    }

    if (typeof message.content === "string")
    {
      return message.content.trim();
    }

    if (Array.isArray(message.content) === true)
    {
      const textBlocks: string[] = [];
      for (const block of message.content)
      {
        if (block.type === "text" && typeof block.text === "string")
        {
          textBlocks.push(block.text);
        }
      }
      return textBlocks.join("\n").trim();
    }

    return "";
  }

  private createMistralError(error: unknown, prefix?: string): MistralError
  {
    if (error instanceof MistralError)
    {
      return error;
    }

    let status: number | undefined;
    let isApiKeyInvalid: boolean = false;
    let isQuotaExceeded: boolean = false;
    let message: string;

    if (error instanceof SdkMistralError || (typeof error === "object" && error !== null && "statusCode" in error))
    {
      const sdkError = error as { readonly statusCode?: number; readonly message?: string; readonly body?: string };
      status = sdkError.statusCode;
      isApiKeyInvalid = sdkError.statusCode === 401;
      isQuotaExceeded = sdkError.statusCode === 429;

      let subtitle: string;
      if (isApiKeyInvalid === true)
      {
        subtitle = "The Mistral API key is invalid";
      }
      else if (isQuotaExceeded === true)
      {
        subtitle = "The Mistral API quota or rate limit has been exceeded";
      }
      else if (typeof sdkError.message === "string" && sdkError.message.length > 0)
      {
        subtitle = sdkError.message;
      }
      else
      {
        subtitle = "Mistral API request failed";
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

    return new MistralError(
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
