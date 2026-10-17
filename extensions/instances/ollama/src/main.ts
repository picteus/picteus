import {
  Communicator,
  type ComputeImageCaption,
  type ComputeImageEligibleTags,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  PicteusExtension,
  type SettingsValue,
  type Versions
} from "@picteus/extension-sdk";

import { OllamaClient } from "./ollamaClient";


class OllamaExtension extends PicteusExtension
{

  private ollamaUrl?: string;

  private ollamaClient?: OllamaClient;

  private readonly pulledModels = new Set<string>();

  protected async onUpgrade(_communicator: Communicator, versions: Versions): Promise<void>
  {
    if (versions.current === "0.5.0")
    {
      await this.getExtensionApi().extensionResetSettings({ id: this.extensionId });
    }
  }

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
    if (await this.verifyOllamaServer(communicator, false) === false)
    {
      return;
    }

    const imageBytes = await this.downloadImage(imageId);
    const collectedTags: string[] = [];
    let hasComputedSuccessfully = false;

    for (const eligibleTag of eligibleTags)
    {
      const model: string = eligibleTag.aiModel.technicalId;
      const isModelLoaded = await this.ensureOllamaModels(communicator, [ model ], false);
      if (isModelLoaded === true)
      {
        communicator.sendLog(`Evaluating image against ${eligibleTag.tags.length} candidate tag(s) using model '${model}'…`, "info");
        const result = await this.ollamaClient.extractTags(
          {
            model: model,
            promptTemplate: eligibleTag.question,
            tags: eligibleTag.tags,
            image: imageBytes
          }
        );

        hasComputedSuccessfully = true;
        communicator.sendLog(`Auto-tagging completed in ${result.durationInMilliseconds} ms. Selected ${result.tags.length} tag(s): [${result.tags.join(", ")}]`, "info");
        collectedTags.push(...result.tags);
      }
    }

    if (hasComputedSuccessfully === true)
    {
      const uniqueTags = Array.from(new Set<string>(collectedTags));
      await this.getImageApi().imageSetTags(
        {
          id: imageId,
          extensionId: this.extensionId,
          requestBody: uniqueTags
        }
      );
    }
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    if (await this.verifyOllamaServer(communicator, false) === false)
    {
      return;
    }

    const imageBytes = await this.downloadImage(imageId);
    const modelAndCaptions: Array<{ model: string; caption: string }> = [];

    for (const caption of captions)
    {
      const model = caption.aiModel.technicalId;
      const question = caption.question;
      const isModelLoaded = await this.ensureOllamaModels(communicator, [ model ], false);
      if (isModelLoaded === true)
      {
        communicator.sendLog(`Generating caption for image using model '${model}'…`, "info");
        const result = await this.ollamaClient.generateChatCompletion(
          {
            model: model,
            prompt: question,
            image: imageBytes
          }
        );
        communicator.sendLog(`The generated caption took ${result.durationInMilliseconds} ms and returned the response '${result.content}'`, "debug");
        modelAndCaptions.push({ model: model, caption: result.content });
      }
      else
      {
        communicator.sendLog(`Skipping caption generation: model '${model}' is not available on the Ollama server`, "warn");
      }
    }

    if (modelAndCaptions.length > 0)
    {
      await this.getImageApi().imageSetFeatures(
        {
          id: imageId,
          extensionId: this.extensionId,
          imageFeature: modelAndCaptions.map(
            (modelAndCaption) =>
            {
              return {
                type: ImageFeatureType.Caption,
                format: ImageFeatureFormat.String,
                name: modelAndCaption.model,
                value: modelAndCaption.caption
              };
            }
          )
        }
      );
      communicator.sendLog(`Updated ${modelAndCaptions.length} caption feature(s) for image '${imageId}'`, "info");
    }
  }

  private async setup(communicator: Communicator | undefined, value: SettingsValue): Promise<void>
  {
    this.ollamaUrl = value["ollamaUrl"];

    if (this.ollamaUrl !== undefined)
    {
      this.ollamaClient = new OllamaClient(this.ollamaUrl);
      const isServerReady = await this.verifyOllamaServer(communicator, true);
      if (isServerReady === true)
      {
        await this.sendAvailableAiModels();
      }
    }
  }

  private async sendAvailableAiModels(): Promise<void>
  {
    if (this.ollamaClient === undefined)
    {
      return;
    }
    const details = await this.ollamaClient.getAvailableModelDetails();
    await this.getExtensionApi().extensionSetAiModels(
      {
        id: this.extensionId,
        aiModel: details.map((detail) => ({
          technicalId: detail.id,
          name: detail.name,
          comment: detail.comment
        }))
      }
    );
  }

  private async verifyOllamaServer(communicator: Communicator | undefined, isStartup: boolean): Promise<boolean>
  {
    if (this.ollamaClient === undefined)
    {
      return false;
    }

    if (isStartup === true)
    {
      communicator?.sendLog(`Verifying Ollama server connectivity at '${this.ollamaUrl}'…`, "debug");
    }

    const health = await this.ollamaClient.checkHealth();
    if (health.isReady === true)
    {
      communicator?.sendLog(`Ollama server v${health.version ?? "unknown"} is running`, "debug");
      return true;
    }

    communicator?.sendLog(`The Ollama server is not running properly. Reason: '${health.details ?? "unreachable"}'`, "warn");
    return false;
  }

  private async ensureOllamaModels(communicator: Communicator, models: string[], force: boolean): Promise<boolean>
  {
    if (this.ollamaClient === undefined)
    {
      return false;
    }

    if (force === true)
    {
      this.pulledModels.clear();
    }

    for (const model of models)
    {
      if (this.pulledModels.has(model) === false)
      {
        communicator.sendLog(`Pulling the Ollama '${model}' model if necessary`, "info");
        try
        {
          await this.ollamaClient.pullModel(model);
          this.pulledModels.add(model);
          communicator.sendLog(`The Ollama server has the '${model}' model`, "debug");
        }
        catch (error: unknown)
        {
          this.pulledModels.delete(model);
          const reason = error instanceof Error ? error.message : String(error);
          communicator.sendLog(`The request to the Ollama server to pull the '${model}' model failed. Reason: '${reason}'`, "error");
        }
      }
    }

    return models.filter((model) => this.pulledModels.has(model) === true).length === models.length;
  }

  private async downloadImage(imageId: string): Promise<Uint8Array>
  {
    const blob: Blob = await this.getImageApi().imageDownload(
      {
        id: imageId,
        format: ImageFormat.Png,
        width: 1_024,
        height: 1_024,
        resizeRender: ImageResizeRender.Outbox,
        stripMetadata: true
      }
    );
    return new Uint8Array(await blob.arrayBuffer());
  }

}

new OllamaExtension().run().catch(
  (error: unknown) =>
  {
    console.error(error);
    throw error;
  }
);
