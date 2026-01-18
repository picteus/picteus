import {
  Communicator,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  NotificationEvent,
  NotificationReturnedError,
  NotificationsDialogType,
  NotificationsImage,
  NotificationsShowType,
  NotificationsUiAnchor,
  NotificationValue,
  PicteusExtension,
  SettingsValue
} from "@picteus/extension-sdk";


class TypeScriptExtension extends PicteusExtension
{

  protected async initialize(): Promise<boolean>
  {
    this.logger.debug(`The ${this.toString()} with name '${PicteusExtension.getManifest().name}' is initializing`);
    const result = await super.initialize();
    const settings = await this.getSettings();
    this.logger.debug(`The ${this.toString()} has the following settings: ${JSON.stringify(settings)}`);
    return result;
  }

  protected async onTerminate(): Promise<void>
  {
    this.logger.debug(`The ${this.toString()} is terminating`);
  }

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    communicator.sendLog(`The ${this.toString()} is ready`, "info");
    communicator.sendNotification({ key: "value" });
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    communicator.sendLog(`The extension with id '${this.extensionId}' was notified that the settings have been set`, "debug");
  }

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageDeleted || event === NotificationEvent.ImageComputeTags || event === NotificationEvent.ImageComputeFeatures)
    {
      const imageId: string = value["id"];
      const isCreatedOrUpdated = event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated;
      if (isCreatedOrUpdated === true || event === NotificationEvent.ImageDeleted)
      {
        communicator.sendLog(`The image with id '${imageId}' was touched`, "info");
      }
      if (isCreatedOrUpdated === true || event === NotificationEvent.ImageComputeTags)
      {
        this.logger.debug(`Setting the tags for the image with id '${imageId}'`);
        await this.getImageApi().imageSetTags({
          extensionId: this.extensionId,
          id: imageId,
          requestBody: [this.extensionId]
        });
      }
      if (isCreatedOrUpdated === true || event === NotificationEvent.ImageComputeFeatures)
      {
        this.logger.debug(`Setting the features for the image with id '${imageId}'`);
        await this.getImageApi().imageSetFeatures({
          extensionId: this.extensionId,
          id: imageId,
          imageFeature: [{
            type: ImageFeatureType.Other,
            format: ImageFeatureFormat.String,
            name: "example",
            value: "This is a string"
          }]
        });
      }
    }
    else if (event === NotificationEvent.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      const parameters: Record<string, any> = value["parameters"];
      communicator.sendLog(`Received a process command with id '${commandId}' with parameters '${JSON.stringify(parameters)}'`, "debug");
      if (commandId === "askForSomething")
      {
        const intentParameters =
          {
            type: "object",
            properties:
              {
                favoriteColor:
                  {
                    title: "Favorite color",
                    description: "What is your favorite color?",
                    type: "string",
                    default: "pink"
                  },
                likeChocolate:
                  {
                    title: "Chocolate?",
                    description: "Do you like chocolate?",
                    type: "boolean"
                  }
              },
            required: ["favoriteColor"]
          };
        try
        {
          const userParameters: Record<string, any> = await communicator.launchIntent<Record<string, any>>({ parameters: intentParameters });
          communicator.sendLog(`Received the intent result '${JSON.stringify(userParameters)}'`, "info");
          if (userParameters.likeChocolate === true)
          {
            await communicator.launchIntent({
              ui:
                {
                  anchor: NotificationsUiAnchor.Modal,
                  url: "https://www.milka.fr"
                }
            });
          }
        }
        catch (error)
        {
          if (error instanceof NotificationReturnedError)
          {
            communicator.sendLog(`Received the intent error '${error.message}' with reason '${error.reason}'`, "error");
          }
          else
          {
            communicator.sendLog(`Received the unexpected intent error '${error}'`, "error");
          }
        }
      }
      else if (commandId === "dialog")
      {
        const result = await communicator.launchIntent<boolean>({
          dialog:
            {
              type: NotificationsDialogType.Question,
              title: "Dialog",
              description: "This is a dialog question",
              details: "Please, click the right button.",
              buttons: { yes: "Yes", no: "No" }
            }
        });
        communicator.sendLog(`The user clicked the '${result === true ? "Yes" : "No"}' button`, "info");
      }
      else if (commandId === "show")
      {
        const rawType = parameters["type"];
        let showType: NotificationsShowType;
        let showId: string;
        switch (rawType)
        {
          case "extensionSettings":
            showType = NotificationsShowType.ExtensionSettings;
            showId = this.extensionId;
            break;
          case "image":
            showType = NotificationsShowType.Image;
            showId = (await this.getImageApi().imageSearch()).entities[0].id;
            break;
          case "repository":
            showType = NotificationsShowType.Repository;
            showId = (await this.getRepositoryApi().repositoryList())[0].id;
            break;
          default:
            communicator.sendLog(`Unhandled type '${rawType}'`, "error");
            return;
        }
        await communicator.launchIntent({ show: { type: showType, id: showId } });
      }
    }
    else if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      communicator.sendLog(`Received an image command with id '${commandId}' for the image with ids '${imageIds}'`, "debug");
      const newImages: NotificationsImage[] = [];
      for (const imageId of imageIds)
      {
        const image = await this.getImageApi().imageGet({ id: imageId });
        if (commandId === "logDimensions")
        {
          communicator.sendLog(`The image with id '${image.id}', URL '${image.url}' has dimensions ${image.dimensions.width}x${image.dimensions.height}`, "info");
        }
        else if (commandId === "convert")
        {
          const rawFormat: string = parameters["format"];
          const format: ImageFormat = rawFormat.toUpperCase() as ImageFormat;
          const stripMetadata: boolean = parameters["stripMetadata"];
          const width: number | undefined = parameters["width"];
          const height: number | undefined = parameters["height"];
          const resizeRender: ImageResizeRender | undefined = parameters["resizeRender"];
          if ((width !== undefined || height !== undefined) && stripMetadata === false)
          {
            await communicator.launchIntent<boolean>({
              dialog:
                {
                  type: NotificationsDialogType.Error,
                  title: "Image Conversion",
                  description: "When a dimension is specified, the metadata must be stripped.",
                  buttons: { yes: "OK" }
                }
            });
            return;
          }
          communicator.sendLog(`Converting the image with id '${image.id}' and URL '${image.url}'`, "debug");
          const blob: Blob = await this.getImageApi().imageDownload({
            id: imageId,
            format,
            width,
            height,
            resizeRender,
            stripMetadata
          });
          const newImage = await this.getRepositoryApi().repositoryStoreImage({
            id: image.repositoryId,
            parentId: image.id,
            body: blob
          });
          newImages.push({ imageId: newImage.id });
        }
      }

      if (commandId === "convert")
      {
        await communicator.launchIntent({
          images: {
            images: newImages,
            title: "Converted images",
            description: "These are the converted images"
          }
        });
      }
    }
  }

}

new TypeScriptExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
