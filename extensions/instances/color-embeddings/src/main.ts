import {
  Communicator,
  type ImageEmbedding,
  ImageFormat,
  ImageResizeRender,
  NotificationEvent,
  type NotificationValue,
  PicteusExtension,
  type SettingsValue
} from "@picteus/extension-sdk";

import { type ColorLibrary, createColorExtractor } from "./ColorExtractor";
import { generateColorEmbedding } from "./EmbeddingGenerator";


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

  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
    if (event === NotificationEvent.ImageCreated || event === NotificationEvent.ImageUpdated || event === NotificationEvent.ImageComputeEmbeddings)
    {
      const imageId: string = value["id"];
      await this.computeAndStoreEmbeddingImage(communicator, imageId);
    }
    else if (event === NotificationEvent.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      if (commandId === "compute-embeddings")
      {
        const imageIds: string[] = value["imageIds"];
        await this.computeAndStoreEmbeddingsImages(communicator, imageIds);
      }
    }
  }

  private async computeAndStoreEmbeddingsImages(communicator: Communicator, imageIds: string[]): Promise<void>
  {
    const imagesCount = imageIds.length;
    communicator.sendLog(`Computing the color embeddings for ${imagesCount} image(s)`, "info");
    for (let index = 0; index < imagesCount; index++)
    {
      const imageId = imageIds[index];
      try
      {
        await this.computeAndStoreEmbeddingImage(communicator, imageId);
      }
      catch (error)
      {
        communicator.sendLog(`Failed to compute the color embedding for the image with id '${imageId}'. Reason: '${error.message}'`, "warn");
      }
    }
  }

  private async computeAndStoreEmbeddingImage(communicator: Communicator, imageId: string): Promise<void>
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

    communicator.sendLog(`Computed the color embedding for the image with id '${imageId}'`, "info");
  }

  private async setup(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    this.colorLibrary = value["colorLibrary"] as ColorLibrary;
    this.colorCount = value["colorCount"];
    this.usePCA = value["usePCA"];
  }

}

new ColorEmbeddingsExtension().run().catch(console.error);
