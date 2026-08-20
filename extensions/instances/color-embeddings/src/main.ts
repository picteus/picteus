import {
  Communicator,
  EventName,
  type EventValue,
  type ImageEmbedding,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  PicteusExtension,
  type SettingsValue
} from "@picteus/extension-sdk";

import { type ColorLibrary, createColorExtractor, rgbToHex } from "./ColorExtractor";
import { generateColorEmbedding } from "./EmbeddingGenerator";


const DOMINANT_COLOR_FEATURE_NAME_PREFIX = "dominant-color-";


class ColorEmbeddingsExtension extends PicteusExtension
{

  private colorLibrary: ColorLibrary;

  private colorCount: number;

  private usePCA: boolean;

  private hasWarnedAboutPCA: boolean;

  protected async onReady(communicator?: Communicator): Promise<void>
  {
    await this.setup(communicator!, await this.getSettings());
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(communicator, value);
  }

  protected async onEvent(communicator: Communicator, event: EventName, value: EventValue): Promise<any>
  {
    if (event === EventName.ImageCreated || event === EventName.ImageUpdated || event === EventName.ImageComputeEmbeddings || event === EventName.ImageComputeFeatures)
    {
      const imageId: string = value["id"];
      await this.computeAndStoreColorDataImage(communicator, imageId);
    }
    else if (event === EventName.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      if (commandId === "computeEmbeddings")
      {
        const imageIds: string[] = value["imageIds"];
        await this.computeAndStoreColorDataImages(communicator, imageIds);
      }
    }
  }

  private async computeAndStoreColorDataImages(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    const imagesCount = imageIds.length;
    communicator.sendLog(`Computing the color embeddings and features for ${imagesCount} image(s)`, "info");
    for (let index = 0; index < imagesCount; index++)
    {
      const imageId = imageIds[index];
      try
      {
        await this.computeAndStoreColorDataImage(communicator, imageId);
      }
      catch (error)
      {
        communicator.sendLog(`Failed to compute the color data for the image with id '${imageId}'. Reason: '${error.message}'`, "warn");
      }
    }
  }

  private async computeAndStoreColorDataImage(communicator: Communicator, imageId: string): Promise<void>
  {
    if (this.usePCA === true && this.hasWarnedAboutPCA === false)
    {
      communicator.sendLog("PCA dimensionality reduction is not implemented in this version of the extension: the full embedding vector will be used instead", "warn");
      this.hasWarnedAboutPCA = true;
    }

    const imageBlob = await this.getImageApi().imageDownload({
      id: imageId,
      format: ImageFormat.Png,
      width: 512,
      height: 512,
      resizeRender: ImageResizeRender.Outbox,
      stripMetadata: true
    });
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());

    const colorExtractor = createColorExtractor(this.colorLibrary);
    const colors = await colorExtractor.extractColors(imageBuffer, this.colorCount);
    const embeddingValues = generateColorEmbedding(colors, this.colorCount);

    let existingEmbeddings: ImageEmbedding[];
    try
    {
      existingEmbeddings = (await this.getImageApi().imageGetEmbeddings({
        id: imageId,
        extensionId: this.extensionId
      })).embeddings;
    }
    catch (error)
    {
      communicator.sendLog(`Could not retrieve the existing embeddings for the image with id '${imageId}': it will be overwritten. Reason: '${error.message}'`, "warn");
      existingEmbeddings = [];
    }

    const embeddingsByName = new Map(existingEmbeddings.map((embedding) => [ embedding.name, embedding ]));
    const embeddingName = "color";
    embeddingsByName.set(embeddingName, { name: embeddingName, values: embeddingValues });

    await this.getImageApi().imageSetEmbeddings({
      id: imageId,
      extensionId: this.extensionId,
      imageEmbedding: Array.from(embeddingsByName.values())
    });

    const dominantColorFeatures: ImageFeature[] = colors.slice(0, this.colorCount).map((color, index) => ({
      type: ImageFeatureType.Annotation,
      format: ImageFeatureFormat.String,
      name: `${DOMINANT_COLOR_FEATURE_NAME_PREFIX}${index + 1}`,
      value: rgbToHex(color)
    }));

    let existingFeatures: ImageFeature[];
    try
    {
      existingFeatures = await this.getImageApi().imageGetFeatures({
        id: imageId,
        extensionId: this.extensionId
      });
    }
    catch (error)
    {
      communicator.sendLog(`Could not retrieve the existing features for the image with id '${imageId}': they will be overwritten. Reason: '${error.message}'`, "warn");
      existingFeatures = [];
    }

    const otherFeatures = existingFeatures.filter((feature) => feature.name?.startsWith(DOMINANT_COLOR_FEATURE_NAME_PREFIX) !== true);

    await this.getImageApi().imageSetFeatures({
      id: imageId,
      extensionId: this.extensionId,
      imageFeature: [ ...otherFeatures, ...dominantColorFeatures ]
    });

    communicator.sendLog(`Computed the color embedding and dominant color features for the image with id '${imageId}'`, "info");
  }

  private async setup(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    this.colorLibrary = value["colorLibrary"] as ColorLibrary;
    this.colorCount = value["colorCount"];
    this.usePCA = value["usePCA"];
  }

}

new ColorEmbeddingsExtension().run().catch(console.error);
