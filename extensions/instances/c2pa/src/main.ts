import { C2pa, createC2pa, ResolvedManifestStore } from "c2pa-node";

import {
  Communicator,
  Image,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  NotificationEvent,
  NotificationValue,
  PicteusExtension
} from "@picteus/extension-sdk";


class C2paExtension extends PicteusExtension
{

  protected async onEvent(communicator: Communicator, channel: string, value: NotificationValue): Promise<any>
  {
    if (channel === NotificationEvent.ImageRunCommand)
    {
      // const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      for (const imageId of imageIds)
      {
        const image: Image = await this.getImageApi().imageGet({ id: imageId });
        const blob: Blob = await this.getImageApi().imageDownload({
          id: imageId, stripMetadata: false
        });
        const buffer: Buffer = Buffer.from(await blob.arrayBuffer());
        const c2pa: C2pa = createC2pa();
        const result: ResolvedManifestStore = await c2pa.read({
          buffer,
          mimeType: image.mimeType
        });
        const imageFeatures: Array<ImageFeature> = [];
        if (result !== undefined && result !== null)
        {
          const thumbnail = "thumbnail";
          const promises: Promise<string> [] = [];
          // The algorithm to recursively delete a property on an object is given at from https://stackoverflow.com/questions/31728988/using-javascript-whats-the-quickest-way-to-recursively-remove-properties-and-va
          JSON.parse(JSON.stringify(result, (aKey, aValue): any =>
          {
            if (aKey === thumbnail && Buffer.isBuffer(aValue.data) === true)
            {
              promises.push(new Promise<string>(async (resolve, reject) =>
              {
                this.getImageAttachmentApi().imageattachmentCreate({
                  imageId,
                  extensionId: this.parameters.extensionId,
                  mimeType: aValue.format,
                  body: aValue.data
                }).then(resolve).catch(reject);
              }));
              return undefined;
            }
            else
            {
              return aValue;
            }
          }));
          const attachementIds: string[] = await Promise.all(promises);
          let index: number = 0;
          const metadataValue: Record<string, any> = JSON.parse(JSON.stringify(result, (aKey, aValue): any =>
          {
            if (aKey === thumbnail && Buffer.isBuffer(aValue.data) === true)
            {
              return { format: aValue.format, attachmentId: attachementIds[index++] };
            }
            else
            {
              return aValue;
            }
          }));
          const jsonValue = JSON.stringify(metadataValue);
          imageFeatures.push({
              type: ImageFeatureType.Metadata,
              format: ImageFeatureFormat.Json,
              value: jsonValue
            }
          );
          for (const attachementId of attachementIds)
          {
            imageFeatures.push({
              type: ImageFeatureType.Metadata,
              format: ImageFeatureFormat.Binary,
              value: attachementId
            });
          }
          communicator.sendLog("The image has some CP2A metadata", "info");
        }
        await this.getImageApi().imageSetFeatures({
          id: imageId,
          extensionId: this.parameters.extensionId,
          imageFeature: imageFeatures
        });
      }
    }
  }

}

new C2paExtension().run().catch((error) =>
{
  console.error(error);
  throw error;
});
