import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions";

import { Helper } from "@picteus/extension-sdk";


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

export interface ChatRequestOptions
{

  readonly model: string;
  readonly prompt: string;
  readonly imageBase64: string;
  readonly temperature?: number;
  readonly maxTokens?: number;

}

export interface ChatResponseResult
{

  readonly content: string;
  readonly durationInMilliseconds: number;
  readonly model: string;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;

}

export interface TagExtractionResult
{

  readonly tags: string[];
  readonly durationInMilliseconds: number;
  readonly model: string;

}

export interface LlamaModelDetail
{

  readonly id: string;
  readonly comment?: string;

}

export class LlamaClient
{

  public readonly baseUrl: string;

  private readonly openai: OpenAI;

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

  public async loadModel(model: string): Promise<boolean>
  {
    const resolvedModel = await this.resolveModel(model);
    const response = await fetch(`${this.baseUrl}/models/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: resolvedModel }),
      signal: AbortSignal.timeout(120_000)
    });

    if (response.ok === true)
    {
      return true;
    }

    const responseText = await response.text();

    // If the model is already running or loaded on the server, loading succeeded
    if (response.status === 400 && (responseText.toLowerCase().includes("already running") === true || responseText.toLowerCase().includes("already loaded") === true))
    {
      return true;
    }

    // If the server doesn't support router mode, e.g. single-model server without router, we verify whether the active model actually matches the requested model
    if (response.status === 404 || response.status === 405)
    {
      const activeModel = await this.getActiveModel();
      if (activeModel !== undefined)
      {
        const activeNormalized = activeModel.toLowerCase().replace(/[-_.]/g, "");
        const requestedNormalized = model.toLowerCase().replace(/[-_.]/g, "");
        if (activeNormalized.includes(requestedNormalized) === true || requestedNormalized.includes(activeNormalized) === true)
        {
          return true;
        }
      }
    }

    if (response.status === 404)
    {
      throw new Error(`The model '${model}' was not found on the llama.cpp server (HTTP 404)`);
    }
    throw new Error(`Could not load the model '${model}': llama.cpp server responded with HTTP status ${response.status} and text '${responseText}'`);
  }

  public async getAvailableModelDetails(): Promise<LlamaModelDetail[]>
  {
    try
    {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5_000)
      });
      if (response.ok === true)
      {
        const json = (await response.json()) as {
          data?: Array<{
            id?: string;
            architecture?: { input_modalities?: string[] };
            tags?: string[];
          }>;
        };
        if (Array.isArray(json.data) === true)
        {
          return json.data
            .filter((item): item is {
              id: string;
              architecture?: { input_modalities?: string[] };
              tags?: string[]
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
              return {
                id: item.id,
                comment
              };
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
      return modelsPage.data.map((item) => ({ id: item.id }));
    }
    catch
    {
      return [];
    }
  }

  public async getActiveModel(): Promise<string | undefined>
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

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const activeModel = await this.resolveModel(options.model);
    const userContentParts: ChatCompletionContentPart[] = [
      {
        type: "text",
        text: options.prompt
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${options.imageBase64}`
        }
      }
    ];

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: userContentParts
      }
    ];

    const startTimestamp = Date.now();
    let completion: ChatCompletion;
    try
    {
      completion = await this.openai.chat.completions.create({
        model: activeModel,
        messages: messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048
      });
    }
    catch (error: unknown)
    {
      throw new Error(`The request to the llama.cpp server failed. Reason: '${error instanceof Error ? error.message : String(error)}'`);
    }

    const durationInMilliseconds = Date.now() - startTimestamp;
    const choice = completion.choices[0];
    const message = choice?.message as ExtendedMessage | undefined;

    let content = "";
    if (typeof message?.content === "string")
    {
      content = message.content.trim();
    }
    else if (Array.isArray(message?.content) === true)
    {
      content = (message?.content ?? [])
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim();
    }

    const choiceWithText = choice as unknown as { readonly text?: string } | undefined;
    if (content.length === 0 && typeof choiceWithText?.text === "string")
    {
      content = choiceWithText.text.trim();
    }

    // Strip thinking tags if present in content
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
        content = this.extractAnswerFromReasoning(reasoning);
      }
    }

    return {
      content,
      durationInMilliseconds,
      model: completion.model ?? activeModel,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens
    };
  }

  public async extractTagsWithSchema(options: {
    readonly model: string;
    readonly imageBase64: string;
    readonly tags: string[];
    readonly promptTemplate: string;
    readonly temperature?: number;
  }): Promise<TagExtractionResult>
  {
    const activeModel = await this.resolveModel(options.model);
    const promptText = options.promptTemplate.replace(Helper.TAGS_PLACEHOLDER, options.tags.join(", "));

    const userContentParts: ChatCompletionContentPart[] = [
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
    ];

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: userContentParts
      }
    ];

    const jsonSchema = {
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
              enum: options.tags
            }
          }
        },
        required: [ "tags" ],
        additionalProperties: false
      }
    };

    const startTimestamp = Date.now();
    let completion: ChatCompletion;
    try
    {
      completion = await this.openai.chat.completions.create({
        model: activeModel,
        messages: messages,
        temperature: options.temperature ?? 0.1,
        response_format: {
          type: "json_schema",
          json_schema: jsonSchema
        }
      });
    }
    catch (error: unknown)
    {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`The tag extraction request to the llama.cpp server failed: ${errorMessage}`);
    }

    const durationInMilliseconds = Date.now() - startTimestamp;
    const choice = completion.choices[0];
    const message = choice?.message as ExtendedMessage | undefined;

    let rawContent = "";
    if (typeof message?.content === "string")
    {
      rawContent = message.content.trim();
    }
    const choiceWithText = choice as unknown as { readonly text?: string } | undefined;
    if (rawContent.length === 0 && typeof choiceWithText?.text === "string")
    {
      rawContent = choiceWithText.text.trim();
    }

    if (rawContent.length === 0)
    {
      const reasoning = message?.reasoning_content ?? message?.reasoning;
      if (typeof reasoning === "string")
      {
        rawContent = reasoning.trim();
      }
    }

    let matchedTags: string[] = [];
    try
    {
      const parsedObject = JSON.parse(rawContent) as { readonly tags?: unknown };
      if (Array.isArray(parsedObject.tags) === true)
      {
        const allowedTagsSet = new Set<string>(options.tags);
        matchedTags = parsedObject.tags
          .filter((item): item is string => typeof item === "string" && allowedTagsSet.has(item) === true);
      }
    }
    catch
    {
      // In case structured parsing fails, we fallback to safe token matching
      const allowedTagsSet = new Set<string>(options.tags);
      for (const candidateTag of options.tags)
      {
        const escapedTag = candidateTag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const pattern = new RegExp(`\\b${escapedTag}\\b`, "i");
        if (pattern.test(rawContent) === true && allowedTagsSet.has(candidateTag) === true)
        {
          matchedTags.push(candidateTag);
        }
      }
    }

    return {
      tags: matchedTags,
      durationInMilliseconds: durationInMilliseconds,
      model: completion.model ?? activeModel
    };
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

    const paragraphs = trimmedReasoning
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) =>
      {
        return paragraph.length > 0 &&
          paragraph.toLowerCase().startsWith("thinking process") === false;
      });

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

  private async resolveModel(requestedModelName: string): Promise<string>
  {
    try
    {
      const modelsPage = await this.openai.models.list();
      if (modelsPage.data.length === 0)
      {
        return requestedModelName;
      }

      const exactMatchModel = modelsPage.data.find((item) => item.id === requestedModelName);
      if (exactMatchModel !== undefined)
      {
        return exactMatchModel.id;
      }

      const requestedNormalizedName = requestedModelName.toLowerCase().replace(/[-_.]/g, "");
      const partialMatchModel = modelsPage.data.find((item) =>
      {
        const identifierNormalized = item.id.toLowerCase().replace(/[-_.]/g, "");
        return identifierNormalized.includes(requestedNormalizedName) === true || requestedNormalizedName.includes(identifierNormalized) === true;
      });
      if (partialMatchModel !== undefined)
      {
        return partialMatchModel.id;
      }
    }
    catch
    {
      // We fall back to the requested model name if listing fails
    }
    return requestedModelName;
  }

  private async getAvailableModels(): Promise<string[]>
  {
    const details = await this.getAvailableModelDetails();
    return details.map((detail) => detail.id);
  }

}
