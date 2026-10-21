import {
  ApiCallError,
  type ApplicationMetadata,
  type CommandParameters,
  Communicator,
  Image,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  type IntentImage,
  PicteusExtension,
  type Repository,
  SearchFeatureComparisonOperator,
  SearchFeatureLogicalOperator
} from "@picteus/extension-sdk";

import { CivitaiClient, CivitaiImage, CivitaiRetrieveImageOptions } from "./civitaiClient.js";
import { CitivaiImageData, CivitaiAnalyzer } from "./civitaiAnalyzer.js";


class CivitaiExtension extends PicteusExtension
{

  private static readonly IDENTITY_FEATURE_NAME = "id";

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.ensureRepository(communicator);
  }

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], _parameters: CommandParameters): Promise<void>
  {
    if (commandId === "reindexFromMetadata")
    {
      await this.reindexFromMetadata(communicator, imageIds);
    }
    else if (commandId === "reindexFromCivitai")
    {
      await this.reindexFromCivitai(communicator, imageIds);
    }
  }

  protected async onProcessCommand(communicator: Communicator, commandId: string, parameters: CommandParameters): Promise<void>
  {
    if (commandId === "fetchImages")
    {
      const source = parameters["source"];
      const userName: string | undefined = source["userName"];
      const postId: string | undefined = source["postId"];
      const count: number = parameters["count"];
      const onlyWithMetadata: boolean = parameters["onlyWithMetadata"] ?? true;
      const isFromPost: boolean = postId !== undefined;
      await this.fetchImages(communicator, isFromPost, isFromPost ? postId : userName, count, onlyWithMetadata);
    }
  }

  private async fetchImages(communicator: Communicator, isFromPost: boolean, userNameOrPostId: string, count: number, onlyWithMetadata: boolean): Promise<void>
  {
    communicator.sendLog(`Fetching ${count} image(s)${onlyWithMetadata === true ? " with metadata" : ""} from Civitai ${isFromPost === true ? `related to the post with id '${userNameOrPostId}'` : `for the user '${userNameOrPostId}'`}`, "info");
    const options: CivitaiRetrieveImageOptions =
      {
        limit: count,
        withMeta: true,
        type: "image",
        sort: "Newest",
        postId: isFromPost === true ? Number.parseInt(userNameOrPostId, 10) : undefined,
        username: isFromPost === false ? userNameOrPostId : undefined,
        onlyWithMetadata
      };
    const civitaiImages = await new CivitaiClient().retrieveImages(options);
    const newImages: IntentImage[] = [];
    if (civitaiImages.length > 0)
    {
      const existingPicteusImages: Image[] = await this.searchImages(this.extensionId, CivitaiExtension.IDENTITY_FEATURE_NAME, civitaiImages.map((data) => data.id.toString(10)));
      const existingImageIdentities = existingPicteusImages.map(image => image.features.find(feature => feature.id === this.extensionId && feature.type == ImageFeatureType.Identity && feature.format == ImageFeatureFormat.String && feature.name === CivitaiExtension.IDENTITY_FEATURE_NAME).value);

      const retriever = new CivitaiAnalyzer();
      for (const civitaiImage of civitaiImages)
      {
        const identifier = civitaiImage.id.toString(10);
        if (existingImageIdentities.indexOf(identifier) !== -1)
        {
          communicator.sendLog(`The Civitai image with id '${identifier}' has already been imported`, "info");
          continue;
        }
        const data: CitivaiImageData = retriever.computeData(civitaiImage);
        const response = await fetch(data.recipe.url);
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([ arrayBuffer ], {});
        try
        {
          communicator.sendLog(`Handling the Civitai image with id '${identifier}' and URL '${data.recipe.url}'`, "debug");
          const { prompts, recipe } = data;
          const applicationMetadata: ApplicationMetadata =
            {
              items:
                [
                  {
                    extensionId: this.extensionId,
                    value: recipe
                  }
                ]
            };
          const image = await this.getRepositoryApi().repositoryStoreImage({
            id: this.repository!.id,
            nameWithoutExtension: identifier,
            sourceUrl: data.recipe.url,
            applicationMetadata: JSON.stringify(applicationMetadata),
            body: blob
          });
          newImages.push({
            imageId: image.id,
            details:
              {
                title: `Image with id '${image.id}'`,
                description: prompts.positive === undefined ? "" : `With prompt '${prompts.positive}`
              }
          });
          await this.getImageApi().imageSetTags({
            id: image.id,
            extensionId: this.extensionId,
            requestBody: [ this.extensionId ]
          });
          await this.getImageApi().imageSetFeatures({
            id: image.id,
            extensionId: this.extensionId,
            imageFeature: this.computeFeatures(data)
          });
        }
        catch (error)
        {
          const apiCallError = error.cause as ApiCallError;
          this.logger.error(`The fetched image with id '${identifier}' could not be imported`, apiCallError);
          communicator.sendLog(`The fetched image with id '${identifier}' could not be imported. Reason: '${error.message}'`, "warn");
        }
      }
    }
    await communicator.launchIntent<void>({
      images:
        {
          images: newImages,
          content:
            {
              title: "Retrieved Images",
              subtitle: `${newImages.length} retrieved image${newImages.length >= 2 ? "s" : ""}`,
              description: "These are the retrieved images"
            }
        }
    });
  }

  private async reindexFromMetadata(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    const retriever = new CivitaiAnalyzer();
    for (const imageId of imageIds)
    {
      const features = await this.getImageApi().imageGetFeatures({ extensionId: this.extensionId, id: imageId });
      const metadata = features.find(feature => feature.type === ImageFeatureType.Metadata);
      if (metadata)
      {
        communicator.forEntity({ type: "image", id: imageId });
        const civitaiImage: CivitaiImage = JSON.parse(metadata.value as string);
        communicator.sendLog(`Reindexing the Civitai image with id '${civitaiImage.id}'`, "info");
        const data = retriever.computeData(civitaiImage);
        await this.getImageApi().imageSetFeatures({
          id: imageId,
          extensionId: this.extensionId,
          imageFeature: this.computeFeatures(data)
        });
      }
    }
  }

  private async reindexFromCivitai(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    const retriever = new CivitaiAnalyzer();
    const client = new CivitaiClient();
    for (const imageId of imageIds)
    {
      const features = await this.getImageApi().imageGetFeatures({ extensionId: this.extensionId, id: imageId });
      const identity = features.find(feature => feature.type === ImageFeatureType.Identity && feature.name === CivitaiExtension.IDENTITY_FEATURE_NAME && feature.type === ImageFeatureType.Identity);
      if (identity !== undefined)
      {
        const civitaiImage = await client.getImage(Number.parseInt(identity.value as string));
        if (civitaiImage !== undefined)
        {
          communicator.forEntity({ type: "image", id: imageId });
          communicator.sendLog(`Reindexing the Civitai image with id '${identity.value}'`, "info");
          const data: CitivaiImageData = retriever.computeData(civitaiImage);
          await this.getImageApi().imageSetFeatures({
            id: imageId,
            extensionId: this.extensionId,
            imageFeature: this.computeFeatures(data)
          });
        }
      }
    }
  }

  private computeFeatures(data: CitivaiImageData): ImageFeature[]
  {
    const features: ImageFeature[] =
      [
        {
          type: ImageFeatureType.Identity,
          format: ImageFeatureFormat.String,
          name: CivitaiExtension.IDENTITY_FEATURE_NAME,
          value: data.recipe.id
        },
        {
          type: ImageFeatureType.Identity,
          format: ImageFeatureFormat.String,
          name: "url",
          value: data.recipe.url
        },
        {
          type: ImageFeatureType.Recipe,
          format: ImageFeatureFormat.Json,
          value: JSON.stringify(data.recipe)
        },
        {
          type: ImageFeatureType.Metadata,
          format: ImageFeatureFormat.Json,
          value: JSON.stringify(data.image)
        }
      ];
    if (data.uiContainer)
    {
      features.push({
        type: ImageFeatureType.Recipe,
        format: ImageFeatureFormat.Ui,
        value: data.uiContainer.toString()
      });
    }
    return features;
  }

  private async ensureRepository(communicator?: Communicator): Promise<void>
  {
    const name = PicteusExtension.getManifest().name;
    this.repository = await this.getRepositoryApi().repositoryEnsure(
      {
        technicalId: this.extensionId,
        name: name,
        comment: `The ${name} repository`,
        watch: true
      }
    );
    communicator?.sendLog(`The repository '${name}' is available`, "info");
  }

  private async searchImages(extensionId: string | undefined, name: string, identities: string[]): Promise<Array<Image>>
  {
    return (await this.getImageApi().imageSearchImages({
      searchParameters: {
        filter: {
          criteria: {
            features: {
              operator: SearchFeatureLogicalOperator.Or,
              conditions: identities.map(identity => ({
                extensionId,
                type: ImageFeatureType.Identity,
                format: ImageFeatureFormat.String,
                name,
                operator: SearchFeatureComparisonOperator.Equals,
                value: identity
              }))
            }
          }
        }
      }
    })).items;
  }

}

new CivitaiExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
