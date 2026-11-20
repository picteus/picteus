import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  IntentToastType,
  PicteusExtension,
  type Repository,
  SearchFeatureComparisonOperator,
  SearchFeatureLogicalOperator,
  SearchOriginNature
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
    if (commandId === "reindexFromFileMetadata")
    {
      await this.reindexFromFileMetadata(communicator, imageIds);
    }
    else if (commandId === "reindexFromApplicationMetadata")
    {
      await this.reindexFromApplicationMetadata(communicator, imageIds);
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
      const imageId: number | undefined = source["imageId"];
      const count: number = parameters["count"];
      const onlyWithMetadata: boolean = parameters["onlyWithMetadata"] ?? true;
      const sourceType: "image" | "post" | "user" = imageId !== undefined ? "image" : postId !== undefined ? "post" : "user";
      const sourceIdentifier: string = imageId !== undefined ? imageId.toString(10) : postId ?? userName;
      await this.fetchImages(communicator, sourceType, sourceIdentifier, count, onlyWithMetadata);
    }
    else if (commandId === "redownloadMissingImages")
    {
      await this.redownloadMissingImages(communicator);
    }
  }

  private async fetchImages(communicator: Communicator, sourceType: "image" | "post" | "user", sourceIdentifier: string, count: number, onlyWithMetadata: boolean): Promise<void>
  {
    const isFromImage = sourceType === "image";
    const isFromPost = sourceType === "post";
    const requestedCount = isFromImage === true ? 1 : count;
    communicator.sendLog(`Fetching ${requestedCount} image(s)${onlyWithMetadata === true ? " with metadata" : ""} from Civitai ${isFromImage === true ? `with id '${sourceIdentifier}'` : isFromPost === true ? `related to the post with id '${sourceIdentifier}'` : `for the user '${sourceIdentifier}'`}`, "info");
    const options: CivitaiRetrieveImageOptions =
      {
        limit: requestedCount,
        withMeta: true,
        type: "image",
        sort: "Newest",
        postId: isFromPost === true ? Number.parseInt(sourceIdentifier, 10) : undefined,
        username: sourceType === "user" ? sourceIdentifier : undefined,
        onlyWithMetadata
      };
    const client = new CivitaiClient();
    let civitaiImages: CivitaiImage[];
    if (isFromImage === true)
    {
      const civitaiImage = await client.getImage(Number.parseInt(sourceIdentifier, 10));
      if (civitaiImage === undefined)
      {
        communicator.sendLog(`The Civitai image with id '${sourceIdentifier}' was not found`, "warn");
        civitaiImages = [];
      }
      else if (onlyWithMetadata === true && (civitaiImage.meta === null || civitaiImage.meta === undefined))
      {
        communicator.sendLog(`The Civitai image with id '${sourceIdentifier}' does not include metadata and was skipped`, "warn");
        civitaiImages = [];
      }
      else
      {
        civitaiImages = [ civitaiImage ];
      }
    }
    else
    {
      civitaiImages = await client.retrieveImages(options);
    }
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
    const civitaiUrlPrefix = `https://civitai.com/`;
    const contentUrl = isFromImage === true ? `${civitaiUrlPrefix}images/${sourceIdentifier}` : (isFromPost === true ? `${civitaiUrlPrefix}posts/${sourceIdentifier}` : `${civitaiUrlPrefix}user/${sourceIdentifier}`);
    const sourceDescription = isFromImage === true ? "image" : isFromPost === true ? "post" : "user";
    await communicator.launchIntent<void>({
      images:
        {
          images: newImages,
          content:
            {
              title: "Retrieved Images",
              subtitle: `${newImages.length} retrieved image${newImages.length >= 2 ? "s" : ""}`,
              description: "Here are the retrieved images.",
              details: `The images were retrieved from the ${sourceDescription} with identifier \`${sourceIdentifier}\`, which are accessible from [${contentUrl}](${contentUrl}).`
            }
        }
    });
  }

  private async reindexFromFileMetadata(communicator: Communicator, imageIds: string[]): Promise<void>
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

  private async reindexFromApplicationMetadata(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    const retriever = new CivitaiAnalyzer();
    const client = new CivitaiClient();
    for (const imageId of imageIds)
    {
      const imageMetadata = await this.getImageApi().imageGetMetadata({ id: imageId });
      const targetPrinterMetadataRaw = JSON.parse(imageMetadata.all)["TargetPrinter"];
      if (targetPrinterMetadataRaw !== undefined)
      {
        const targetPrinterMetadata = JSON.parse(targetPrinterMetadataRaw);
        const picteusMetadataItems = targetPrinterMetadata["picteus"];
        if (picteusMetadataItems !== undefined)
        {
          const picteusMetadata: { id: number } = picteusMetadataItems["civitai"];
          if (picteusMetadata !== undefined)
          {
            await this.reindexCivitaiImage(communicator, client, retriever, picteusMetadata.id, imageId);
          }
        }
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
      const identityFeature = features.find(feature => feature.type === ImageFeatureType.Identity && feature.name === CivitaiExtension.IDENTITY_FEATURE_NAME && feature.type === ImageFeatureType.Identity);
      if (identityFeature !== undefined)
      {
        const civitaiIdentity = Number.parseInt(identityFeature.value as string);
        await this.reindexCivitaiImage(communicator, client, retriever, civitaiIdentity, imageId);
      }
    }
  }

  private async reindexCivitaiImage(communicator: Communicator, client: CivitaiClient, retriever: CivitaiAnalyzer, civitaiIdentity: number, imageId: string): Promise<void>
  {
    const civitaiImage = await client.getImage(civitaiIdentity);
    if (civitaiImage !== undefined)
    {
      communicator.forEntity({ type: "image", id: imageId });
      communicator.sendLog(`Reindexing the image with id '${civitaiIdentity}'`, "info");
      const data: CitivaiImageData = retriever.computeData(civitaiImage);
      await this.getImageApi().imageEnsureFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: this.computeFeatures(data)
      });
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
        extensionId: this.extensionId,
        name: name,
        comment: `The ${name} repository`
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

  private async redownloadMissingImages(communicator: Communicator): Promise<void>
  {
    const repository = this.repository;
    if (repository === undefined)
    {
      communicator.sendLog("The Civitai repository could not be found", "error");
      return;
    }

    communicator.sendLog(`Requesting all images located in the '${repository.name}' repository...`, "info");
    const images = await this.getAllImagesInRepository(repository.id);
    communicator.sendLog(`Found ${images.length} image(s) in the '${repository.name}' repository. Checking bitmap availability...`, "info");

    const retriever = new CivitaiAnalyzer();
    const client = new CivitaiClient();
    const restoredImages: IntentImage[] = [];

    for (const image of images)
    {
      const isAvailable = await this.isBitmapAvailable(image);

      communicator.forEntity({ type: "image", id: image.id });
      communicator.sendLog(`The bitmap for image '${image.name}' (ID: ${image.id}) is not available anymore. Finding Civitai image ID...`, "warn");

      const civitaiImageId = await this.resolveCivitaiImageId(image);
      if (civitaiImageId === undefined)
      {
        communicator.sendLog(`Could not determine the Civitai ID for image '${image.name}' (ID: ${image.id}). Skipping redownload.`, "warn");
        continue;
      }

      if (isAvailable === true)
      {
        await this.getImageApi().imageEnsureTags({
          id: image.id,
          extensionId: this.extensionId,
          requestBody: [ this.extensionId ]
        });
        await this.reindexCivitaiImage(communicator, client, retriever, civitaiImageId, image.id);
        continue;
      }

      try
      {
        communicator.sendLog(`Fetching Civitai metadata for image with ID '${civitaiImageId}'...`, "debug");
        const civitaiImage = await client.getImage(civitaiImageId);
        if (civitaiImage === undefined || !civitaiImage.url)
        {
          communicator.sendLog(`Image with ID '${civitaiImageId}' was not found on Civitai or has no URL`, "warn");
          continue;
        }

        communicator.sendLog(`Redownloading bitmap from Civitai (${civitaiImage.url})...`, "info");
        const response = await fetch(civitaiImage.url);
        if (!response.ok)
        {
          throw new Error(`Failed to download image from '${civitaiImage.url}' (status ${response.status} ${response.statusText})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([ arrayBuffer ]);

        try
        {
          await this.getImageApi().imageModify({
            id: image.id,
            body: blob
          });
        }
        catch (modifyError)
        {
          this.logger.warn(`API imageModify failed for image '${image.id}': ${(modifyError as Error).message}. Attempting direct file write fallback.`);
          if (image.url.startsWith("file://"))
          {
            const filePath = fileURLToPath(image.url);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
          }
          else
          {
            throw modifyError;
          }
        }

        communicator.sendLog(`Successfully redownloaded bitmap for Civitai image '${civitaiImageId}'`, "info");
        restoredImages.push({
          imageId: image.id,
          details: {
            title: `Image '${image.name}'`,
            description: `Bitmap redownloaded from Civitai (ID: ${civitaiImageId})`
          }
        });
      }
      catch (error)
      {
        this.logger.error(`Error redownloading bitmap for image '${image.id}' (Civitai ID: ${civitaiImageId})`, error);
        communicator.sendLog(`Failed to redownload bitmap for Civitai image '${civitaiImageId}': ${(error as Error).message}`, "warn");
      }
    }

    if (restoredImages.length > 0)
    {
      communicator.sendLog(`Completed scanning repository. Redownloaded ${restoredImages.length} missing bitmap(s) out of ${images.length} image(s).`, "info");
      await communicator.launchIntent<void>({
        images: {
          images: restoredImages,
          content: {
            title: "Redownloaded Images",
            subtitle: `${restoredImages.length} image bitmap${restoredImages.length > 1 ? "s" : ""} redownloaded`,
            description: "The bitmaps for these Civitai images were no longer available and have been redownloaded from Civitai.",
            details: `Scanned ${images.length} image(s) in repository \`${repository.name}\`.`
          }
        }
      });
    }
    else
    {
      communicator.sendLog(`Completed scanning repository '${repository.name}'. All ${images.length} bitmap(s) are available.`, "info");
      await communicator.launchIntent<void>({
        toast: {
          title: "Bitmap Verification",
          subtitle: `All ${images.length} image bitmap(s) in the '${repository.name}' repository are already available.`,
          type: IntentToastType.Info
        }
      });
    }
  }

  private async getAllImagesInRepository(repositoryId: string): Promise<Image[]>
  {
    const images: Image[] = [];
    const pageSize = 100;
    let skip = 0;
    let totalCount = 0;

    do
    {
      const result = await this.getImageApi().imageSearchImages({
        searchParameters: {
          filter: {
            origin: {
              kind: SearchOriginNature.Repositories,
              ids: [ repositoryId ]
            }
          },
          range: {
            take: pageSize,
            skip
          }
        }
      });

      images.push(...result.items);
      totalCount = result.totalCount;
      skip += result.items.length;

      if (result.items.length === 0)
      {
        break;
      }
    }
    while (images.length < totalCount);

    return images;
  }

  private async isBitmapAvailable(image: Image): Promise<boolean>
  {
    try
    {
      await this.getImageApi().imageDownload({ id: image.id });
      return true;
    }
    catch
    {
      return false;
    }
  }

  private async resolveCivitaiImageId(image: Image): Promise<number | undefined>
  {
    const identityFeature = image.features?.find(feature => feature.id === this.extensionId && feature.type === ImageFeatureType.Identity && feature.name === CivitaiExtension.IDENTITY_FEATURE_NAME);
    if (identityFeature !== undefined && typeof identityFeature.value === "string")
    {
      const parsedId = Number.parseInt(identityFeature.value, 10);
      if (!Number.isNaN(parsedId))
      {
        return parsedId;
      }
    }

    const nameWithoutExtension = image.name.replace(/\.[^/.]+$/, "");
    const parsedFromName = Number.parseInt(nameWithoutExtension, 10);
    if (!Number.isNaN(parsedFromName))
    {
      return parsedFromName;
    }

    return undefined;
  }

}

new CivitaiExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
