import { type ChatResponse, Ollama } from "ollama";

import {
  CommandError,
  type CommandParameters,
  Communicator,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  IntentDialogType,
  PicteusExtension,
  type SettingsValue,
  type Versions
} from "@picteus/extension-sdk";


class OllamaExtension extends PicteusExtension
{

  private ollamaUrl?: string;

  private captionEnabled?: boolean;

  private captionModels?: string[];

  private captionQuestions?: string[];

  private tagsEnabled?: boolean;

  private tagsModel?: string;

  private tagsList?: string[];

  private tagsQuestionTemplate?: string;

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

  protected async onImageCreated(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTagsAndFeatures(communicator, imageId);
  }

  protected async onImageUpdated(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeTagsAndFeatures(communicator, imageId);
  }

  protected async onComputeImageTags(communicator: Communicator, imageId: string): Promise<void>
  {
    if (this.tagsEnabled)
    {
      await this.computeTags(communicator, imageId, await this.downloadImage(imageId));
    }
  }

  protected async onComputeImageFeatures(communicator: Communicator, imageId: string): Promise<void>
  {
    if (this.captionEnabled)
    {
      await this.computeFeatures(communicator, imageId, await this.downloadImage(imageId));
    }
  }

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], parameters: CommandParameters): Promise<void>
  {
    if (commandId === "askQuestion")
    {
      const imageId = imageIds[0];
      await this.askQuestion(communicator, imageId, parameters["model"], parameters["question"]);
    }
  }

  private async computeTagsAndFeatures(communicator: Communicator, imageId: string): Promise<void>
  {
    if (this.captionEnabled === true || this.tagsEnabled === true)
    {
      const imageUint8Array = await this.downloadImage(imageId);
      if (this.tagsEnabled)
      {
        await this.computeTags(communicator, imageId, imageUint8Array);
      }
      if (this.captionEnabled)
      {
        await this.computeFeatures(communicator, imageId, imageUint8Array);
      }
    }
  }

  private async computeTags(communicator: Communicator, imageId: string, imageUint8Array: Uint8Array): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      return;
    }
    const tagsToQuery = this.tagsList || [];
    if (tagsToQuery.length === 0)
    {
      return;
    }
    if (this.tagsModel !== undefined)
    {
      const question = (this.tagsQuestionTemplate + " Respond only with a comma-separated list of selected tags.").replace("{tags}", tagsToQuery.join(", "));
      const chosenTagsSet = new Set<string>();
      if (await this.ensureOllamaModels(communicator, [ this.tagsModel ], false) === true)
      {
        const response: string = await this.requestOllama(communicator, this.tagsModel, imageUint8Array, question);
        for (const tag of tagsToQuery)
        {
          const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
          const regex = new RegExp(`\\b${escapedTag}\\b`, "i");
          if (regex.test(response) === true)
          {
            chosenTagsSet.add(tag);
          }
        }
      }
      await this.getImageApi().imageSetTags({
        id: imageId,
        extensionId: this.parameters.extensionId,
        requestBody: Array.from(chosenTagsSet)
      });
    }
  }

  private async computeFeatures(communicator: Communicator, imageId: string, imageUint8Array: Uint8Array): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      return;
    }
    if (this.captionModels !== undefined)
    {
      const modelAndCaptions = [];
      for (const model of this.captionModels)
      {
        if (await this.ensureOllamaModels(communicator, [ model ], false) === true)
        {
          for (const question of this.captionQuestions || [])
          {
            const caption: string = await this.requestOllama(communicator, model, imageUint8Array, question);
            modelAndCaptions.push({ model, caption });
          }
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
  }

  private async askQuestion(communicator: Communicator, imageId: string, model: string, question: string): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      throw new CommandError("The Ollama server is not available");
    }
    if (await this.ensureOllamaModels(communicator, [ model ], false) === false)
    {
      throw new CommandError(`The Ollama model '${model}' is not available`);
    }
    let answer: string;
    try
    {
      answer = await this.requestOllama(communicator, model, imageId, question);
    }
    catch (error)
    {
      throw CommandError.fromError(error);
    }
    await communicator.launchIntent<void>({
      dialog: {
        type: IntentDialogType.Info,
        title: `Response from the '${model}' model`,
        description: `After having analyzed the image, here is the answer to your question <b>"${question}"</b>.`,
        details: `${answer}`,
        size: "m",
        buttons: { yes: "OK" }
      }
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

    const caption = value["caption"];
    this.captionEnabled = caption["enabled"] !== false;
    this.captionModels = caption["models"] || [];
    this.captionQuestions = caption["questions"] || [];

    const tags = value["tags"];
    this.tagsEnabled = tags["enabled"] !== false;
    this.tagsModel = tags["model"];
    this.tagsList = tags["tags"] || [];
    this.tagsQuestionTemplate = tags["question"];

    await this.ensureOllamaServer(communicator, true);

    const toPullModels = new Set<string>(this.captionModels);
    toPullModels.add(this.tagsModel);
    await this.ensureOllamaModels(communicator, Array.from(toPullModels), true);
  }

  private async ensureOllamaServer(communicator: Communicator, force: boolean): Promise<boolean>
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
        communicator.sendLog(`Ollama server v${version.version} is running`, "debug");
      }
      catch (error)
      {
        communicator.sendLog(`The Ollama server is not running properly. Reason: '${error.message}'`, "error");
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
