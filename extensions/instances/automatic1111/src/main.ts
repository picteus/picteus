import {
  Communicator,
  type GenerationRecipe,
  Helper,
  ImageFeatureFormat,
  ImageFeatureType,
  type ImageMetadata,
  PicteusExtension,
  PromptKind
} from "@picteus/extension-sdk";

import { Automatic1111UserComment } from "./instructions";


const Automatic1111Constants =
  {
    userComment: "userComment",
    parameters: "parameters"
  } as const;

class Automatic1111Extension extends PicteusExtension
{

  protected async onImageCreated(_communicator: Communicator, imageId: string): Promise<void>
  {
    const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
    await this.computeTags(imageId, metadata);
    await this.computeFeatures(imageId, metadata);
  }

  protected async onImageUpdated(_communicator: Communicator, imageId: string): Promise<void>
  {
    const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
    await this.computeTags(imageId, metadata);
    await this.computeFeatures(imageId, metadata);
  }

  protected async onComputeImageTags(_communicator: Communicator, imageId: string): Promise<void>
  {
    const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
    await this.computeTags(imageId, metadata);
  }

  protected async onComputeImageFeatures(_communicator: Communicator, imageId: string): Promise<void>
  {
    const metadata = await this.getImageApi().imageGetMetadata({ id: imageId });
    await this.computeFeatures(imageId, metadata);
  }

  private async computeTags(imageId: string, metadata: ImageMetadata): Promise<void>
  {
    const userComment = this.computeUserComment(metadata);
    await this.getImageApi().imageSetTags({
      id: imageId,
      extensionId: this.extensionId,
      requestBody: userComment !== undefined ? [ this.extensionId ] : []
    });
  }

  private async computeFeatures(imageId: string, metadata: ImageMetadata): Promise<void>
  {
    const userComment: Automatic1111UserComment | undefined = this.computeUserComment(metadata);
    if (userComment !== undefined)
    {
      const recipe: GenerationRecipe =
        {
          schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
          modelTags: [],
          software: "automatic1111",
          prompt: { kind: PromptKind.Instructions, value: userComment }
        };
      await this.getImageApi().imageSetFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: [
          {
            type: ImageFeatureType.Recipe,
            format: ImageFeatureFormat.Json,
            value: JSON.stringify(recipe)
          },
          {
            type: ImageFeatureType.Recipe,
            format: ImageFeatureFormat.Ui,
            value: userComment.toUiContainer().toString()
          }
        ]
      });
    }
  }

  private computeUserComment(metadata: ImageMetadata): Automatic1111UserComment | undefined
  {
    if (metadata.all !== undefined)
    {
      const allMetadata = JSON.parse(metadata.all);
      const userComment: string | undefined = allMetadata[Automatic1111Constants.userComment];
      const parameters: string | undefined = allMetadata[Automatic1111Constants.parameters];
      const userCommentOrParameters = userComment === undefined ? parameters : userComment;
      try
      {
        return Automatic1111UserComment.parse(userCommentOrParameters);
      }
      catch (error)
      {
        // It means that this is not an Automatic1111 generated image
      }
    }
    return undefined;
  }

}

new Automatic1111Extension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
