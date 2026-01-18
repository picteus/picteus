import {
  ApplicationMetadata,
  ApplicationMetadataItem,
  Communicator,
  GenerationRecipeFromJSON,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  NotificationEvent,
  NotificationsDialogType,
  NotificationsImage,
  NotificationValue,
  PicteusExtension
} from "@picteus/extension-sdk";


class ImageCommonsExtension extends PicteusExtension
{

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: Record<string, any> = value["parameters"];
      if (commandId === "convert")
      {
        const newImages: NotificationsImage[] = [];
        for (const imageId of imageIds)
        {
          const image = await this.getImageApi().imageGet({ id: imageId });
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
          const metadataValues: ApplicationMetadataItem[] = image.features.filter(feature => feature.type === ImageFeatureType.Recipe).map(feature =>
          {
            return { extensionId: feature.id, value: GenerationRecipeFromJSON(JSON.parse(feature.value)) };
          });
          const applicationMetadata: ApplicationMetadata = (format !== ImageFormat.Png && format !== ImageFormat.Jpeg) ? undefined : (metadataValues.length === 0 ? undefined : { items: metadataValues });
          const newImage = await this.getRepositoryApi().repositoryStoreImage({
            id: image.repositoryId,
            parentId: image.id,
            applicationMetadata: applicationMetadata === undefined ? undefined : JSON.stringify(applicationMetadata),
            body: blob
          });
          newImages.push({ imageId: newImage.id });
        }
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

new ImageCommonsExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
