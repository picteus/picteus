import {
  color,
  CommandParameters,
  Communicator,
  type ImageEmbedding,
  type ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFormat,
  ImageResizeRender,
  PicteusExtension,
  type SettingsValue,
  Shape,
  Size,
  UiContainer
} from "@picteus/extension-sdk";

import { type ColorLibrary, createColorExtractor, RGBColor, rgbToHex } from "./ColorExtractor";
import { generateColorEmbedding } from "./EmbeddingGenerator";


const DOMINANT_COLOR_FEATURE_NAME_PREFIX = "dominant-colors";


class ColorEmbeddingsExtension extends PicteusExtension
{

  private colorLibrary: ColorLibrary;

  private colorCount: number;

  private usePCA: boolean;

  private hasWarnedAboutPCA: boolean;

  protected async onReady(_communicator?: Communicator): Promise<void>
  {
    await this.setup(await this.getSettings());
  }

  protected async onSettings(_communicator: Communicator, value: SettingsValue): Promise<void>
  {
    await this.setup(value);
  }

  protected async onImageCreated(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeAndStoreEmbeddingsAndFeatures(communicator, imageId);
  }

  protected async onImageUpdated(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeAndStoreEmbeddingsAndFeatures(communicator, imageId);
  }

  protected async onComputeImageFeatures(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.storeFeatures(imageId, await this.extractColors(imageId));
  }

  protected async onComputeImageEmbeddings(_communicator: Communicator, imageId: string): Promise<void>
  {
    await this.storeEmbeddings(imageId, await this.extractColors(imageId));
  }

  protected async onImagesCommand(communicator: Communicator, commandId: string, imageIds: string[], _parameters: CommandParameters): Promise<void>
  {
    if (commandId === "compute")
    {
      const imagesCount = imageIds.length;
      communicator.sendLog(`Computing the color embeddings and features for ${imagesCount} image(s)`, "info");
      for (const imageId of imageIds)
      {
        try
        {
          await this.computeAndStoreEmbeddingsAndFeatures(communicator, imageId);
        }
        catch (error)
        {
          communicator.sendLog(`Failed to compute the color data for the image with id '${imageId}'. Reason: '${error.message}'`, "warn");
        }
      }
    }
  }

  private async computeAndStoreEmbeddingsAndFeatures(communicator: Communicator, imageId: string): Promise<void>
  {
    if (this.usePCA === true && this.hasWarnedAboutPCA === false)
    {
      communicator.sendLog("PCA dimensionality reduction is not implemented in this version of the extension: the full embedding vector will be used instead", "warn");
      this.hasWarnedAboutPCA = true;
    }
    const colors = await this.extractColors(imageId);
    await this.storeEmbeddings(imageId, colors);
    await this.storeFeatures(imageId, colors);
    communicator.sendLog(`Computed the color embedding and dominant color features for the image with id '${imageId}'`, "info");
  }

  private async storeEmbeddings(imageId: string, colors: RGBColor[]): Promise<void>
  {
    const embeddingValues = generateColorEmbedding(colors, this.colorCount);
    const existingEmbeddings: ImageEmbedding[] = (await this.getImageApi().imageGetEmbeddings({
      id: imageId,
      extensionId: this.extensionId
    })).embeddings;
    const embeddingsByName = new Map(existingEmbeddings.map((embedding) => [ embedding.name, embedding ]));
    const embeddingName = "color";
    embeddingsByName.set(embeddingName, { name: embeddingName, values: embeddingValues });
    await this.getImageApi().imageSetEmbeddings({
      id: imageId,
      extensionId: this.extensionId,
      imageEmbedding: Array.from(embeddingsByName.values())
    });
  }

  private async storeFeatures(imageId: string, colors: RGBColor[]): Promise<void>
  {
    const dominantColorFeatures: ImageFeature[] = colors.slice(0, this.colorCount).map((color, index) =>
      ({
        type: ImageFeatureType.Physics,
        format: ImageFeatureFormat.String,
        name: `${DOMINANT_COLOR_FEATURE_NAME_PREFIX}-${index + 1}`,
        value: rgbToHex(color)
      }));

    const uiFeature: ImageFeature =
      {
        type: ImageFeatureType.Physics,
        format: ImageFeatureFormat.Ui,
        name: DOMINANT_COLOR_FEATURE_NAME_PREFIX,
        value: this.computeFeatureUiContainer(colors).toString()
      };

    await this.getImageApi().imageSetFeatures(
      {
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: [ ...dominantColorFeatures, uiFeature ]
      }
    );
  }

  private async extractColors(imageId: string): Promise<RGBColor[]>
  {
    const imageBlob = await this.getImageApi().imageDownload({
      id: imageId,
      format: ImageFormat.Png,
      width: 512,
      height: 512,
      resizeRender: ImageResizeRender.Outbox,
      stripMetadata: true
    });
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
    return await createColorExtractor(this.colorLibrary).extractColors(imageBuffer, this.colorCount);
  }

  private computeFeatureUiContainer(colors: RGBColor[]): UiContainer
  {
    const hexColors = colors.slice(0, this.colorCount).map((colorItem) => rgbToHex(colorItem));
    return UiContainer.builder().addFlowing(hexColors.map((hexColor) => color(hexColor, {
      shape: Shape.square,
      size: Size.large,
      modifiers: { copyable: true }
    }))).build();
  }

  private async setup(value: SettingsValue): Promise<void>
  {
    this.colorLibrary = value["colorLibrary"] as ColorLibrary ?? "color-thief";
    this.colorCount = value["colorCount"] ?? 8;
    this.usePCA = value["usePCA"] !== undefined ? value["usePCA"] : false;
  }

}

new ColorEmbeddingsExtension().run().catch(console.error);
