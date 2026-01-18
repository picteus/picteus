import { CivitaiRESTAPIClient, ImageMeta } from "@stable-canvas/civitai-rest-api-client";

import {
  ApiCallError,
  ApplicationMetadata,
  Communicator,
  GenerationRecipe,
  Helper,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  NotificationEvent,
  NotificationsImage,
  NotificationValue,
  PicteusExtension,
  PromptKind,
  type Repository
} from "@picteus/extension-sdk";


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

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      if (commandId === "fetchImages")
      {
        const parameters: Record<string, any> = value["parameters"];
        const source = parameters["source"];
        const userName: string | undefined = source["userName"];
        const postId: string | undefined = source["postId"];
        const count: number | undefined = parameters["count"];
        const isFromPost: boolean = postId !== undefined;
        await this.fetchImages(communicator, isFromPost, isFromPost ? postId : userName, count);
      }
    }
  }

  private async fetchImages(communicator: Communicator, isFromPost: boolean, userNameOrPostId: string, count: number = 10): Promise<void>
  {
    const client = new CivitaiRESTAPIClient();
    communicator.sendLog(`Fetching ${count} image(s) from Civitai ${isFromPost === true ? `related to the post with id '${userNameOrPostId}'` : `for the user '${userNameOrPostId}'`}`, "info");
    const options: Record<string, any> = { limit: count };
    if (isFromPost === true)
    {
      options.postId = userNameOrPostId;
    }
    else
    {
      options.username = userNameOrPostId;
    }
    const civitaiImages = await client.default.getImages(options);
    const newImages: NotificationsImage[] = [];
    for (const item of civitaiImages.items)
    {
      const id = item.id.toString(10);
      const response = await fetch(item.url);
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], {});
      try
      {
        communicator.sendLog(`Handling the Civitai image with id '${id}' and URL '${item.url}' `, "debug");

        const modelTags: string[] = [];
        const baseModelProperties = ["basemodel", "baseModel"];
        for (const baseModelProperty of baseModelProperties)
        {
          if (baseModelProperty in item)
          {
            // @ts-ignore
            modelTags.push(item[baseModelProperty]);
          }
        }
        const meta: ImageMeta = item.meta;
        if ("models" in meta)
        {
          // @ts-ignore
          modelTags.push(...meta["models"]);
        }
        if ("Model" in meta)
        {
          // @ts-ignore
          modelTags.push(meta["Model"]);
        }
        if ("baseModel" in meta)
        {
          // @ts-ignore
          modelTags.push(meta["baseModel"]);
        }
        const prompt = meta.prompt;
        // @ts-ignore
        const negativePrompt = meta["negativePrompt"];
        const createdAt = item.createdAt;
        // @ts-ignore
        const aspectRatioRawString: string | undefined = meta["aspectratio"];
        let aspectRatio: number | undefined;
        if (aspectRatioRawString !== undefined)
        {
          const [width, height] = aspectRatioRawString.split(":").map(string => parseInt(string));
          aspectRatio = width / height;
        }
        const sanitizedModelTags = modelTags.map(tag => tag.replaceAll(" ", "_"));
        const recipe: GenerationRecipe =
          {
            schemaVersion: Helper.GENERATION_RECIPE_SCHEMA_VERSION,
            modelTags: sanitizedModelTags,
            id: item.id.toString(),
            url: item.url,
            aspectRatio,
            prompt: { kind: PromptKind.Instructions, value: item }
          };
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
          sourceUrl: item.url,
          applicationMetadata: JSON.stringify(applicationMetadata),
          body: blob
        });
        newImages.push({ imageId: image.id, title: `Image with id '${image.id}'` });
        await this.getImageApi().imageSetTags({
          id: image.id,
          extensionId: this.extensionId,
          requestBody: [this.extensionId]
        });
        const features: ImageFeature[] =
          [
            {
              type: ImageFeatureType.Recipe,
              format: ImageFeatureFormat.Json,
              value: JSON.stringify(recipe)
            },
            {
              type: ImageFeatureType.Metadata,
              format: ImageFeatureFormat.Json,
              value: JSON.stringify(item)
            }
          ];
        if (prompt !== undefined)
        {
          features.push({
            type: ImageFeatureType.Description,
            format: ImageFeatureFormat.String,
            value: prompt
          });
          const items = [{ label: "Prompt", value: prompt }];
          if (negativePrompt !== undefined)
          {
            items.push({ label: "Negative Prompt", value: negativePrompt });
          }
          if (createdAt !== undefined)
          {
            items.push({ label: "Creation Date", value: createdAt });
          }
          if (item.url !== undefined)
          {
            items.push({ label: "URL", value: item.url });
          }
          features.push({
            type: ImageFeatureType.Other,
            format: ImageFeatureFormat.Markdown,
            value: items.map(item => `**${item.label}:** ${item.value}`).join("<br>")
          });
        }
        await this.getImageApi().imageSetFeatures({
          id: image.id,
          extensionId: this.extensionId,
          imageFeature: features
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
      images: {
        images: newImages,
        title: "Retrieved Images",
        description: "These are the retrieved images"
      }
    });
  };

}

new CivitaiExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
