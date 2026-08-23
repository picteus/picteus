import * as path from "path";
import * as fs from "fs";
import { Log } from "ts-tiny-log";
import { LogLevel } from "ts-tiny-log/levels";

import {
  Communicator,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageResizeRender,
  PicteusExtension
} from "@picteus/extension-sdk";

import { Classifiers } from "./classifiers";


class FeaturesTransformersExtension extends PicteusExtension
{

  private readonly classifiers: Classifiers = new Classifiers(new Log({
    level: LogLevel.debug,
    shouldWriteTimestamp: true
  }), path.join(PicteusExtension.getCacheDirectoryPath()));


  protected async onImageCreated(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeFeatures(communicator, imageId);
  }

  protected async onImageUpdated(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeFeatures(communicator, imageId);
  }

  protected async onComputeImageFeatures(communicator: Communicator, imageId: string): Promise<void>
  {
    await this.computeFeatures(communicator, imageId);
  }

  private async computeFeatures(communicator: Communicator, imageId: any): Promise<void>
  {
    const filePath = await this.getImageBuffer(communicator, imageId);
    try
    {
      const caption = await this.computeCaption(communicator, imageId, filePath);
      await this.getImageApi().imageSetFeatures({
        id: imageId,
        extensionId: this.extensionId,
        imageFeature: [ { type: ImageFeatureType.Caption, format: ImageFeatureFormat.String, value: caption } ]
      });
    }
    finally
    {
      fs.rmSync(filePath);
    }
  }

  async getImageBuffer(communicator: Communicator, imageId: string): Promise<string>
  {
    communicator.sendLog(`Downloading the bitmap for the image with id '${imageId}'`, "info");
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

  private async computeCaption(communicator: Communicator, imageId: string, filePath: string): Promise<string>
  {
    communicator.sendLog(`Computing the caption for the image with id '${imageId}'`, "info");
    const caption = await this.classifiers.computeCaption(filePath);
    communicator.sendLog(`The image caption is '${caption}'`, "debug");
    return caption;
  }

}

new FeaturesTransformersExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
