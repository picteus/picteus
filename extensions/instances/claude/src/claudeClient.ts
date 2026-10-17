import Anthropic from "@anthropic-ai/sdk";

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

export interface ClaudeModelDetail
{

  readonly id: string;
  readonly name: string;
  readonly comment?: string;

}

export class ClaudeClient
{

  private readonly anthropic: Anthropic;

  constructor(apiKey: string)
  {
    this.anthropic = new Anthropic(
      {
        apiKey: apiKey
      }
    );
  }

  public async getAvailableModelDetails(): Promise<ClaudeModelDetail[]>
  {
    const modelsPage = await this.anthropic.models.list();
    const retrievedModels: ClaudeModelDetail[] = [];

    for await (const modelInfo of modelsPage)
    {
      if (this.isVisionCapableModel(modelInfo.id) === true)
      {
        retrievedModels.push(
          {
            id: modelInfo.id,
            name: modelInfo.display_name,
            comment: `Anthropic Claude model (${modelInfo.id})`
          }
        );
      }
    }

    return retrievedModels;
  }

  public async generateChatCompletion(options: ChatRequestOptions): Promise<ChatResponseResult>
  {
    const startTimestamp: number = Date.now();
    let response: Anthropic.Messages.Message;

    try
    {
      response = await this.anthropic.messages.create(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source:
                    {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: options.imageBase64
                    }
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
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      throw new Error(`The request to the Claude API failed: ${errorMessage}`);
    }

    const durationInMilliseconds: number = Date.now() - startTimestamp;
    const captionText: string = this.extractTextFromResponse(response);

    return {
      content: captionText,
      durationInMilliseconds: durationInMilliseconds,
      model: response.model ?? options.model,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
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
      const response: Anthropic.Messages.Message = await this.anthropic.messages.create(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 2048,
          tools: [
            {
              name: "select_tags",
              description: description,
              input_schema:
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
          ],
          tool_choice:
            {
              type: "tool",
              name: "select_tags"
            },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source:
                    {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: options.imageBase64
                    }
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

      for (const contentBlock of response.content)
      {
        if (contentBlock.type === "tool_use" && contentBlock.name === "select_tags")
        {
          const input = contentBlock.input as { readonly tags?: unknown };
          if (Array.isArray(input?.tags) === true)
          {
            const matchedTags: string[] = input.tags.filter(
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
    catch
    {
      // We fall back to prompt-based extraction below
    }

    const fallbackPrompt: string = `${promptText}\n\nReturn ONLY a JSON object in the exact format: {"tags": ["tag1", "tag2"]} containing only matching tags from the candidate list.`;
    let fallbackResponse: Anthropic.Messages.Message;

    try
    {
      fallbackResponse = await this.anthropic.messages.create(
        {
          model: options.model,
          max_tokens: options.maxTokens ?? 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source:
                    {
                      type: "base64",
                      media_type: "image/jpeg",
                      data: options.imageBase64
                    }
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
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      throw new Error(`The tag extraction request to the Claude API failed: ${errorMessage}`);
    }

    const rawText: string = this.extractTextFromResponse(fallbackResponse);
    const matchedTags: string[] = this.parseCandidateTagsFromText(rawText, options.tags);

    return {
      tags: matchedTags,
      durationInMilliseconds: Date.now() - startTimestamp,
      model: fallbackResponse.model ?? options.model
    };
  }

  public async extractTagsWithSchema(options: TagExtractionOptions): Promise<TagExtractionResult>
  {
    return this.extractTags(options);
  }

  private parseCandidateTagsFromText(text: string, candidateTags: string[]): string[]
  {
    const candidateTagsSet: Set<string> = new Set<string>(candidateTags);
    try
    {
      const jsonMatch: RegExpMatchArray | null = text.match(/\{[\s\S]*\}/);
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

  private extractTextFromResponse(response: Anthropic.Messages.Message): string
  {
    const textBlocks: string[] = [];
    for (const block of response.content)
    {
      if (block.type === "text")
      {
        textBlocks.push(block.text);
      }
    }
    return textBlocks.join("\n").trim();
  }

  private isVisionCapableModel(modelId: string): boolean
  {
    const matchingPrefixes: readonly string[] = [ "claude-3", "claude-4", "claude-5", "claude-opus", "claude-sonnet", "claude-haiku", "claude-fable" ];
    const lowerCaseModelId: string = modelId.toLowerCase();
    return matchingPrefixes.some(
      (prefix) =>
      {
        return lowerCaseModelId.startsWith(prefix) === true;
      }
    );
  }

}
