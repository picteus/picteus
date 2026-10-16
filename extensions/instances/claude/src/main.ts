import { Blob, Buffer } from "node:buffer";

import Anthropic from "@anthropic-ai/sdk";

import {
  type AiModel,
  Communicator,
  type ComputeImageCaption,
  type ComputeImageEligibleTags,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  PicteusExtension,
  type SettingsValue
} from "@picteus/extension-sdk";


class ClaudeExtension extends PicteusExtension
{

  private anthropicApiKey?: string;

  private maximumTokens?: number;

  private anthropicClient?: Anthropic;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(communicator, await this.getSettings());
    communicator?.sendLog(`The ${this.toString()} is ready`, "info");
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
    communicator.sendLog(`The ${this.toString()} settings updated`, "info");
  }

  protected async onComputeImageEligibleTags(communicator: Communicator, imageId: string, eligibleTags: ComputeImageEligibleTags[]): Promise<void>
  {
    if (this.anthropicClient === undefined)
    {
      communicator.sendLog("Anthropic API key is not configured: skipping eligible tags computation", "warn");
      return;
    }

    const imageBase64: string = await this.downloadImageAsBase64Jpeg(imageId);
    const collectedTags: string[] = [];
    let hasComputedSuccessfully: boolean = false;

    for (const entry of eligibleTags)
    {
      if (entry.tags.length === 0)
      {
        continue;
      }

      const model: string = entry.aiModel.technicalId;
      communicator.sendLog(`Evaluating image against ${entry.tags.length} candidate tag(s) using model '${model}'…`, "info");
      const startTimeInMilliseconds: number = Date.now();

      try
      {
        const selectedTags: string[] = await this.extractTagsWithClaude(model, imageBase64, entry.tags, entry.question);
        hasComputedSuccessfully = true;
        const durationInMilliseconds: number = Date.now() - startTimeInMilliseconds;

        if (selectedTags.length > 0)
        {
          communicator.sendLog(`Auto-tagging completed in ${durationInMilliseconds} ms. Selected ${selectedTags.length} tag(s): [${selectedTags.join(", ")}]`, "info");
          collectedTags.push(...selectedTags);
        }
        else
        {
          communicator.sendLog(`Auto-tagging completed in ${durationInMilliseconds} ms. No candidate tags matched the image content.`, "info");
        }
      }
      catch (error: unknown)
      {
        const errorMessage: string = error instanceof Error ? error.message : String(error);
        communicator.sendLog(`Failed to compute tags for image '${imageId}' with model '${model}'. Reason: ${errorMessage}`, "error");
      }
    }

    if (hasComputedSuccessfully === true)
    {
      const uniqueTags: string[] = Array.from(new Set(collectedTags));
      await this.getImageApi().imageSetTags(
        {
          id: imageId,
          extensionId: this.extensionId,
          requestBody: uniqueTags
        }
      );
      communicator.sendLog(`Updated tags for image '${imageId}'`, "info");
    }
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    if (this.anthropicClient === undefined)
    {
      communicator.sendLog("Anthropic API key is not configured: skipping image captions computation", "warn");
      return;
    }

    const imageBase64: string = await this.downloadImageAsBase64Jpeg(imageId);
    const generatedFeatures: Array<{ name: string; value: string }> = [];

    for (const caption of captions)
    {
      const model: string = caption.aiModel.technicalId;
      const question: string = caption.question;
      communicator.sendLog(`Generating caption for image '${imageId}' using model '${model}'…`, "info");
      const startTimeInMilliseconds: number = Date.now();

      try
      {
        const response: Anthropic.Messages.Message = await this.anthropicClient.messages.create(
          {
            model: model,
            max_tokens: this.maximumTokens,
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
                        data: imageBase64
                      }
                  },
                  {
                    type: "text",
                    text: question
                  }
                ]
              }
            ]
          }
        );

        const captionText: string = this.extractTextFromResponse(response);
        const durationInMilliseconds: number = Date.now() - startTimeInMilliseconds;
        communicator.sendLog(`The generated caption took ${durationInMilliseconds} ms and returned the response '${captionText}'`, "debug");

        if (captionText.length > 0)
        {
          generatedFeatures.push(
            {
              name: model,
              value: captionText
            }
          );
        }
      }
      catch (error: unknown)
      {
        const errorMessage: string = error instanceof Error ? error.message : String(error);
        communicator.sendLog(`Failed to compute caption for image '${imageId}' with model '${model}'. Reason: ${errorMessage}`, "error");
      }
    }

    if (generatedFeatures.length > 0)
    {
      await this.getImageApi().imageSetFeatures(
        {
          id: imageId,
          extensionId: this.extensionId,
          imageFeature: generatedFeatures.map(
            (feature) =>
            {
              return {
                type: ImageFeatureType.Caption,
                format: ImageFeatureFormat.Markdown,
                name: feature.name,
                value: feature.value
              };
            }
          )
        }
      );
      communicator.sendLog(`Updated ${generatedFeatures.length} caption feature(s) for image '${imageId}'`, "info");
    }
  }

  private async setup(communicator: Communicator | undefined, value: SettingsValue): Promise<void>
  {
    this.anthropicApiKey = value["apiKey"];
    this.maximumTokens = value["maximumTokens"];

    if (this.anthropicApiKey !== undefined && this.anthropicApiKey.length > 0)
    {
      this.anthropicClient = new Anthropic({ apiKey: this.anthropicApiKey });
    }
    else
    {
      this.anthropicClient = undefined;
    }

    try
    {
      await this.sendAvailableAiModels(communicator);
    }
    catch (error)
    {
      communicator?.sendLog(`Could not fetch the models dynamically from the Anthropic API. Reason: '${error instanceof Error ? error.message : String(error)}'`, "warn");
    }
  }

  private async sendAvailableAiModels(communicator?: Communicator): Promise<void>
  {
    if (this.anthropicClient !== undefined)
    {
      const modelsPage = await this.anthropicClient.models.list();
      const retrievedModels: AiModel[] = [];

      for await (const modelInfo of modelsPage)
      {
        if (this.isVisionCapableModel(modelInfo.id) === true)
        {
          retrievedModels.push(
            {
              technicalId: modelInfo.id,
              name: modelInfo.display_name,
              comment: `Anthropic Claude model (${modelInfo.id})`
            }
          );
        }
      }

      await this.getExtensionApi().extensionSetAiModels({ id: this.extensionId, aiModel: retrievedModels });
      communicator?.sendLog(`Registered ${retrievedModels.length} Claude AI model(s) from the Anthropic API`, "info");
    }
  }

  private async extractTagsWithClaude(model: string, imageBase64: string, candidateTags: string[], questionTemplate: string): Promise<string[]>
  {
    const promptText: string = questionTemplate.replace(Helper.TAGS_PLACEHOLDER, candidateTags.join(", "));
    const candidateTagsSet: Set<string> = new Set<string>(candidateTags);

    if (this.anthropicClient === undefined)
    {
      return [];
    }

    // We attempt tool-based structured tag extraction first
    try
    {
      const description = "Select the tags from the candidate list that accurately apply to the image.";
      const response: Anthropic.Messages.Message = await this.anthropicClient.messages.create(
        {
          model: model,
          max_tokens: this.maximumTokens,
          tools: [
            {
              name: "select_tags",
              description,
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
                              enum: candidateTags
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
                      data: imageBase64
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
            return input.tags.filter(
              (tag): tag is string =>
              {
                return typeof tag === "string" && candidateTagsSet.has(tag) === true;
              }
            );
          }
        }
      }
    }
    catch
    {
      // We fall back to prompt-based extraction below
    }

    const fallbackPrompt: string = `${promptText}\n\nReturn ONLY a JSON object in the exact format: {"tags": ["tag1", "tag2"]} containing only matching tags from the candidate list.`;
    const fallbackResponse: Anthropic.Messages.Message = await this.anthropicClient.messages.create(
      {
        model: model,
        max_tokens: this.maximumTokens,
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
                    data: imageBase64
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

    const rawText: string = this.extractTextFromResponse(fallbackResponse);
    return this.parseCandidateTagsFromText(rawText, candidateTags);
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
    this.logger.warn(modelId);
    const marchingPrefixes = [ "claude-3", "claude-4", "claude-5", "claude-opus", "claude-sonnet", "claude-haiku", "claude-fable" ];
    const lowerCaseModelId: string = modelId.toLowerCase();
    return marchingPrefixes.some(prefix => lowerCaseModelId.startsWith(prefix));
  }

  private async downloadImageAsBase64Jpeg(imageId: string): Promise<string>
  {
    const edge: number = 1_024;
    const blob: Blob = await this.getImageApi().imageDownload(
      {
        id: imageId,
        format: ImageFormat.Jpeg,
        width: edge,
        height: edge,
        resizeRender: ImageResizeRender.Outbox,
        stripMetadata: true
      }
    );
    const arrayBuffer: ArrayBuffer = await blob.arrayBuffer();
    const buffer: Buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  }

}

new ClaudeExtension().run().catch(
  (error: unknown) =>
  {
    console.error(error);
    throw error;
  }
);
