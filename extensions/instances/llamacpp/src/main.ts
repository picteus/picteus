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

import { LlamaClient } from "./llamaClient.js";


class LlamaCppExtension extends PicteusExtension
{

  private temperature?: number;

  private maximumTokens?: number;

  private llamaClient?: LlamaClient;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    if (communicator !== undefined)
    {
      await this.setup(communicator, await this.getSettings());
    }
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
  }

  protected async onComputeImageEligibleTags(communicator: Communicator, imageId: string, eligibleTags: ComputeImageEligibleTags[]): Promise<void>
  {
    if ((await this.verifyLlamaServer(communicator, false)) === false)
    {
      return;
    }

    const imageBase64 = await this.downloadImageAsBase64Jpeg(imageId);
    const collectedTags: string[] = [];
    let hasComputedSuccessfully = false;

    for (const eligibleTag of eligibleTags)
    {
      const model = eligibleTag.aiModel.technicalId;
      const isModelLoaded = await this.llamaClient.ensureModel(model, {
        communicator
      });
      if (isModelLoaded === true)
      {
        communicator.sendLog(`Evaluating image against ${eligibleTag.tags.length} candidate tag(s) using model '${model}'…`, "info");
        const result = await this.llamaClient.extractTagsWithSchema({
          model: model,
          imageBase64: imageBase64,
          tags: eligibleTag.tags,
          promptTemplate: eligibleTag.question
        });
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
    }

    if (hasComputedSuccessfully === true)
    {
      const uniqueTags = Array.from(new Set(collectedTags));
      await this.getImageApi().imageSetTags({
        id: imageId,
        extensionId: this.extensionId,
        requestBody: uniqueTags
      });
    }
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    if ((await this.verifyLlamaServer(communicator, false)) === false)
    {
      return;
    }

    const imageBase64 = await this.downloadImageAsBase64Jpeg(imageId);
    const generatedFeatures: { name: string; value: string }[] = [];

    for (const caption of captions)
    {
      const model = caption.aiModel.technicalId;
      const isModelLoaded = await this.llamaClient.ensureModel(model, {
        communicator
      });
      if (isModelLoaded === true)
      {
        communicator.sendLog(`Generating caption for image using model '${model}'…`, "info");
        const result = await this.llamaClient.generateChatCompletion({
          model,
          prompt: caption.question,
          imageBase64,
          temperature: this.temperature,
          maxTokens: this.maximumTokens
        });
        communicator.sendLog(`The generated caption took ${result.durationInMilliseconds} ms and returned the response '${result.content}'`, "debug");
        generatedFeatures.push({ name: result.model, value: result.content });
      }
      else
      {
        communicator.sendLog(`Skipping caption generation: model '${model}' is not available on the llama.cpp server`, "warn");
      }
    }

    await this.getImageApi().imageEnsureFeatures({
      id: imageId,
      extensionId: this.extensionId,
      imageFeature: generatedFeatures.map((feature) =>
      {
        return {
          type: ImageFeatureType.Caption,
          format: ImageFeatureFormat.String,
          name: feature.name,
          value: feature.value
        };
      })
    });
  }

  private async downloadImageAsBase64Jpeg(imageId: string): Promise<string>
  {
    const edge = 1_024;
    const blob: Blob = await this.getImageApi().imageDownload({
      id: imageId,
      format: ImageFormat.Jpeg,
      width: edge,
      height: edge,
      resizeRender: ImageResizeRender.Outbox,
      stripMetadata: true
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    return buffer.toString("base64");
  }

  private async setup(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    const llamaUrl: string = value["llamaUrl"];
    this.temperature = value["temperature"];
    this.maximumTokens = value["maximumTokens"];

    if (llamaUrl !== undefined)
    {
      this.llamaClient = new LlamaClient(llamaUrl);
      const isServerReady = await this.verifyLlamaServer(communicator, true);
      if (isServerReady === true)
      {
        await this.sendAvailableAiModels(communicator);
      }
    }
  }

  private async sendAvailableAiModels(_communicator: Communicator): Promise<void>
  {
    if (this.llamaClient === undefined)
    {
      return;
    }

    const details = await this.llamaClient.getAllModelDetails(false);
    await this.getExtensionApi().extensionSetAiModels({
      id: this.extensionId,
      aiModel: details.map((detail) => ({
        technicalId: detail.id,
        name: detail.name,
        comment: detail.comment
      }))
    });
  }

  private async verifyLlamaServer(communicator: Communicator, isStartup: boolean): Promise<boolean>
  {
    if (this.llamaClient === undefined)
    {
      return false;
    }

    if (isStartup === true)
    {
      communicator.sendLog(`Verifying llama.cpp server connectivity at '${this.llamaClient.baseUrl}'…`, "debug");
    }

    const health = await this.llamaClient.checkHealth();
    if (health.isReady === true)
    {
      communicator.sendLog("llama.cpp server is ready", "debug");
      return true;
    }

    if (health.isReachable === true && health.isReady === false)
    {
      communicator.sendLog("llama.cpp server is currently loading model weights into memory", "warn");
      return false;
    }

    communicator.sendLog(`Cannot connect to llama.cpp server at '${this.llamaClient.baseUrl}'${health.details !== undefined ? `. Reason: ${health.details}.` : ""}`, "warn");
    return false;
  }

}

new LlamaCppExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
