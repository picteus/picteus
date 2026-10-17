import { ApiError, type ContentListUnion, GenerateContentResponse, GoogleGenAI, type PartUnion } from "@google/genai";


export interface ReferenceImage
{

  readonly data: string;
  readonly mimeType?: string;

}

export interface GenerateImageOptions
{

  readonly model: string;
  readonly prompt: string;
  readonly aspectRatio: string;
  readonly referenceImages: ReferenceImage[];

}

export interface GeneratedImage
{

  readonly data: string;
  readonly mimeType: string;
  readonly displayName?: string;

}

export interface GenerateImageResult
{

  readonly images: GeneratedImage[];
  readonly textParts: string[];
  readonly durationInMilliseconds: number;
  readonly totalPartsCount: number;

}

export interface GeminiModelDetail
{

  readonly id: string;
  readonly name?: string;
  readonly comment?: string;

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
        if (typeof modelInfo.name === "string" && modelInfo.name.length > 0)
        {
          retrievedModels.push(
            {
              id: modelInfo.name,
              name: modelInfo.displayName,
              comment: modelInfo.description
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

  public async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult>
  {
    const startTimestamp: number = Date.now();
    const contents: PartUnion[] = [
      {
        text: options.prompt
      }
    ];

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
      const formattedErrorMessage = this.formatErrorMessage(error);
      throw new Error(formattedErrorMessage);
    }

    const durationInMilliseconds: number = Date.now() - startTimestamp;
    const candidate = response.candidates?.[0];

    if (candidate === undefined || candidate.content === undefined || candidate.content.parts === undefined)
    {
      throw new Error("Gemini returned a response without valid content parts");
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

    return {
      images: images,
      textParts: textParts,
      durationInMilliseconds: durationInMilliseconds,
      totalPartsCount: totalPartsCount
    };
  }

  private formatErrorMessage(error: unknown): string
  {
    if (error instanceof ApiError || (typeof error === "object" && error !== null && "status" in error))
    {
      const apiError = error as ApiError;
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
            const hasInvalidApiKey = details.some(
              (detail: { reason?: string }) =>
              {
                return detail.reason === "API_KEY_INVALID";
              }
            );

            if (hasInvalidApiKey === true)
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

      return subtitle;
    }

    return error instanceof Error ? error.message : String(error);
  }

}
