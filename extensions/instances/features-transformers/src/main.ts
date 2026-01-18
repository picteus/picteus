import * as path from "path";
import * as fs from "fs";
import { Log } from "ts-tiny-log";
import { LogLevel } from "ts-tiny-log/levels";

import {
  Communicator,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageResizeRender,
  NotificationEvent,
  NotificationValue,
  PicteusExtension
} from "@picteus/extension-sdk";
import { Classifiers } from "./classifiers";


class FeaturesTransformersExtension extends PicteusExtension
{

  private readonly classifiers: Classifiers = new Classifiers(new Log({
    level: LogLevel.debug,
    shouldWriteTimestamp: true
  }), path.join(PicteusExtension.getCacheDirectoryPath()));

  protected async onEvent(communicator: Communicator, channel: string, value: NotificationValue): Promise<any>
  {
    if (channel === NotificationEvent.ImageCreated || channel === NotificationEvent.ImageUpdated || channel === NotificationEvent.ImageComputeFeatures)
    {
      const imageId = value["id"];

      const getImageBuffer = async (imageId: string): Promise<string> =>
      {
        communicator.sendLog(`Downloading the bitmap for the image with id '${imageId}'`, "info");
        const blob: Blob = await this.getImageApi().imageDownload({
          id: imageId,
          format: "PNG",
          width: 1_024,
          resizeRender: ImageResizeRender.Inbox,
          stripMetadata: true
        });
        const buffer = Buffer.from(await blob.arrayBuffer());
        const filePath = path.join(".", `${imageId}.png`);
        fs.writeFileSync(filePath, buffer);
        return filePath;
      };

      const computeCaption = async (imageId: string, filePath: string): Promise<string> =>
      {
        communicator.sendLog(`Computing the caption for the image with id '${imageId}'`, "info");
        const caption = await this.classifiers.computeCaption(filePath);
        communicator.sendLog(`The image caption is '${caption}'`, "debug");
        return caption;
      };

      const setFeatures = async (imageId: string, caption: string): Promise<void> =>
      {
        await this.getImageApi().imageSetFeatures({
          id: imageId,
          extensionId: this.extensionId,
          imageFeature: [{ type: ImageFeatureType.Caption, format: ImageFeatureFormat.String, value: caption }]
        });
      };

      const handleImage = async (imageId: string): Promise<void> =>
      {
        const filePath = await getImageBuffer(imageId);
        try
        {
          const caption = await computeCaption(imageId, filePath);
          await setFeatures(imageId, caption);
        }
        finally
        {
          fs.rmSync(filePath);
        }
      };

      await handleImage(imageId);
    }
  }

}

new FeaturesTransformersExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
