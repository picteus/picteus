import type { Image } from "@stable-canvas/civitai-rest-api-client";

import {
  ApiCallError,
  type ApplicationMetadata,
  type CommandParameters,
  Communicator,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  type IntentImage,
  PicteusExtension,
  type Repository
} from "@picteus/extension-sdk";

import { CitivaiImageData, CivitaiRetriever } from "./retriever";


class CivitaiExtension extends PicteusExtension
{

  private repository?: Repository;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    const ensureRepository = async (): Promise<void> =>
    {
      const name = PicteusExtension.getManifest().name;
      this.repository = await this.getRepositoryApi().repositoryEnsure({
        technicalId: this.extensionId,
        name,
        comment: `The ${name} repository`,
        watch: true
      });
      communicator.sendLog(`The repository '${name}' is available`, "info");
    };
    await ensureRepository();
  }

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], _parameters: CommandParameters): Promise<void>
  {
    if (commandId === "reIndex")
    {
      await this.reindex(communicator, imageIds);
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
      const isFromPost: boolean = postId !== undefined;
      await this.fetchImages(communicator, isFromPost, isFromPost ? postId : userName, count);
    }
  }

  private async fetchImages(communicator: Communicator, isFromPost: boolean, userNameOrPostId: string, count: number): Promise<void>
  {
    communicator.sendLog(`Fetching ${count} image(s) from Civitai ${isFromPost === true ? `related to the post with id '${userNameOrPostId}'` : `for the user '${userNameOrPostId}'`}`, "info");
    const options: Record<string, any> = { limit: count, withMeta: true };
    if (isFromPost === true)
    {
      options.postId = userNameOrPostId;
    }
    else
    {
      options.username = userNameOrPostId;
    }
    const citivaiImageDatas: CitivaiImageData[] = await new CivitaiRetriever().run(options);
    const newImages: IntentImage[] = [];
    for (const data of citivaiImageDatas)
    {
      const id = data.recipe.id;
      const response = await fetch(data.recipe.url);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([ arrayBuffer ], {});
      try
      {
        communicator.sendLog(`Handling the Civitai image with id '${id}' and URL '${data.recipe.url}'`, "debug");
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
          nameWithoutExtension: id,
          sourceUrl: data.recipe.url,
          applicationMetadata: JSON.stringify(applicationMetadata),
          body: blob
        });
        newImages.push({
          imageId: image.id,
          dialogContent:
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
        this.logger.error(`The fetched image with id '${id}' could not be imported`, apiCallError);
        communicator.sendLog(`The fetched image with id '${id}' could not be imported. Reason: '${error.message}'`, "warn");
      }
    }
    await communicator.launchIntent({
      images:
        {
          images: newImages,
          dialogContent:
            {
              title: "Retrieved Images",
              description: "These are the retrieved images"
            }
        }
    });
  };

  private async reindex(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    const retriever = new CivitaiRetriever();
    for (const imageId of imageIds)
    {
      const features = await this.getImageApi().imageGetFeatures({ extensionId: this.extensionId, id: imageId });
      const metadata = features.find(feature => feature.type === ImageFeatureType.Metadata);
      if (metadata)
      {
        communicator.sendLog(`Reindexing the Civitai image with id '${imageId}'`, "info");
        const civitaiImage: Image = JSON.parse(metadata.value as string);
        const data = retriever.computeData(civitaiImage);
        await this.getImageApi().imageSetFeatures({
          id: imageId,
          extensionId: this.extensionId,
          imageFeature: this.computeFeatures(data)
        });
      }
    }
  }

  private computeFeatures(data: CitivaiImageData)
  {
    const features: ImageFeature[] =
      [
        {
          type: ImageFeatureType.Identity,
          format: ImageFeatureFormat.String,
          name: "id",
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

}

new CivitaiExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
