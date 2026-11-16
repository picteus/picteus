import * as path from "path";
import * as fs from "fs";
import { Log } from "ts-tiny-log";
import { LogLevel } from "ts-tiny-log/levels";

import {
  AiModelModality,
  Communicator,
  type ComputeImageCaption,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageResizeRender,
  PicteusExtension
} from "@picteus/extension-sdk";

import { Classifiers } from "./classifiers";


class FeaturesTransformersExtension extends PicteusExtension
{

  private static readonly modelTechnicalId = "vit-gpt2-image-captioning";

  private readonly classifiers: Classifiers = new Classifiers(new Log({
    level: LogLevel.debug,
    shouldWriteTimestamp: true
  }), path.join(PicteusExtension.getCacheDirectoryPath()));


  protected async onReady(_communicator?: Communicator): Promise<void>
  {
    await this.sendAvailableAiModels();
  }

  protected async onComputeImageCaptions(communicator: Communicator, imageId: string, captions: ComputeImageCaption[]): Promise<void>
  {
    await this.computeFeatures(communicator, imageId);
  }

  private async computeFeatures(communicator: Communicator, imageId: any): Promise<void>
  {
    const filePath = await this.getImageBuffer(communicator, imageId);
    try
    {
      const caption = await this.computeCaption(communicator, filePath);
      await this.getImageApi().imageSetFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: [ {
          type: ImageFeatureType.Caption,
          format: ImageFeatureFormat.String,
          name: "vit-gpt2-image-captioning",
          value: caption
        } ]
      });
    }
    finally
    {
      fs.rmSync(filePath);
    }
  }

  async getImageBuffer(communicator: Communicator, imageId: string): Promise<string>
  {
    communicator.sendLog(`Downloading the bitmap for the image`, "info");
    const blob: Blob = await this.getImageApi().imageDownload({
      id: imageId,
      format: "PNG",
      width: 1_024,
      height: 1_024,
      resizeRender: ImageResizeRender.Outbox,
      stripMetadata: true
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    const filePath = path.join(".", `${imageId}.png`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  private async computeCaption(communicator: Communicator, filePath: string): Promise<string>
  {
    communicator.sendLog(`Computing the caption for the image`, "info");
    const caption = await this.classifiers.computeCaption(filePath);
    communicator.sendLog(`The image caption is '${caption}'`, "debug");
    return caption;
  }

  private async sendAvailableAiModels(): Promise<void>
  {
    await this.getExtensionApi().extensionSetAiModels({
      id: this.extensionId,
      aiModel: [
        {
          technicalId: FeaturesTransformersExtension.modelTechnicalId,
          name: "ViT-GPT2",
          comment: "Image captioning via ViT-GPT2 transformer model",
          modalities: [ AiModelModality.ImageCaptions ]
        }
      ]
    });
  }

}

new FeaturesTransformersExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
