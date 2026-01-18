import { ChatResponse, Ollama } from "ollama";

import {
  Communicator,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  NotificationEvent,
  NotificationsDialogType,
  NotificationValue,
  PicteusExtension,
  SettingsValue
} from "@picteus/extension-sdk";


class OllamaExtension extends PicteusExtension
{

  private ollamaUrl?: string;

  private models?: string[];

  private questions?: string[];

  private ollama?: Ollama;

  private readonly pulledModels = new Set<string>();

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(communicator!, await this.getSettings());
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
  }

  protected async onEvent(communicator: Communicator, channel: string, value: NotificationValue): Promise<any>
  {
    if (channel === NotificationEvent.ImageCreated || channel === NotificationEvent.ImageUpdated || channel === NotificationEvent.ImageComputeFeatures)
    {
      const imageId = value["id"];
      await this.computeCaption(communicator, imageId);
    }
    else if (channel === NotificationEvent.ImageRunCommand)
    {
      const imageIds: string[] = value["imageIds"];
      const imageId = imageIds[0];
      const parameters: Record<string, any> = value["parameters"];
      await this.askQuestion(communicator, imageId, parameters["model"], parameters["question"]);
    }
  }

  private async computeCaption(communicator: Communicator, imageId: string): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      return;
    }
    const uint8Array = await this.downloadImage(imageId);
    const modelAndCaptions = [];
    for (const model of this.models)
    {
      if (await this.ensureOllamaModels(communicator, [model], false) === true)
      {
        for (const question of this.questions)
        {
          const caption: string = await this.requestOllama(communicator, model, uint8Array, question);
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

  private async askQuestion(communicator: Communicator, imageId: string, model: string, question: string): Promise<void>
  {
    if (await this.ensureOllamaServer(communicator, false) === false)
    {
      throw new Error("The Ollama server is not available");
    }
    if (await this.ensureOllamaModels(communicator, [model], false) === false)
    {
      throw new Error(`The Ollama model '${model}' is not available`);
    }
    const answer = await this.requestOllama(communicator, model, imageId, question);
    await communicator.launchIntent<void>({
      dialog: {
        type: NotificationsDialogType.Info,
        title: `Response from the '${model}' model`,
        description: `After having analyzed the image, here is the answer to your question <b>"${question}"</b>.`,
        details: `${answer}`,
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
              images: [unint8Array]
            }
          ]
      });
    }
    catch (error)
    {
      communicator.sendLog(`The request to the Ollama server failed. Reason: '${error.message}'`, "error");
      throw error;
    }
    const result = response.message.content;
    communicator.sendLog(`Ollama responded in ${Date.now() - milliseconds} ms with the following answer: '${result}'`, "debug");
    return result;
  }

  private async setup(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    this.ollamaUrl = value["ollamaUrl"];
    this.models = value["models"];
    this.questions = value["questions"];
    await this.ensureOllamaServer(communicator, true);
    await this.ensureOllamaModels(communicator, this.models, true);
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
        communicator.sendLog(`Ollama server v${version} is running`, "info");
      }
      catch (error)
      {
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
      resizeRender: "inbox",
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
