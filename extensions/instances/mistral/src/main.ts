import { Blob, Buffer } from "node:buffer";

import {
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

import { MistralClient } from "./mistralClient.js";


class MistralExtension extends PicteusExtension
{

  private maximumTokens?: number;

  private mistralClient?: MistralClient;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(communicator, await this.getSettings());
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
  }

  protected async onComputeImageEligibleTags(communicator: Communicator, imageId: string, eligibleTags: ComputeImageEligibleTags[]): Promise<void>
  {
    if (this.mistralClient === undefined)
    {
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
        const result = await this.mistralClient.extractTags(
          {
            model: model,
            imageBase64: imageBase64,
            tags: eligibleTag.tags,
            promptTemplate: eligibleTag.question,
            maxTokens: this.maximumTokens
          }
        );
        hasComputedSuccessfully = true;
        communicator.sendLog(`Auto-tagging completed in ${result.durationInMilliseconds} ms. Selected ${result.tags.length} tag(s): [${result.tags.join(", ")}]`, "info");
        collectedTags.push(...result.tags);
      }
      catch (error: unknown)
      {
        const errorMessage: string = error instanceof Error ? error.message : String(error);
        communicator.sendLog(`Failed to compute tags for image '${imageId}' with model '${model}'. Reason: ${errorMessage}`, "error");
      }
    }

    if (hasComputedSuccessfully === true)
    {
      await this.getImageApi().imageSetTags(
        {
          id: imageId,
          extensionId: this.extensionId,
          requestBody: Array.from(new Set(collectedTags))
        }
      );
    }
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    if (this.mistralClient === undefined)
    {
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
        const result = await this.mistralClient.generateChatCompletion(
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
        communicator.sendLog(`Failed to compute caption for the image with model '${model}'. Reason: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }

    await this.getImageApi().imageSetFeatures(
      {
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: generatedFeatures.map((feature) =>
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
  }

  private async setup(communicator: Communicator | undefined, value: SettingsValue): Promise<void>
  {
    const mistralApiKey: string = value["apiKey"];
    this.maximumTokens = value["maximumTokens"];
    this.mistralClient = mistralApiKey === undefined ? undefined : new MistralClient(mistralApiKey);
    try
    {
      await this.sendAvailableAiModels();
    }
    catch (error: unknown)
    {
      communicator?.sendLog(`Could not fetch the models dynamically from the Mistral API. Reason: '${error instanceof Error ? error.message : String(error)}'`, "warn");
    }
  }

  private async sendAvailableAiModels(): Promise<void>
  {
    if (this.mistralClient !== undefined)
    {
      const modelDetails = await this.mistralClient.getAvailableModelDetails();
      await this.getExtensionApi().extensionSetAiModels(
        {
          id: this.extensionId,
          aiModel: modelDetails.map((detail) =>
            ({
              technicalId: detail.id,
              name: detail.name,
              comment: detail.comment
            }))
        }
      );
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

new MistralExtension().run().catch(
  (error: unknown) =>
  {
    console.error(error);
    throw error;
  }
);
