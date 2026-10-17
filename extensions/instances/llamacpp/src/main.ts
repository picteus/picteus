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

import { LlamaClient } from "./llamaClient";


class LlamaCppExtension extends PicteusExtension
{

  private llamaUrl?: string;

  private temperature?: number;

  private maximumTokens?: number;

  private llamaClient?: LlamaClient;

  private readonly loadedModels: Set<string> = new Set<string>();

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
      const isModelLoaded = await this.ensureLlamaModels(communicator, [ model ], false);
      if (isModelLoaded === true)
      {
        communicator.sendLog(`Evaluating image against ${eligibleTag.tags.length} candidate tag(s) using model '${model}'…`, "info");
        try
        {
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
        catch (error: unknown)
        {
          const errorMessage = error instanceof Error ? error.message : String(error);
          communicator.sendLog(`Failed to compute tags for image '${imageId}' with model '${model}'. Reason: ${errorMessage}`, "error");
        }
      }
      else
      {
        communicator.sendLog(
          `Skipping auto-tagging: model '${model}' is not available on the llama.cpp server. In llama.cpp, go to Models, search for '${model}', and click Download.`,
          "warn"
        );
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
      communicator.sendLog(`Updated tags for image '${imageId}'`, "info");
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
      const isModelLoaded = await this.ensureLlamaModels(communicator, [ model ], false);
      if (isModelLoaded === true)
      {
        communicator.sendLog(`Generating caption for image using model '${model}'…`, "info");
        try
        {
          const result = await this.llamaClient.generateChatCompletion({
            model: model,
            prompt: caption.question,
            imageBase64,
            temperature: this.temperature,
            maxTokens: this.maximumTokens
          });

          communicator.sendLog(`The generated caption took ${result.durationInMilliseconds} ms and returned the response '${result.content}'`, "debug");
          generatedFeatures.push({ name: this.computeFriendlyModelName(model), value: result.content });
        }
        catch (error: unknown)
        {
          const errorMessage = error instanceof Error ? error.message : String(error);
          communicator.sendLog(`Failed to compute caption for image '${imageId}' with model '${model}'. Reason: ${errorMessage}`, "error");
        }
      }
      else
      {
        communicator.sendLog(
          `Skipping caption generation: model '${model}' is not available on the llama.cpp server. In llama.cpp, go to Models, search for '${model}', and click Download.`,
          "warn"
        );
      }
    }

    if (generatedFeatures.length > 0)
    {
      await this.getImageApi().imageSetFeatures({
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
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString("base64");
  }

  private computeFriendlyModelName(modelName: string): string
  {
    const sanitized = modelName.trim();
    if (sanitized.length === 0)
    {
      return "llama.cpp";
    }

    const knownFriendlyModels: readonly string[] = [
      "gemma4",
      "qwen2.5vl",
      "qwen3-vl",
      "llama3.2-vision",
      "pixtral",
      "minicpm-v",
      "moondream",
      "smolvlm",
      "llava-llama3",
      "llava-phi3",
      "bakllava",
      "llava",
      "gemma3",
      "granite3.2-vision",
      "mistral-small3.2",
      "nemotron3"
    ];

    if (knownFriendlyModels.includes(sanitized) === true)
    {
      return sanitized;
    }

    const lowerModelName = sanitized.toLowerCase();
    if (lowerModelName.includes("gemma-4") === true || lowerModelName.includes("gemma4") === true)
    {
      return "gemma4";
    }
    if (lowerModelName.includes("gemma-3") === true || lowerModelName.includes("gemma3") === true)
    {
      return "gemma3";
    }
    if (lowerModelName.includes("qwen-3") === true || lowerModelName.includes("qwen3") === true)
    {
      return "qwen3-vl";
    }
    if (lowerModelName.includes("qwen-2.5") === true || lowerModelName.includes("qwen2.5") === true)
    {
      return "qwen2.5vl";
    }
    if (lowerModelName.includes("llama-3.2") === true || lowerModelName.includes("llama3.2") === true)
    {
      return "llama3.2-vision";
    }
    if (lowerModelName.includes("pixtral") === true)
    {
      return "pixtral";
    }
    if (lowerModelName.includes("minicpm") === true)
    {
      return "minicpm-v";
    }
    if (lowerModelName.includes("moondream") === true)
    {
      return "moondream";
    }
    if (lowerModelName.includes("smolvlm") === true)
    {
      return "smolvlm";
    }
    if (lowerModelName.includes("bakllava") === true)
    {
      return "bakllava";
    }
    if (lowerModelName.includes("llava-phi") === true)
    {
      return "llava-phi3";
    }
    if (lowerModelName.includes("llava-llama") === true)
    {
      return "llava-llama3";
    }
    if (lowerModelName.includes("llava") === true)
    {
      return "llava";
    }
    if (lowerModelName.includes("granite") === true)
    {
      return "granite3.2-vision";
    }
    if (lowerModelName.includes("mistral") === true)
    {
      return "mistral-small3.2";
    }
    if (lowerModelName.includes("nemotron") === true)
    {
      return "nemotron3";
    }

    let cleaned = sanitized;
    if (cleaned.includes(":") === true)
    {
      cleaned = cleaned.split(":")[0] ?? cleaned;
    }
    if (cleaned.includes("/") === true)
    {
      const segments = cleaned.split("/");
      cleaned = segments[segments.length - 1] ?? cleaned;
    }
    cleaned = cleaned.replace(/\.(gguf|bin)$/i, "");

    return cleaned;
  }

  private computeModelDisplayName(modelId: string): string
  {
    const sanitized = modelId.trim();
    if (sanitized.length === 0)
    {
      return "llama.cpp";
    }

    const friendlyDisplayNames: Record<string, string> = {
      "gemma4": "Gemma 4",
      "gemma3": "Gemma 3",
      "qwen2.5vl": "Qwen 2.5-VL",
      "qwen3-vl": "Qwen 3-VL",
      "llama3.2-vision": "Llama 3.2 Vision",
      "pixtral": "Pixtral",
      "minicpm-v": "MiniCPM-V",
      "moondream": "Moondream",
      "smolvlm": "SmolVLM",
      "llava": "LLaVA",
      "llava-llama3": "LLaVA Llama 3",
      "llava-phi3": "LLaVA Phi 3",
      "bakllava": "BakLLaVA",
      "granite3.2-vision": "Granite 3.2 Vision",
      "mistral-small3.2": "Mistral Small 3.2",
      "nemotron3": "Nemotron 3"
    };

    if (friendlyDisplayNames[sanitized] !== undefined)
    {
      return friendlyDisplayNames[sanitized];
    }

    let baseName = sanitized.includes("/") === true
      ? sanitized.split("/").slice(1).join("/")
      : sanitized;

    let quantizationSuffix = "";
    if (baseName.includes(":") === true)
    {
      const segments = baseName.split(":");
      baseName = segments[0] ?? baseName;
      const rawQuantization = segments[1] ?? "";
      if (rawQuantization.length > 0)
      {
        quantizationSuffix = rawQuantization.replace(/_0$/, "").toUpperCase();
      }
    }

    baseName = baseName.replace(/\.(gguf|bin)$/i, "").replace(/-gguf$/i, "");
    baseName = baseName.replace(/-it$/i, "").replace(/-instruct(-\d+)?$/i, "");

    const words = baseName.split(/[-_]+/).filter((word) => word.length > 0);
    const capitalizedWords = words.map((word) =>
    {
      if (/^\d+[A-Za-z]+$/.test(word) === true || /^[A-Z0-9]+$/.test(word) === true)
      {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

    if (quantizationSuffix.length > 0)
    {
      capitalizedWords.push(quantizationSuffix);
    }

    const displayName = capitalizedWords.join(" ");
    return displayName.length > 0 ? displayName : sanitized;
  }

  private async setup(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    this.llamaUrl = value["llamaUrl"];
    this.temperature = value["temperature"];
    this.maximumTokens = value["maximumTokens"];

    if (this.llamaUrl !== undefined)
    {
      this.llamaClient = new LlamaClient(this.llamaUrl);
      const isServerReady = await this.verifyLlamaServer(communicator, true);
      if (isServerReady === true)
      {
        await this.sendAvailableAiModels(communicator);
        const modelsToRetrieve: string[] = [];
        await this.ensureLlamaModels(communicator, modelsToRetrieve, true);
      }
    }
  }

  private async sendAvailableAiModels(_communicator: Communicator): Promise<void>
  {
    if (this.llamaClient === undefined)
    {
      return;
    }

    const details = await this.llamaClient.getAvailableModelDetails();
    await this.getExtensionApi().extensionSetAiModels(
      {
        id: this.extensionId,
        aiModel: details.map(detail => ({
          technicalId: detail.id,
          name: this.computeModelDisplayName(detail.id),
          comment: detail.comment
        }))
      }
    );
  }

  private async verifyLlamaServer(communicator: Communicator, isStartup: boolean): Promise<boolean>
  {
    if (this.llamaClient === undefined)
    {
      return false;
    }

    if (isStartup === true)
    {
      communicator.sendLog(`Verifying llama.cpp server connectivity at '${this.llamaUrl}'…`, "debug");
    }

    const health = await this.llamaClient.checkHealth();
    if (health.isReady === true)
    {
      const activeModel = await this.llamaClient.getActiveModel();
      communicator.sendLog(`llama.cpp server is ready${activeModel === undefined ? "" : (` with active model '${activeModel}'`)}`, "debug");
      return true;
    }

    if (health.isReachable === true && health.isReady === false)
    {
      communicator.sendLog("llama.cpp server is currently loading model weights into memory", "warn");
      return false;
    }

    communicator.sendLog(`Cannot connect to llama.cpp server at '${this.llamaUrl}'${health.details !== undefined ? `. Reason: ${health.details}.` : ""}`, "warn");
    return false;
  }

  private async ensureLlamaModels(communicator: Communicator, models: string[], force: boolean): Promise<boolean>
  {
    if (this.llamaClient === undefined)
    {
      return false;
    }

    if (force === true)
    {
      this.loadedModels.clear();
    }

    for (const model of models)
    {
      if (this.loadedModels.has(model) === false)
      {
        try
        {
          await this.llamaClient.loadModel(model);
          this.loadedModels.add(model);
          communicator.sendLog(`The llama.cpp server has loaded the tensors for the model '${model}'`, "debug");
        }
        catch (error: unknown)
        {
          this.loadedModels.delete(model);
          const reason = error instanceof Error ? error.message : String(error);
          communicator.sendLog(
            `Model '${model}' is not available on the llama.cpp server. In llama.cpp, go to Models, search for '${model}', and click Download. Details: '${reason}'`,
            "warn"
          );
        }
      }
    }

    return models.filter((model) => this.loadedModels.has(model) === true).length === models.length;
  }

}

new LlamaCppExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
