import {
  ApplicationMetadata,
  ApplicationMetadataItem,
  Communicator,
  GenerationRecipeFromJSON,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  NotificationEvent,
  NotificationReturnedError,
  NotificationReturnedErrorCause,
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
        await this.convertImages(communicator, imageIds, parameters);
      }
      else if (commandId === "rateAndComment")
      {
        await this.rateAndCommentImages(imageIds, communicator);
      }
    }
  }

  private async convertImages(communicator: Communicator, imageIds: string[], parameters: Record<string, any>): Promise<void>
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
        return { extensionId: feature.id, value: GenerationRecipeFromJSON(JSON.parse(feature.value as string)) };
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

  private async rateAndCommentImages(imageIds: string[], communicator: Communicator): Promise<void>
  {
    for (const imageId of imageIds)
    {
      const existingFeatures = await this.getImageApi().imageGetFeatures({
        id: imageId,
        extensionId: this.extensionId
      });
      const imageMediaUrl = await this.getImageApi().imageMediaUrl({ id: imageId, height: 75 });
      const ratingName = "Rating";
      const commentName = "Comment";
      const previousRating = existingFeatures.find(feature => feature.name === ratingName && feature.format === ImageFeatureFormat.Integer && feature.type === ImageFeatureType.Annotation);
      const previousComment = existingFeatures.find(feature => feature.name === commentName && feature.format === ImageFeatureFormat.String && feature.type === ImageFeatureType.Comment);
      let result: Record<string, any>;
      try
      {
        result = await communicator.launchIntent<Record<string, any>>({
          dialogContent:
            {
              title: "Rate and comment",
              description: `Please rate and comment the image.<br>![Image thumbnail](${imageMediaUrl.url} "Image thumbnail")`,
              details: "The values will be recorded as features of the image."
            },
          parameters:
            {
              type: "object",
              properties:
                {
                  rating: {
                    type: "integer",
                    title: "Rating",
                    enum: [1, 2, 3, 4, 5],
                    default: previousRating?.value as number ?? 3,
                    ui: { widget: "radio", inline: true }
                  },
                  comment: {
                    type: "string",
                    title: "Comment",
                    minLength: 0,
                    maxLength: 1_024,
                    default: previousComment?.value as string ?? "",
                    ui: { widget: "textarea" }
                  }
                },
              required: ["rating"]
            }
        });
      }
      catch (error)
      {
        const intentError: NotificationReturnedError = error as NotificationReturnedError;
        if (intentError.reason === NotificationReturnedErrorCause.Cancel)
        {
          return;
        }
        else
        {
          throw error;
        }
      }
      const features: ImageFeature[] = existingFeatures.filter(feature => feature.name !== ratingName && feature.name !== commentName);
      const rating: number = result.rating;
      const comment: string | undefined = result.comment;
      features.push(
        {
          type: ImageFeatureType.Annotation,
          name: ratingName,
          value: rating,
          format: ImageFeatureFormat.Integer
        });
      if (comment !== undefined && comment.length > 0)
      {
        features.push(
          {
            type: ImageFeatureType.Comment,
            name: commentName,
            value: comment,
            format: ImageFeatureFormat.String
          });
      }
      await this.getImageApi().imageSetFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: features
      });
    }
  }

}

new ImageCommonsExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
