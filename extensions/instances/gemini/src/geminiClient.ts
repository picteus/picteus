import {
  ApiError,
  type ContentListUnion,
  GenerateContentResponse,
  GoogleGenAI,
  type PartUnion,
  Type
} from "@google/genai";

import { Helper } from "@picteus/extension-sdk";


export interface BaseImageData
{

  readonly data: string;
  readonly mimeType?: string;

}

export interface ReferenceImage extends BaseImageData
{

}

export interface GeneratedImage extends BaseImageData
{

  readonly mimeType: string;
  readonly displayName?: string;

}

export interface BaseModelRequestOptions
{

  readonly model: string;

}

export interface GenerateImageOptions extends BaseModelRequestOptions
{

  readonly prompt: string;
  readonly aspectRatio: string;
  readonly referenceImages: ReferenceImage[];

}

export interface BaseVisionRequestOptions extends BaseModelRequestOptions
{

  readonly imageBase64: string;
  readonly maxTokens?: number;

}

export interface ChatRequestOptions extends BaseVisionRequestOptions
{

  readonly prompt: string;

}

export interface TagExtractionOptions extends BaseVisionRequestOptions
{

  readonly tags: string[];
  readonly promptTemplate: string;

}

export interface BaseExecutionResult
{

  readonly durationInMilliseconds: number;

}

export interface GenerateImageResult extends BaseExecutionResult
{

  readonly images: GeneratedImage[];
  readonly textParts: string[];
  readonly totalPartsCount: number;

}

export interface BaseModelResponseResult extends BaseExecutionResult
{

  readonly model: string;

}

export interface TokenUsage
{

  readonly inputTokens?: number;
  readonly outputTokens?: number;

}

export interface ChatResponseResult extends BaseModelResponseResult, TokenUsage
{

  readonly content: string;

}

export interface TagExtractionResult extends BaseModelResponseResult
{

  readonly tags: string[];

}

export interface BaseModelDetail
{

  readonly id: string;
  readonly name?: string;
  readonly comment?: string;

}

export interface GeminiModelDetail extends BaseModelDetail
{

}

export interface GeminiErrorOptions
{

  readonly status?: number;
  readonly isApiKeyInvalid?: boolean;
  readonly isQuotaExceeded?: boolean;
  readonly cause?: unknown;

}

export class GeminiError extends Error
{

  public readonly status?: number;

  public readonly isApiKeyInvalid: boolean;

  public readonly isQuotaExceeded: boolean;

  constructor(message: string, options?: GeminiErrorOptions)
  {
    super(message);
    this.name = "GeminiError";
    this.status = options?.status;
    this.isApiKeyInvalid = options?.isApiKeyInvalid ?? false;
    this.isQuotaExceeded = options?.isQuotaExceeded ?? false;
    this.cause = options?.cause;
  }

}

export class GeminiClient
{

  private readonly googleGenAI: GoogleGenAI;

  constructor(apiKey: string)
  {
    this.googleGenAI = new GoogleGenAI(
      {
        apiKey: apiKey
      }
    );
  }

  public async getAvailableModelDetails(): Promise<GeminiModelDetail[]>
  {
    try
    {
      const modelsPager = await this.googleGenAI.models.list();
      const retrievedModels: GeminiModelDetail[] = [];

      for await (const modelInfo of modelsPager)
      {
        if (typeof modelInfo.name === "string" && this.isVisionCapableModel(modelInfo.name) === true)
        {
          const cleanId: string = this.sanitizeModelId(modelInfo.name);
          retrievedModels.push(
            {
              id: cleanId,
              name: modelInfo.displayName ?? cleanId,
              comment: modelInfo.description ?? `Google Gemini model (${cleanId})`
            }
          );
        }
      }

      return retrievedModels;
    }
    catch
    {
      return [];
    }
  }

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const timestampInMilliseconds: number = Date.now();
    let response: GenerateContentResponse;

    try
    {
      response = await this.googleGenAI.models.generateContent(
        {
          model: options.model,
          contents: [
            {
              inlineData:
                {
                  mimeType: "image/jpeg",
                  data: options.imageBase64
                }
            },
            {
              text: options.prompt
            }
          ],
          config:
            {
              maxOutputTokens: options.maxTokens
            }
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createGeminiError(error, "The request to the Gemini API failed");
    }

    const durationInMilliseconds: number = Date.now() - timestampInMilliseconds;
    const captionText: string = this.extractTextFromResponse(response);

    return {
      content: captionText,
      durationInMilliseconds,
      model: options.model,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount
    };
  }

  public async extractTags(options: TagExtractionOptions): Promise<TagExtractionResult>
  {
    const timestampInMilliseconds: number = Date.now();
    const promptText: string = options.promptTemplate.replace(Helper.TAGS_PLACEHOLDER, options.tags.join(", "));
    const candidateTagsSet: Set<string> = new Set<string>(options.tags);
    const inlineData = {
      mimeType: "image/jpeg",
      data: options.imageBase64
    };

    // We attempt structured JSON schema extraction first
    try
    {
      const response = await this.googleGenAI.models.generateContent(
        {
          model: options.model,
          contents: [ { inlineData },
            {
              text: promptText
            }
          ],
          config:
            {
              maxOutputTokens: options.maxTokens ?? 2048,
              responseMimeType: "application/json",
              responseSchema:
                {
                  type: Type.OBJECT,
                  properties:
                    {
                      tags:
                        {
                          type: Type.ARRAY,
                          items:
                            {
                              type: Type.STRING,
                              enum: options.tags
                            },
                          description: "The list of selected tags that apply to the image."
                        }
                    },
                  required: [ "tags" ]
                }
            }
        }
      );

      const text: string = this.extractTextFromResponse(response);
      if (text.length > 0)
      {
        const parsedJson = JSON.parse(text) as { readonly tags?: unknown };
        if (Array.isArray(parsedJson?.tags) === true)
        {
          const matchedTags: string[] = parsedJson.tags.filter((tag): tag is string => typeof tag === "string" && candidateTagsSet.has(tag) === true);
          return {
            tags: matchedTags,
            durationInMilliseconds: Date.now() - timestampInMilliseconds,
            model: options.model
          };
        }
      }
    }
    catch
    {
      // We fall back to prompt-based extraction below
    }

    const fallbackPrompt: string = `${promptText}\n\nReturn ONLY a JSON object in the exact format: {"tags": ["tag1", "tag2"]} containing only matching tags from the candidate list.`;
    let fallbackResponse: GenerateContentResponse;

    try
    {
      fallbackResponse = await this.googleGenAI.models.generateContent(
        {
          model: options.model,
          contents: [ { inlineData },
            {
              text: fallbackPrompt
            }
          ],
          config:
            {
              maxOutputTokens: options.maxTokens
            }
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createGeminiError(error, "The request to the Gemini API failed");
    }

    const tags: string[] = this.parseMatchedTags(this.extractTextFromResponse(fallbackResponse), options.tags);

    return {
      tags,
      durationInMilliseconds: Date.now() - timestampInMilliseconds,
      model: options.model
    };
  }

  public async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult>
  {
    const timestampInMilliseconds: number = Date.now();
    const contents: PartUnion[] = [ { text: options.prompt } ];

    if (options.referenceImages.length > 0)
    {
      for (const referenceImage of options.referenceImages)
      {
        contents.push(
          {
            inlineData:
              {
                mimeType: referenceImage.mimeType ?? "image/png",
                data: referenceImage.data
              }
          }
        );
      }
    }

    let response: GenerateContentResponse;
    try
    {
      response = await this.googleGenAI.models.generateContent(
        {
          model: options.model,
          contents: contents as ContentListUnion,
          config:
            {
              candidateCount: 1,
              imageConfig:
                {
                  aspectRatio: options.aspectRatio
                }
            }
        }
      );
    }
    catch (error: unknown)
    {
      throw this.createGeminiError(error);
    }

    const durationInMilliseconds: number = Date.now() - timestampInMilliseconds;
    const candidate = response.candidates?.[0];

    if (candidate === undefined || candidate.content === undefined || candidate.content.parts === undefined)
    {
      throw new GeminiError("Gemini returned a response without valid content parts");
    }

    const images: GeneratedImage[] = [];
    const textParts: string[] = [];
    const totalPartsCount: number = candidate.content.parts.length;
    for (const part of candidate.content.parts)
    {
      if (typeof part.text === "string" && part.text.length > 0)
      {
        textParts.push(part.text);
      }
      else if (part.inlineData !== undefined && typeof part.inlineData.data === "string")
      {
        images.push(
          {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType ?? "image/png",
            displayName: part.inlineData.displayName
          }
        );
      }
    }

    return { images, textParts, durationInMilliseconds, totalPartsCount };
  }

  private extractTextFromResponse(response: GenerateContentResponse): string
  {
    if (typeof response.text === "string" && response.text.length > 0)
    {
      return response.text.trim();
    }

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts !== undefined)
    {
      const textBlocks: string[] = [];
      for (const part of candidate.content.parts)
      {
        if (typeof part.text === "string" && part.text.length > 0)
        {
          textBlocks.push(part.text);
        }
      }
      return textBlocks.join("\n").trim();
    }

    return "";
  }

  private parseMatchedTags(text: string, candidateTags: string[]): string[]
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

  private isVisionCapableModel(modelId: string): boolean
  {
    const lowerCaseModelId: string = modelId.toLowerCase();
    const cleanId: string = this.sanitizeModelId(lowerCaseModelId);

    // We exclude non-generative, embedding, and image-generation only models
    const excludedPatterns: readonly string[] = [
      "embedding",
      "aqa",
      "imagen",
      "image-preview",
      "flash-image"
    ];

    const hasExcludedPattern: boolean = excludedPatterns.some(
      (pattern) =>
      {
        return cleanId.includes(pattern) === true;
      }
    );

    if (hasExcludedPattern === true)
    {
      return false;
    }

    const matchingPrefixes: readonly string[] = [
      "gemini-1.5",
      "gemini-2.0",
      "gemini-2.5",
      "gemini-pro",
      "gemini-flash"
    ];

    return matchingPrefixes.some(
      (prefix) =>
      {
        return cleanId.startsWith(prefix) === true;
      }
    );
  }

  private sanitizeModelId(modelId: string): string
  {
    const prefix: string = "models/";
    if (modelId.startsWith(prefix) === true)
    {
      return modelId.slice(prefix.length);
    }
    return modelId;
  }

  private createGeminiError(error: unknown, prefix?: string): GeminiError
  {
    if (error instanceof GeminiError)
    {
      return error;
    }

    let status: number | undefined;
    let isApiKeyInvalid: boolean = false;
    let isQuotaExceeded: boolean = false;
    let message: string;

    if (error instanceof ApiError || (typeof error === "object" && error !== null && "status" in error))
    {
      const apiError = error as ApiError;
      status = apiError.status;
      isQuotaExceeded = apiError.status === 429;
      let subtitle = apiError.message;

      if (apiError.status === 400)
      {
        try
        {
          const jsonError = JSON.parse(apiError.message).error;
          subtitle = jsonError.message ?? subtitle;
          const details = jsonError?.details;
          if (Array.isArray(details) === true)
          {
            isApiKeyInvalid = details.some(
              (detail: { reason?: string }) =>
              {
                return detail.reason === "API_KEY_INVALID";
              }
            );

            if (isApiKeyInvalid === true)
            {
              subtitle = "The Gemini API key is invalid: cannot generate an image!";
            }
          }
        }
        catch (innerError: unknown)
        {
          // We keep the default message
        }
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

    return new GeminiError(
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
