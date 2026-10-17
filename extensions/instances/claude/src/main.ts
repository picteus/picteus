import { Blob, Buffer } from "node:buffer";

import {
  type AiModel,
  Communicator,
  type ComputeImageCaption,
  type ComputeImageEligibleTags,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  PicteusExtension,
  type SettingsValue
} from "@picteus/extension-sdk";

import { ClaudeClient } from "./claudeClient.js";


class ClaudeExtension extends PicteusExtension
{

  private anthropicApiKey?: string;

  private maximumTokens?: number;

  private claudeClient?: ClaudeClient;

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
    if (this.claudeClient === undefined)
    {
      communicator.sendLog("Anthropic API key is not configured: skipping eligible tags computation", "warn");
      return;
    }

    const imageBase64: string = await this.downloadImageAsBase64Jpeg(imageId);
    const collectedTags: string[] = [];
    let hasComputedSuccessfully: boolean = false;

    for (const eligibleTag of eligibleTags)
    {
      const model: string = eligibleTag.aiModel.technicalId;
      communicator.sendLog(`Evaluating image against ${eligibleTag.tags.length} candidate tag(s) using model '${model}'…`, "info");

      try
      {
        const result = await this.claudeClient.extractTags(
          {
            model: model,
            imageBase64: imageBase64,
            tags: eligibleTag.tags,
            promptTemplate: eligibleTag.question,
            maxTokens: this.maximumTokens
          }
        );
        hasComputedSuccessfully = true;

        if (result.tags.length > 0)
        {
          communicator.sendLog(`Auto-tagging completed in ${result.durationInMilliseconds} ms. Selected ${result.tags.length} tag(s): [${result.tags.join(", ")}]`, "info");
          collectedTags.push(...result.tags);
        }
        else
        {
          communicator.sendLog(`Auto-tagging completed in ${result.durationInMilliseconds} ms. No candidate tags matched the image content.`, "info");
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
    if (this.claudeClient === undefined)
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

      try
      {
        const result = await this.claudeClient.generateChatCompletion(
          {
            model: model,
            prompt: question,
            imageBase64: imageBase64,
            maxTokens: this.maximumTokens
          }
        );

        communicator.sendLog(`The generated caption took ${result.durationInMilliseconds} ms and returned the response '${result.content}'`, "debug");

        if (result.content.length > 0)
        {
          generatedFeatures.push(
            {
              name: model,
              value: result.content
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
      this.claudeClient = new ClaudeClient(this.anthropicApiKey);
    }
    else
    {
      this.claudeClient = undefined;
    }

    try
    {
      await this.sendAvailableAiModels(communicator);
    }
    catch (error: unknown)
    {
      communicator?.sendLog(`Could not fetch the models dynamically from the Anthropic API. Reason: '${error instanceof Error ? error.message : String(error)}'`, "warn");
    }
  }

  private async sendAvailableAiModels(communicator?: Communicator): Promise<void>
  {
    if (this.claudeClient !== undefined)
    {
      const modelDetails = await this.claudeClient.getAvailableModelDetails();
      const retrievedModels: AiModel[] = modelDetails.map(
        (detail) =>
        {
          return {
            technicalId: detail.id,
            name: detail.name,
            comment: detail.comment
          };
        }
      );

      await this.getExtensionApi().extensionSetAiModels(
        {
          id: this.extensionId,
          aiModel: retrievedModels
        }
      );
      communicator?.sendLog(`Registered ${retrievedModels.length} Claude AI model(s) from the Anthropic API`, "info");
    }
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
