import * as fs from "node:fs";
import * as path from "node:path";

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

  protected async onSettings(communicator: Communicator, _value: SettingsValue): Promise<void>
  {
    communicator.sendLog(`The extension with id '${this.extensionId}' was notified that the settings have been set`, "debug");
  }

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageDeleted || event === NotificationEvent.ImageComputeTags || event === NotificationEvent.ImageComputeFeatures)
    {
      await this.handleImageEvent(communicator, event, value);
    }
    else if (event === NotificationEvent.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      const parameters: Record<string, any> = value["parameters"];
      communicator.sendLog(`Received a process command with id '${commandId}' with parameters '${JSON.stringify(parameters)}'`, "debug");
      if (commandId === "askForSomething")
      {
        await this.handleAskForSomething(communicator);
      }
      else if (commandId === "dialog")
      {
        await this.handleDialog(communicator, parameters);
      }
      else if (commandId === "application")
      {
        await this.handleApplication(communicator);
      }
      else if (commandId === "swaggerui")
      {
        await this.handleSwaggerUi(communicator);
      }
      else if (commandId === "show")
      {
        await this.handleShow(communicator, parameters);
      }
    }
    else if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      await this.handleRunCommand(communicator, commandId, imageIds, parameters);
    }
  }

  private async handleImageEvent(communicator: Communicator, event: NotificationEvent, value: NotificationValue): Promise<void>
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

  private async handleAskForSomething(communicator: Communicator): Promise<void>
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
                enum: ["pink", "blue", "yellow", "green"],
                default: "pink",
                ui:
                  {
                    widget: "radio",
                    inline: true
                  }
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
      const imageIds = (await this.getImageApi().imageSearchSummaries({
        searchParameters: { range: { take: 3 } }
      })).items.map(summary => summary.id);
      const userParameters: Record<string, any> = await communicator.launchIntent<Record<string, any>>({
        context: { imageIds },
        form:
          {
            parameters: intentParameters,
            dialogContent: {
              title: "Favorite color and chocolate",
              description: "This shows how an extension can input parameters from the user.",
              details: "This dialog box has been dynamically generated from the extension source code.",
              icon: {
                content: Buffer.from("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", "base64")
              }
            }
          }
      });
      communicator.sendLog(`Received the intent result '${JSON.stringify(userParameters)}'`, "info");
      if (userParameters.likeChocolate === true)
      {
        await communicator.launchIntent({
          ui:
            {
              anchor: NotificationsUiAnchor.Modal,
              frameContent: { url: `${this.webServicesBaseUrl}/swaggerui` },
              dialogContent:
                {
                  title: "Website",
                  description: "A web site with some chocolate",
                  details: "This is to showcase that a modal window may be opened with some title, description and details."
                }
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

  private async handleDialog(communicator: Communicator, parameters: Record<string, any>): Promise<void>
  {
    const imageIds = (await this.getImageApi().imageSearchSummaries({
      searchParameters:
        {
          filter:
            {
              sorting: { property: "importDate", isAscending: false }
            },
          range: { take: 3 }
        }
    })).items.map(summary => summary.id);
    const result = await communicator.launchIntent<boolean>({
      context: { imageIds },
      dialog:
        {
          type: NotificationsDialogType.Question,
          size: "m",
          title: "Dialog",
          description: "This is a dialog question",
          details: "Please, click the right button.",
          frame: parameters["type"] !== "With HTML" ? undefined : {
            content: { html: `<html lang="en"><body>This is an <b>HTML</b> content within a dialog box.</body></html>` },
            height: 50
          },
          buttons: { yes: "Yes", no: "No" }
        }
    });
    communicator.sendLog(`The user clicked the '${result === true ? "Yes" : "No"}' button`, "info");
  }

  private async handleApplication(communicator: Communicator): Promise<void>
  {
    const summaries = (await this.getImageApi().imageSearchSummaries({
      searchParameters:
        {
          filter:
            {
              sorting: { property: "importDate", isAscending: false }
            },
          range: { take: 20 }
        }
    })).items;
    const result = await communicator.launchIntent<string>({
      serveBundle:
        {
          content: fs.readFileSync(path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "application.zip")),
          settings: { imageIds: summaries.map(summary => summary.id) }
        }
    });
    await communicator.launchIntent({
      dialog:
        {
          type: NotificationsDialogType.Info,
          title: "Application",
          description: "This dialog box integrates an iframe application.",
          icon: { content: fs.readFileSync(path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "swaggerui.png")) },
          size: "l",
          frame: { content: { url: result + "/index.html" }, height: 70 },
          buttons: { yes: "Close" }
        }
    });
  }

  private async handleSwaggerUi(communicator: Communicator): Promise<void>
  {
    await communicator.launchIntent({
      ui:
        {
          anchor: NotificationsUiAnchor.Sidebar,
          frameContent: { url: `${this.webServicesBaseUrl}/swaggerui` },
          dialogContent:
            {
              title: "Swagger UI",
              description: "Enables to interact with the API.",
              icon: { content: fs.readFileSync(path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "swaggerui.png")) },
            }
        }
    });
  }

  private async handleShow(communicator: Communicator, parameters: Record<string, any>): Promise<void>
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
        showId = (await this.getImageApi().imageSearchSummaries({
          searchParameters: {
            filter: {
              sorting: {
                property: "importDate",
                isAscending: false
              }
            }, range: { take: 1 }
          }
        })).items[0].id;
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

  private async handleRunCommand(communicator: Communicator, commandId: string, imageIds: string[], parameters: Record<string, any>): Promise<void>
  {
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
          dialogContent:
            {
              title: "Converted images",
              description: "These are the converted images"
            }
        }
      });
    }
  }

}

new TypeScriptExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
