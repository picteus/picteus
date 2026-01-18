import { Injectable, StreamableFile } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

import { ImageAttachment, Prisma } from ".prisma/client";

import { logger } from "../logger";
import { computeAttachmentDisposition } from "./utils/downloader";
import { EntitiesProvider } from "./databaseProviders";
import { ExtensionRegistry } from "./extensionRegistry";
import { parametersChecker } from "./utils/parametersChecker";
import { attachmentUriPrefix, fromMimeType, Image, toFileExtension } from "../dtos/app.dtos";

@Injectable()
export class ImageAttachmentService
{

  // We do not use the "@Inject(forwardRef(() => ExtensionsRegistry))", because this causes the https://github.com/microsoft/TypeScript/issues/43981 bug, in terms of metadata JavaScript transpiled code
  constructor(private readonly entitiesProvider: EntitiesProvider, private readonly moduleRef: ModuleRef)
  {
    logger.debug("Instantiating an ImageAttachmentService");
  }

  async create(imageId: string, extensionId: string, mimeType: string, payload: Buffer): Promise<string>
  {
    if (payload.length > Image.ATTACHMENT_MAXIMUM_BINARY_WEIGHT_IN_BYTES)
    {
      parametersChecker.throwBadParameterError(`The provided attachment exceeds the maximum allowed binary weight of ${Image.ATTACHMENT_MAXIMUM_BINARY_WEIGHT_IN_BYTES} bytes`);
    }
    if (this.moduleRef.get(ExtensionRegistry).exists(extensionId) === false)
    {
      parametersChecker.throwBadParameter("extensionId", extensionId, "that extension is not installed");
    }

    // We check the MIME type as much as possible
    const { parse } = await import("file-type-mime");
    const result = parse(payload.buffer as ArrayBuffer);
    if (result === undefined)
    {
      parametersChecker.throwBadParameterError("The payload MIME type cannot be determined");
    }
    else if (result.mime !== mimeType)
    {
      parametersChecker.throwBadParameter("mimeType", mimeType, "the payload MIME type does not match");
    }

    const imageAttachment = await this.entitiesProvider.imageAttachment.create({
      data: {
        imageId,
        extensionId,
        mimeType,
        value: new Uint8Array(payload)
      }
    });
    return attachmentUriPrefix + imageAttachment.id;
  }

  async list(imageId: string): Promise<ImageAttachment[]>
  {
    return this.entitiesProvider.imageAttachment.findMany({ where: { imageId } });
  }

  async download(uri: string): Promise<StreamableFile>
  {
    let id: number;
    let entity: ImageAttachment;
    try
    {
      const result = await this.checkAttachmentUri(uri, false);
      id = result.id;
      entity = result.entity as ImageAttachment;
    }
    catch (error)
    {
      parametersChecker.throwBadParameter("uri", uri, (error as Error).message);
    }
    let fileExtension: string = "";
    {
      try
      {
        const imageFormat = fromMimeType(entity.mimeType);
        if (imageFormat !== undefined)
        {
          fileExtension = `.${toFileExtension(imageFormat)}`;
        }
      }
      catch (error)
      {
        // The attachment MIME type is not an image
      }
    }
    return new StreamableFile(entity.value, {
      type: entity.mimeType,
      disposition: computeAttachmentDisposition(id + fileExtension)
    });
  }

  delete(imageId: string, extensionId: string, toKeepIds: number[]): Prisma.PrismaPromise<Prisma.BatchPayload>
  {
    return this.entitiesProvider.imageAttachment.deleteMany({
      where: { imageId, extensionId, id: { notIn: toKeepIds } }
    });
  }

  async deleteForExtension(extensionId: string): Promise<void>
  {
    await this.entitiesProvider.imageAttachment.deleteMany({
      where: { extensionId }
    });
  }

  async checkAttachmentUri(uri: string, doNotRetrieveValue: boolean): Promise<{
    id: number,
    entity: ImageAttachment | { id: number, imageId: string, extensionId: string }
  }>
  {
    if (uri.startsWith(attachmentUriPrefix) === false)
    {
      throw new Error(`it does not start with '${attachmentUriPrefix}'`);
    }
    const rawId = uri.substring(attachmentUriPrefix.length);
    const id: number = Number.parseInt(rawId, 10);
    if (Number.isNaN(id) === true || (attachmentUriPrefix + id) !== uri)
    {
      throw new Error("its suffix is not an integer");
    }
    const entity = await this.entitiesProvider.imageAttachment.findUnique({
      select: doNotRetrieveValue ? {
        id: true,
        imageId: true,
        extensionId: true
      } : undefined, where: { id }
    });
    if (entity === null)
    {
      throw new Error("there is no attachment with that URI");
    }
    return { id, entity };
  }

}
