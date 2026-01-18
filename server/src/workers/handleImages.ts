import HttpCodes from "http-codes";

import { Image as PersistedImage, Prisma } from ".prisma/client";
import { logger } from "../logger";
import {
  fileWithProtocol,
  ImageFeatureFormat,
  ImageFeatureType,
  RepositoryLocation,
  RepositoryLocationType
} from "../dtos/app.dtos";
import { DualPorts, ImageIdAndFormat, RepositoryIdAndFilePath, toImageFormat } from "../bos";
import { ImageEventAction } from "../notifier";
import { EntitiesProvider } from "../services/databaseProviders";
import { SearchService } from "../services/imageServices";
import { ImageDeclarationManagerEvent } from "../threads/managers";
import { ServiceError } from "../app.exceptions";
import { ErrorCodes } from "../services/utils/parametersChecker";

const { INTERNAL_SERVER_ERROR } = HttpCodes;

// noinspection JSUnusedGlobalSymbols
export async function listFiles({ type, url }: { type: RepositoryLocationType, url: string }): Promise<string []>
{
  logger.info(`Listing the images in the location with URL '${url}'`);
  return await (new SearchService().listFiles(new RepositoryLocation(type, url)));
}

async function computeImageEntities(_ports: DualPorts, repositoryIdAndFileDetails: RepositoryIdAndFilePath): Promise<{
  image: Prisma.ImageCreateInput,
  metadata: Prisma.ImageMetadataCreateWithoutImageInput,
  features: Prisma.ImageFeatureCreateWithoutImageInput[] | undefined
}>
{
  const details = await new SearchService().computeImageDetails(repositoryIdAndFileDetails.filePath, repositoryIdAndFileDetails.sourceUrl);
  const { dimensions, fileDates, metadata, applicationMetadata, ...strippedImage } = details;

  return {
    image:
      {
        ...strippedImage,
        repository: { connect: { id: repositoryIdAndFileDetails.repositoryId } },
        width: details.dimensions.width,
        height: details.dimensions.height,
        fileCreationDate: new Date(fileDates.creationDate),
        fileModificationDate: new Date(fileDates.modificationDate),
        parent: repositoryIdAndFileDetails.parentId === undefined ? undefined : { connect: { id: repositoryIdAndFileDetails.parentId } }
      },
    metadata,
    features: applicationMetadata === undefined ? undefined : applicationMetadata.items.map((item) =>
    {
      return {
        type: ImageFeatureType.RECIPE,
        format: ImageFeatureFormat.JSON,
        extensionId: item.extensionId,
        value: JSON.stringify(item.value)
      };
    })
  };
}

// noinspection JSUnusedGlobalSymbols
export async function declareImage({ ports, repositoryIdAndFilePath }: {
  ports: DualPorts,
  repositoryIdAndFilePath: RepositoryIdAndFilePath
}): Promise<ImageIdAndFormat>
{
  const imageEntities = await computeImageEntities(ports, repositoryIdAndFilePath);
  const { image, metadata, features } = imageEntities;
  logger.info(`Inserting the image in file '${repositoryIdAndFilePath.filePath}' in the repository with id '${repositoryIdAndFilePath.repositoryId}' and in the location with URL '${image.url}'`);
  const entitiesProvider = new EntitiesProvider();
  await entitiesProvider.initialize();
  const persistedImage = await entitiesProvider.images.create({
    data:
      {
        ...image,
        metadata: { create: metadata }
      }
  });
  if (features !== undefined)
  {
    // We are declaring the recipes related to the application metadata
    logger.info(`Inserting the features extracted from the application metadata for the image in the location with URL '${image.url}'`);
    await entitiesProvider.imageFeature.createMany({
      data: features.map(feature =>
      {
        return { imageId: persistedImage.id, ...feature };
      })
    });
  }
  return { id: persistedImage.id, format: toImageFormat(imageEntities.image.format) };
}

// noinspection JSUnusedGlobalSymbols
export async function synchronizeImage({ ports, repositoryIdAndFilePath }: {
  ports: DualPorts,
  repositoryIdAndFilePath: RepositoryIdAndFilePath
}): Promise<ImageDeclarationManagerEvent>
{
  logger.info(`Synchronizing the image in file '${repositoryIdAndFilePath.filePath}' in the repository with id '${repositoryIdAndFilePath.repositoryId}'`);

  const entitiesProvider = new EntitiesProvider();
  await entitiesProvider.initialize();
  const imageDelegate = entitiesProvider.images;
  const image = await imageDelegate.findFirst({ where: { url: fileWithProtocol + repositoryIdAndFilePath.filePath } });
  if (image === null)
  {
    // The image does not exist
    const imageIdAndFormat: ImageIdAndFormat = await declareImage({ ports, repositoryIdAndFilePath });
    return {
      action: ImageEventAction.Created,
      id: imageIdAndFormat.id,
      format: imageIdAndFormat.format
    };
  }
  else
  {
    // The image already exists
    return await internalUpdateImage(ports, repositoryIdAndFilePath, imageDelegate, image);
  }
}

// noinspection JSUnusedGlobalSymbols
export async function updateImage({ ports, repositoryIdAndFilePath }: {
  ports: DualPorts,
  repositoryIdAndFilePath: RepositoryIdAndFilePath
}): Promise<ImageIdAndFormat>
{
  logger.info(`Updating the image in file '${repositoryIdAndFilePath.filePath}' in the repository with id '${repositoryIdAndFilePath.repositoryId}'`);

  const entitiesProvider = new EntitiesProvider();
  await entitiesProvider.initialize();
  const imageDelegate = entitiesProvider.images;
  const url = fileWithProtocol + repositoryIdAndFilePath.filePath;
  const image: PersistedImage | null = await imageDelegate.findFirst({ where: { url: url } });
  if (image === null)
  {
    throw new ServiceError(`The image with URL '${url}' does not exist`, INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_SERVER_ERROR);
  }
  return await internalUpdateImage(ports, repositoryIdAndFilePath, imageDelegate, image);
}

async function internalUpdateImage(ports: DualPorts, repositoryIdAndFilePath: RepositoryIdAndFilePath, imageDelegate: Prisma.ImageDelegate, initialImage: PersistedImage): Promise<ImageDeclarationManagerEvent>
{
  const imageStats = new SearchService().computeImageStats(repositoryIdAndFilePath.filePath);
  const { fileDates } = imageStats;
  let action: ImageEventAction | undefined = undefined;
  if (fileDates.modificationDate === initialImage.fileModificationDate.getTime())
  {
    logger.debug(`The file with URL '${initialImage.url}' and with id '${initialImage.id}' has not changed`);
  }
  else
  {
    logger.debug(`The file with URL '${initialImage.url}' and with id '${initialImage.id}' has changed`);
    const { metadata, image } = await computeImageEntities(ports, repositoryIdAndFilePath);
    const imageUpdateInput: Prisma.ImageUpdateInput =
      {
        ...image,
        metadata: { update: metadata }
      };
    logger.info(`Updating the image in the location with URL '${initialImage.url}'`);
    await imageDelegate.update({
      where: { id: initialImage.id },
      data: imageUpdateInput,
      include: { metadata: true, features: true }
    });
    action = ImageEventAction.Updated;
  }
  return { action, id: initialImage.id, format: toImageFormat(initialImage.format) };
}
