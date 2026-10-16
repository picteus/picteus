import { type ChatResponse, type ModelResponse, Ollama } from "ollama";

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
  type SettingsValue,
  type Versions
} from "@picteus/extension-sdk";


interface OllamaModelItem extends ModelResponse
{

  readonly capabilities?: string[];

}

class OllamaExtension extends PicteusExtension
{

  private ollamaUrl?: string;

  private ollama?: Ollama;

  private readonly pulledModels = new Set<string>();

  protected async onUpgrade(communicator: Communicator, versions: Versions): Promise<void>
  {
    if (versions.current === "0.5.0")
    {
      await this.getExtensionApi().extensionResetSettings({ id: this.extensionId });
    }
  }

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(communicator!, await this.getSettings());
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
  }

  protected async onComputeImageEligibleTags(communicator: Communicator, imageId: string, eligibleTags: ComputeImageEligibleTags[]): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      return;
    }
    const imageBase64 = await this.downloadImage(imageId);
    const collectedTags: string[] = [];
    for (const eligibleTag of eligibleTags)
    {
      const model: string = eligibleTag.aiModel.technicalId;
      const question = eligibleTag.question.replace(Helper.TAGS_PLACEHOLDER, eligibleTag.tags.join(", "));
      if (await this.ensureOllamaModels(communicator, [ model ], false) === true)
      {
        const response: string = await this.requestOllama(communicator, model, imageBase64, question);
        for (const tag of eligibleTag.tags)
        {
          const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          const regex = new RegExp(`\\b${escapedTag}\\b`, "i");
          if (regex.test(response) === true)
          {
            collectedTags.push(tag);
          }
        }
      }
    }
    await this.getImageApi().imageSetTags({
      id: imageId,
      extensionId: this.parameters.extensionId,
      requestBody: Array.from(new Set<string>(collectedTags))
    });
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      return;
    }
    const imageBase64 = await this.downloadImage(imageId);
    const modelAndCaptions = [];
    for (const caption of captions)
    {
      const question = caption.question;
      const model = caption.aiModel.technicalId;
      if (await this.ensureOllamaModels(communicator, [ model ], false) === true)
      {
        const caption: string = await this.requestOllama(communicator, model, imageBase64, question);
        modelAndCaptions.push({ model, caption });
      }
    }
    await this.getImageApi().imageSetFeatures({
      id: imageId,
      extensionId: this.parameters.extensionId,
      imageFeature: modelAndCaptions.map(modelAndCaption => ({
        type: ImageFeatureType.Caption,
        format: ImageFeatureFormat.String,
        name: modelAndCaption.model,
        value: modelAndCaption.caption
      }))
    });
  }

  private async requestOllama(communicator: Communicator, model: string, imageIdOrUint8Array: string | Uint8Array, question: string): Promise<string>
  {
    const unint8Array = typeof imageIdOrUint8Array === "string" ? await this.downloadImage(imageIdOrUint8Array) : imageIdOrUint8Array;
    communicator.sendLog(`Asking to the Ollama server at '${this.ollamaUrl}', with the model '${model}', the question '${question}'`, "debug");
    const milliseconds = Date.now();
    let response: ChatResponse;
    try
    {
      response = await this.ollama.chat({
        model,
        messages:
          [
            {
              role: "user",
              content: question,
              images: [ unint8Array ]
            }
          ]
      });
    }
    catch (error)
    {
      throw new Error(`The request to the Ollama server failed. Reason: '${error.message}'`);
    }
    const result = response.message.content;
    communicator.sendLog(`Ollama responded in ${Date.now() - milliseconds} ms with the following answer: '${result}'`, "debug");
    return result;
  }

  private async setup(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    this.ollamaUrl = value["ollamaUrl"];
    await this.ensureOllamaServer(communicator, true);
    await this.sendAvailableAiModels(communicator);
  }

  private async sendAvailableAiModels(communicator?: Communicator): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === true && this.ollama !== undefined)
    {
      const response = await this.ollama.list();
      const aiModels: AiModel[] = [];
      for (const model of response.models as OllamaModelItem[])
      {
        if (this.isVisionCapableModel(model) === true)
        {
          const commentDetails: string[] = [];
          if (typeof model.details?.parameter_size === "string" && model.details.parameter_size.length > 0)
          {
            commentDetails.push(model.details.parameter_size);
          }
          if (typeof model.details?.quantization_level === "string" && model.details.quantization_level.length > 0)
          {
            commentDetails.push(model.details.quantization_level);
          }
          if (typeof model.details?.format === "string" && model.details.format.length > 0)
          {
            commentDetails.push(model.details.format.toUpperCase());
          }
          aiModels.push(
            {
              technicalId: model.name,
              name: this.computeModelDisplayName(model.name),
              comment: commentDetails.length > 0 ? `Ollama model (${commentDetails.join(", ")})` : `Ollama model (${model.name})`
            }
          );
        }
      }
      await this.getExtensionApi().extensionSetAiModels(
        {
          id: this.extensionId,
          aiModel: aiModels
        }
      );
      communicator?.sendLog(`Registered ${aiModels.length} AI model(s) from Ollama`, "info");
    }
  }

  private computeModelDisplayName(modelName: string): string
  {
    const sanitized = modelName.trim();
    if (sanitized.length === 0)
    {
      return "Ollama";
    }

    const friendlyDisplayNames: Record<string, string> =
      {
        "gemma4": "Gemma 4",
        "gemma3": "Gemma 3",
        "qwen2.5vl": "Qwen 2.5-VL",
        "qwen2.5-vl": "Qwen 2.5-VL",
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

    // We strip repository prefixes if any (e.g., "library/llava" -> "llava")
    const withoutRepository = sanitized.includes("/") === true
      ? sanitized.split("/").slice(1).join("/")
      : sanitized;

    const segments = withoutRepository.split(":");
    const baseName = segments[0] ?? "";
    const tag = segments[1] ?? "";

    const baseDisplayName = friendlyDisplayNames[baseName] ?? this.formatModelBaseName(baseName);

    if (tag.length > 0 && tag !== "latest")
    {
      const formattedTag = tag.split(/[-_]+/).map((segment) =>
        {
          if (/^\d+[A-Za-z]+$/.test(segment) === true || /^[A-Z0-9]+$/.test(segment) === true)
          {
            return segment.toUpperCase();
          }
          return segment.charAt(0).toUpperCase() + segment.slice(1);
        }
      ).join(" ");
      return `${baseDisplayName} ${formattedTag}`.trim();
    }

    return baseDisplayName;
  }

  private formatModelBaseName(baseName: string): string
  {
    const words: string[] = baseName.split(/[-_]+/).filter((word) => word.length > 0);
    const capitalizedWords: string[] = words.map(
      (word) =>
      {
        if (/^\d+[A-Za-z]+$/.test(word) === true || /^[A-Z0-9]+$/.test(word) === true)
        {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
    );
    const displayName: string = capitalizedWords.join(" ");
    return displayName.length > 0 ? displayName : baseName;
  }

  private isVisionCapableModel(model: OllamaModelItem): boolean
  {
    if (Array.isArray(model.capabilities) === true)
    {
      return model.capabilities.includes("vision");
    }

    // We check families and known vision prefixes if capabilities are not returned
    const families: string[] = model.details?.families ?? [];
    if (families.some((family) => family.toLowerCase().includes("clip") === true || family.toLowerCase().includes("vl") === true))
    {
      return true;
    }

    const lowerCaseName: string = model.name.toLowerCase();
    const visionKeywords: readonly string[] = [ "vl", "vision", "llava", "bakllava", "moondream", "minicpm", "pixtral", "smolvlm" ];
    return visionKeywords.some((keyword) => lowerCaseName.includes(keyword) === true);
  }

  private async ensureOllamaServer(communicator: Communicator | undefined, force: boolean): Promise<boolean>
  {
    if (this.ollamaUrl !== undefined)
    {
      if (this.ollama === undefined || force === true)
      {
        this.ollama = new Ollama({ host: this.ollamaUrl });
      }
      try
      {
        const version = await this.ollama.version();
        communicator?.sendLog(`Ollama server v${version.version} is running`, "debug");
      }
      catch (error)
      {
        communicator?.sendLog(`The Ollama server is not running properly. Reason: '${error.message}'`, "warn");
        this.ollama = undefined;
      }
    }
    return this.ollama !== undefined;
  }

  private async ensureOllamaModels(communicator: Communicator, models: string[], force: boolean): Promise<boolean>
  {
    if (this.ollama !== undefined)
    {
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
            await this.ollama.pull({ model });
            this.pulledModels.add(model);
            communicator.sendLog(`The Ollama has the '${model}' model`, "debug");
          }
          catch (error)
          {
            this.pulledModels.delete(model);
            const reason = "cause" in error && "code" in error.cause && error.cause.code == "ECONNREFUSED" ? "is the Ollama server running?" : error.message;
            communicator.sendLog(`The request to the Ollama server to pull the '${model}' model failed. Reason: '${reason}'`, "error");
          }
        }
      }
    }
    return models.filter(model => this.pulledModels.has(model) === true).length === models.length;
  }

  private async downloadImage(imageId: string): Promise<Uint8Array>
  {
    const blob: Blob = await this.getImageApi().imageDownload({
      id: imageId,
      format: ImageFormat.Png,
      width: 1_024,
      height: 1_024,
      resizeRender: ImageResizeRender.Outbox,
      stripMetadata: true
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

}

new OllamaExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
