import path from "node:path";
import fs from "node:fs";
import stream from "node:stream";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ModuleRef } from "@nestjs/core";
import { forwardRef, Inject, Injectable, StreamableFile } from "@nestjs/common";
import { fdir } from "fdir";
import { XMLValidator } from "fast-xml-parser";

import {
  Image as PersistedImage,
  ImageFeature as PersistedImageFeature,
  ImageMetadata as PersistedImageMetadata,
  ImageTag as PersistedImageTag,
  Prisma
} from ".prisma/client";
import { logger } from "../logger";
import { paths } from "../paths";
import { plainToInstanceViaJSON } from "../utils";
import { computeAttachmentDisposition } from "./utils/downloader";
import { parametersChecker, StringNature } from "./utils/parametersChecker";
import { fileMetadata } from "./utils/fileMetadata";
import { Resizer } from "../resizer";
import {
  AllExtensionImageTags,
  AllImageEmbeddings,
  AllImageFeatures,
  ApplicationMetadata,
  computeImageFormatsExtensions,
  Dates,
  ExtensionImageEmbeddings,
  ExtensionImageFeature,
  ExtensionImageTag,
  FieldLengths,
  fileWithProtocol,
  GenerationRecipe,
  Image,
  ImageDimensions,
  ImageDistance,
  ImageDistances,
  ImageEmbeddings,
  ImageFeature,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFeatureValue,
  ImageFormat,
  ImageFormats,
  ImageMediaUrl,
  ImageMetadata,
  ImageResizeRender,
  ImageSummary,
  ImageSummaryList,
  ImageTag,
  NumericRange,
  RepositoryLocation,
  RepositoryLocationType,
  SearchCriteria,
  SearchRange,
  SearchSorting,
  SearchSortingProperty,
  toFileExtension,
  toMimeType
} from "../dtos/app.dtos";
import { Json, toImageFormat } from "../bos";
import {
  EntitiesProvider,
  ImageIdAndDistance,
  VectorDatabaseAccessor,
  VectorDatabaseProvider
} from "./databaseProviders";
import { ExtendedManifest, ExtensionRegistry } from "./extensionRegistry";
import { ExtensionService } from "./extensionServices";
import { RepositoryService } from "./repositoryService";
import { GenerativeAIService } from "./aiServices";
import { ImageDeclarationManager } from "../threads/managers";
import { RepositoryWatcher } from "./utils/repositoryWatcher";
import {
  computeFormat,
  FormatAndBuffer,
  ImageMiscellaneousMetadata,
  readApplicationMetadata,
  readMetadata,
  resize,
  stripMetadata as imageStripMetadata,
  supportsApplicationMedata
} from "./utils/images";
import { ImageAttachmentService } from "./imageAttachmentService";

export { EntitiesProvider, VectorDatabaseProvider, VectorDatabaseAccessor, RepositoryService };


const imageWithIncludes = { include: { metadata: true, features: true, tags: true } } satisfies Prisma.ImageDefaultArgs;

type ImageWithIncludes = Prisma.ImageGetPayload<typeof imageWithIncludes>

@Injectable()
export class ImageService
{

  private static readonly DESCRIPTION_AND_COMMENTS_FEATURES_ALLOWED_FORMATS = [ImageFeatureFormat.STRING, ImageFeatureFormat.MARKDOWN, ImageFeatureFormat.HTML];

  private static readonly RECIPE_FEATURES_ALLOWED_FORMATS = [ImageFeatureFormat.JSON];

  public static readonly emptyImageTag = "";

  private static readonly emptyImageFeatureValue = "";

  constructor(private readonly entitiesProvider: EntitiesProvider, private readonly vectorDatabaseAccessor: VectorDatabaseAccessor, @Inject(forwardRef(() => ExtensionRegistry)) private readonly extensionsRegistry: ExtensionRegistry, private readonly moduleRef: ModuleRef)
  {
    logger.debug("Instantiating an ImageService");
  }

  async search(repositoryIds?: string[], criteria?: SearchCriteria, sorting?: SearchSorting, range?: SearchRange): Promise<ImageSummaryList>
  {
    const keyword = criteria?.keyword;
    const tags = criteria?.tags;
    const properties = criteria?.properties;
    const text = keyword?.text;
    const widthRange = properties?.width;
    const heightRange = properties?.height;
    const weightInBytesRange = properties?.weightInBytes;
    const creationDateRange = properties?.creationDate;
    const modificationDateRange = properties?.modificationDate;
    logger.info(`Listing the images${repositoryIds === undefined ? "" : ` with a repository id in list [${repositoryIds.map(id => `'${id}'`).join(",")}]`}` + `${keyword === undefined ? "" : (` containing the text '${text}'` + " present in the [" + ([keyword.inName === false ? "" : "file name", keyword.inFeatures === false ? "" : "features", keyword.inMetadata === false ? "" : "metadata"].filter(string => string.length > 0).join(", ")) + "]")}` + `${tags === undefined ? "" : (`, with the tags [${tags.values.map(value => `'${value}'`).join(", ")}]`)}` + `${widthRange === undefined ? "" : (", with " + widthRange.toEntityString("width"))}` + `${heightRange === undefined ? "" : (", with " + heightRange.toEntityString("height"))}` + `${weightInBytesRange === undefined ? "" : (", with " + weightInBytesRange.toEntityString("binary weight"))}` + `${creationDateRange === undefined ? "" : (", with " + creationDateRange.toEntityString("creation date"))}` + `${modificationDateRange === undefined ? "" : (", with " + modificationDateRange.toEntityString("modification date"))}` + (sorting === undefined ? "" : ` sorted by '${sorting.property}' in ${sorting.isAscending === true ? "ascending" : "descending"} order`) + ((range === undefined || range.take === undefined) ? "" : ` with a range of [${range.skip}, ${range.take}]`));

    if (keyword !== undefined && (keyword.inName === false && keyword.inMetadata === false && keyword.inFeatures === false))
    {
      parametersChecker.throwBadParameter("keyword", undefined, "it contains only false properties");
    }
    let orderProperty: keyof Prisma.ImageOrderByWithRelationInput;
    if (sorting === undefined)
    {
      orderProperty = "name";
    }
    else
    {
      const sortingProperty = sorting.property;
      // noinspection FallThroughInSwitchStatementJS
      switch (sortingProperty)
      {
        default:
          parametersChecker.throwBadParameter("sorting.property", sortingProperty, "its value is not handled");
        case SearchSortingProperty.Name:
          orderProperty = "name";
          break;
        case SearchSortingProperty.CreationDate:
          orderProperty = "fileCreationDate";
          break;
        case SearchSortingProperty.ModificationDate:
          orderProperty = "fileModificationDate";
          break;
        case SearchSortingProperty.ImportDate:
          orderProperty = "creationDate";
          break;
        case SearchSortingProperty.UpdateDate:
          orderProperty = "modificationDate";
          break;
        case SearchSortingProperty.BinarySize:
          orderProperty = "sizeInBytes";
          break;
        case SearchSortingProperty.Width:
          orderProperty = "width";
          break;
        case SearchSortingProperty.Height:
          orderProperty = "height";
          break;
      }
    }
    const orderBy = { [orderProperty]: (sorting === undefined || sorting.isAscending === undefined || sorting.isAscending === true) ? Prisma.SortOrder.asc : Prisma.SortOrder.desc };
    const keyworkInput: Prisma.ImageWhereInput [] | undefined = (keyword === undefined || text === undefined || text === "") ? undefined : [];
    if (keyword !== undefined && keyworkInput !== undefined)
    {
      if (keyword.inName === true)
      {
        keyworkInput.push({ name: { contains: text } });
      }
      if (keyword.inMetadata === true)
      {
        keyworkInput.push({ metadata: { all: { contains: text } } });
      }
      if (keyword.inFeatures === true)
      {
        keyworkInput.push({ features: { some: { value: { contains: text } } } });
      }
    }
    const tagsFilter: Prisma.ImageTagListRelationFilter | undefined = tags === undefined ? undefined : {};
    if (tags !== undefined && tagsFilter !== undefined)
    {
      tagsFilter.some = { value: { in: tags.values } };
    }
    const [widthFilter, heightFilter, weightInBytesFilter] = [widthRange, heightRange, weightInBytesRange].map((range) =>
    {
      const filter: Prisma.IntFilter<"Image"> | undefined = range === undefined ? undefined : {};
      if (range !== undefined && filter !== undefined)
      {
        if (range.minimum !== undefined)
        {
          filter.gte = range.minimum;
        }
        if (range.maximum !== undefined)
        {
          filter.lte = range.maximum;
        }
      }
      return filter;
    });
    const [creationDateFilter, modificationDateFilter] = [creationDateRange, modificationDateRange].map((range) =>
    {
      const filter: Prisma.DateTimeFilter<"Image"> | undefined = range === undefined ? undefined : {};
      if (range !== undefined && filter !== undefined)
      {
        if (range.minimum !== undefined)
        {
          filter.gte = new Date(range.minimum);
        }
        if (range.maximum !== undefined)
        {
          filter.lte = new Date(range.maximum);
        }
      }
      return filter;
    });
    const where: Prisma.ImageWhereInput =
      {
        repositoryId: repositoryIds === undefined ? undefined : { in: repositoryIds },
        format: criteria?.formats === undefined ? undefined : { in: criteria?.formats },
        tags: tagsFilter,
        width: widthFilter,
        height: heightFilter,
        sizeInBytes: weightInBytesFilter,
        creationDate: creationDateFilter,
        modificationDate: modificationDateFilter,
        AND: { OR: keyworkInput }
      };
    const [entities, totalCount] = await this.entitiesProvider.prisma.$transaction([
      this.entitiesProvider.images.findMany({
        where,
        take: range?.take,
        skip: range?.skip,
        orderBy
      }),
      this.entitiesProvider.images.count({ where })
    ]);
    return new ImageSummaryList(plainToInstance(ImageSummary, entities.map((entity) =>
    {
      return this.toDto(entity, undefined, undefined, undefined);
    })), totalCount);
  }

  async get(id: string): Promise<Image>
  {
    logger.info(`Getting the image with id '${id}'`);
    const entity: ImageWithIncludes = await this.getPersistedImage(id, true, true, true);
    return plainToInstanceViaJSON(Image, this.toDto(entity, entity.metadata as PersistedImageMetadata, entity.features, entity.tags));
  }

  async getImageByUrl(url: string): Promise<Image>
  {
    logger.info(`Getting the image with URL '${url}'`);
    const entity = await this.entitiesProvider.images.findFirst({
      where: { url },
      include: { metadata: true, features: true, tags: true }
    });
    if (entity === null)
    {
      parametersChecker.throwBadParameter("url", url, `there is no image with id '${url}'`);
    }
    return plainToInstanceViaJSON(Image, this.toDto(entity as PersistedImage, entity.metadata as PersistedImageMetadata, entity.features, entity.tags));
  }

  async synchronize(id: string): Promise<Image>
  {
    logger.info(`Synchronizing the image with id '${id}'`);
    await this.getPersistedImage(id, false, false, false);
    const manifests: ExtendedManifest[] = await this.extensionsRegistry.list(false);
    const extensionService: ExtensionService = this.moduleRef.get(ExtensionService);
    for (const manifest of manifests)
    {
      await extensionService.synchronizeImage(manifest, id);
    }
    const entity: ImageWithIncludes = await this.getPersistedImage(id, true, true, true);
    return plainToInstanceViaJSON(Image, this.toDto(entity, entity.metadata as PersistedImageMetadata, entity.features, entity.tags));
  }

  async modify(id: string, buffer: Buffer): Promise<Image>
  {
    logger.info(`Modifying the image with id '${id}'"}`);
    this.checkImageBinaryWeight(buffer);
    const entity = await this.getPersistedImage(id, false, false, false);
    let updatedImageFormat;
    try
    {
      updatedImageFormat = await computeFormat(buffer);
    }
    catch (error)
    {
      parametersChecker.throwBadParameterError(`The provided file is not a supported image. Reason: '${(error as Error).message}'`);
    }
    const imageFormat = toImageFormat(entity.format);
    if (updatedImageFormat !== imageFormat)
    {
      parametersChecker.throwBadParameterError(`Cannot change the image format '${imageFormat}' into '${updatedImageFormat}'`);
    }
    const repositoryEntity = await this.moduleRef.get(RepositoryService).getRepository(entity.repositoryId);
    const filePath = entity.url.substring(fileWithProtocol.length);
    const repositoryDirectoryPath = repositoryEntity.url.substring(fileWithProtocol.length);
    const relativeFilePath = filePath.substring(repositoryDirectoryPath.length + 1);
    return RepositoryWatcher.ignore<Image>(entity.repositoryId, relativeFilePath, async () =>
    {
      fs.writeFileSync(filePath, buffer);
      const imageDeclarationManager = new ImageDeclarationManager(1);
      try
      {
        const imageId = (await imageDeclarationManager.updateImage({ repositoryId: repositoryEntity.id, filePath })).id;
        return await this.get(imageId);
      }
      finally
      {
        await imageDeclarationManager.destroy();
      }
    });
  }

  async delete(id: string): Promise<void>
  {
    logger.info(`Deleting the image with id '${id}'"}`);
    const entity = await this.getPersistedImage(id, false, false, false);
    const repositoryEntity = await this.moduleRef.get(RepositoryService).getRepository(entity.repositoryId);
    if (repositoryEntity.type !== RepositoryLocationType.File)
    {
      parametersChecker.throwBadParameterError(`Cannot delete an image belonging to a repository with a type different from '${RepositoryLocationType.File}'`);
    }
    const filePath = entity.url.substring(fileWithProtocol.length);
    fs.rmSync(filePath);
  }

  async download(id: string, format: ImageFormat | undefined = undefined, width: number | undefined = undefined, height: number | undefined = undefined, resizeRender: ImageResizeRender | undefined = ImageResizeRender.Inbox, stripMetadata: boolean = false): Promise<StreamableFile>
  {
    logger.info(`Downloading the image with id '${id}'${format === undefined ? "" : ` in '${format}' format`}${width === undefined ? "" : ` with a width of ${width} pixels`}${height === undefined ? "" : ` with a height of ${height} pixels`}${resizeRender === undefined ? "" : ` with a resize render set to '${resizeRender}`} ${stripMetadata === true ? "without its metadata" : "with its metadata"}`);
    const requiresResize = width !== undefined || height !== undefined;
    if (requiresResize === true && stripMetadata === false)
    {
      parametersChecker.throwBadParameter("stripMetadata", stripMetadata + "", "it must be set to 'true' when the 'width' or 'height' parameter is defined");
    }
    const entity = await this.getPersistedImage(id, false, false, false);
    const originalFormat = toImageFormat(entity.format);
    const requestedFormat = format ?? originalFormat;
    if (requestedFormat !== originalFormat && stripMetadata === false)
    {
      parametersChecker.throwBadParameter("stripMetadata", stripMetadata + "", "it must be set to 'true' when the 'format' parameter is different from the original image format");
    }
    const mimeType = toMimeType(requestedFormat);
    const filePath = entity.url.substring(fileWithProtocol.length);
    let alreadyResized = false;
    const imageEntity = "file '" + filePath + "'";
    let readable: stream.Readable;
    const stripMetadataFunction = async (bufferOrFilePath: Buffer | string): Promise<stream.Readable> =>
    {
      const buffer: Buffer = Buffer.isBuffer(bufferOrFilePath) === true ? bufferOrFilePath : fs.readFileSync(bufferOrFilePath);
      const strippedBuffer: Buffer = stripMetadata === false ? buffer : await imageStripMetadata(buffer, requestedFormat);
      return stream.Readable.from(strippedBuffer);
    };
    if (requestedFormat !== originalFormat)
    {
      const formatAndBuffer = await resize(imageEntity, filePath, requestedFormat, width, height, resizeRender, undefined, undefined, false, stripMetadata === false);
      alreadyResized = requiresResize;
      readable = stream.Readable.from(formatAndBuffer.buffer);
    }
    else
    {
      readable = await stripMetadataFunction(filePath);
    }
    if (alreadyResized === false && requiresResize === true)
    {
      const buffers: Uint8Array[] = [];
      for await (const data of readable)
      {
        buffers.push(data);
      }
      const buffer = Buffer.concat(buffers);
      const formatAndBuffer = await resize(imageEntity, buffer, requestedFormat, width, height, resizeRender, undefined, undefined, false, stripMetadata === false);
      readable = stream.Readable.from(formatAndBuffer.buffer);
    }

    const requestedExtension = toFileExtension(requestedFormat);
    const originalExtension = path.extname(entity.name);
    const fileName = (originalExtension === "" ? (entity.name + ".") : (entity.name.substring(0, entity.name.length - originalExtension.length + 1))) + requestedExtension;
    return new StreamableFile(readable, { type: mimeType, disposition: computeAttachmentDisposition(fileName) });
  }

  async mediaUrl(id: string, format: ImageFormat | undefined = undefined, width: number | undefined = undefined, height: number | undefined = undefined, resizeRender: ImageResizeRender = ImageResizeRender.Inbox): Promise<ImageMediaUrl>
  {
    logger.info(`Getting the media URL of the image with id '${id}'${format === undefined ? "" : ` in '${format}' format`}${width === undefined ? "" : ` with a width of ${width} pixels`}${height === undefined ? "" : ` with a height of ${height} pixels`}${resizeRender === undefined ? "" : ` with a resize render set to '${resizeRender}`}`);
    const entity = await this.getPersistedImage(id, false, false, false);
    return new ImageMediaUrl(entity.id, `${paths.webServicesBaseUrl}/${Resizer.webServerBasePath}?u=${encodeURIComponent(entity.url)}${width === undefined ? "" : ("&w=" + width)}${height === undefined ? "" : ("&h=" + height)}${resizeRender === undefined ? "" : ("&r=" + resizeRender)}${format === undefined ? "" : ("&f=" + format)}`);
  }

  async getMetadata(id: string): Promise<ImageMetadata>
  {
    logger.info(`Getting the metadata for the image with id '${id}'`);
    const entity: ImageWithIncludes = await this.getPersistedImage(id, true, false, false);
    return plainToInstanceViaJSON(ImageMetadata, this.metadataToDto(entity.metadata!));
  }

  async getAllFeatures(id: string): Promise<AllImageFeatures>
  {
    logger.info(`Getting the features for the image with id '${id}' for all extensions`);
    await this.getPersistedImage(id, false, false, false);
    const entities = await this.entitiesProvider.imageFeature.findMany({
      where: { imageId: id, value: { not: ImageService.emptyImageFeatureValue } },
      orderBy: { id: "asc" }
    });
    return entities.map(this.featureToDto);
  }

  async setFeatures(id: string, extensionId: string, features: ImageFeature[]): Promise<void>
  {
    logger.info(`Setting the features for the image with id '${id}', the extension with id '${extensionId}'`);
    await this.getPersistedImage(id, false, false, false);
    this.checkExtension(extensionId);
    if (features.length > ExtensionImageTag.PER_EXTENSION_FEATURES_MAXIMUM)
    {
      parametersChecker.throwBadParameter("features", undefined, `it exceeds the maximum amount of items, which is ${ExtensionImageTag.PER_EXTENSION_FEATURES_MAXIMUM}`);
    }
    for (let index = 0; index < features.length; index++)
    {
      const imageFeature = features[index];
      parametersChecker.checkString(`features[${index}].name`, imageFeature.name, FieldLengths.technical, StringNature.Technical, true);
      if (typeof imageFeature.value === "string")
      {
        parametersChecker.checkString(`features[${index}].value`, imageFeature.value, FieldLengths.value, StringNature.Free);
      }
    }

    const checkIsString = (index: number, feature: ImageFeature): string =>
    {
      if (typeof feature.value !== "string")
      {
        parametersChecker.throwBadParameter(`[${index}].value`, undefined, "it should be a string");
      }
      return feature.value as string;
    };
    const toKeepAttachmentIds: number[] = [];
    for (let index = 0; index < features.length; index++)
    {
      const feature = features[index];
      const type = feature.type;
      const format = feature.format;

      // We first check that the feature type is compatible with the provided format
      if (type === ImageFeatureType.CAPTION && format !== ImageFeatureFormat.STRING)
      {
        parametersChecker.throwBadParameter(`[${index}].format`, format, `it should be equal to '${ImageFeatureFormat.STRING}' when the feature type is '${type}'`);
      }
      else if ((type === ImageFeatureType.DESCRIPTION || type === ImageFeatureType.COMMENT) && ImageService.DESCRIPTION_AND_COMMENTS_FEATURES_ALLOWED_FORMATS.includes(format) == false)
      {
        parametersChecker.throwBadParameter(`[${index}].format`, format, `it should be one of [${ImageService.DESCRIPTION_AND_COMMENTS_FEATURES_ALLOWED_FORMATS.map(item => `'${item}'`).join(", ")}] when the feature type is '${type}'`);
      }
      else if (type === ImageFeatureType.RECIPE && ImageService.RECIPE_FEATURES_ALLOWED_FORMATS.includes(format) == false)
      {
        parametersChecker.throwBadParameter(`[${index}].format`, format, `it should be one of [${ImageService.RECIPE_FEATURES_ALLOWED_FORMATS.map(item => `'${item}'`).join(", ")}] when the feature type is '${type}'`);
      }

      // Then, we check that the feature value is compatible with the declared format
      const value = feature.value;
      if (format === ImageFeatureFormat.INTEGER)
      {
        if (typeof value !== "number" || Number.isInteger(value) === false)
        {
          parametersChecker.throwBadParameter(`[${index}].value`, undefined, "it should be an integer");
        }
      }
      else if (format === ImageFeatureFormat.FLOAT)
      {
        if (typeof value !== "number")
        {
          parametersChecker.throwBadParameter(`[${index}].value`, undefined, "it should be a float");
        }
      }
      else if (format === ImageFeatureFormat.BOOLEAN)
      {
        if (typeof value !== "boolean")
        {
          parametersChecker.throwBadParameter(`[${index}].value`, undefined, "it should be a boolean");
        }
      }
      else if (format === ImageFeatureFormat.STRING)
      {
        if (typeof value !== "string")
        {
          parametersChecker.throwBadParameter(`[${index}].value`, undefined, "it should be a string");
        }
      }
      else if (format === ImageFeatureFormat.MARKDOWN)
      {
        checkIsString(index, feature);
        // TODO: find a way to validate the Markdown content
        // try
        // {
        //   await marked.parse(feature.value, { async: true, silent: false });
        // }
        // catch (error)
        // {
        //   parametersChecker.throwBadParameter(`[${index}].value`, feature.value, "it should be a well-formed Markdown content");
        // }
      }
      else if (format === ImageFeatureFormat.JSON)
      {
        const string = checkIsString(index, feature);
        let json: Json;
        try
        {
          // We make sure that the string is a valid JSON content
          json = JSON.parse(string);
        }
        catch (error)
        {
          parametersChecker.throwBadParameter(`[${index}].value`, string, "it should be a well-formed JSON content");
        }
        if (type === ImageFeatureType.RECIPE)
        {
          // In the case of a recipe, we check that the value respects the expected schema
          const string = checkIsString(index, feature);
          const generationRecipe = plainToInstance(GenerationRecipe, json, {
            excludeExtraneousValues: true,
            ignoreDecorators: true
          });
          const validationErrors = await validate(generationRecipe, { forbidUnknownValues: true });
          if (validationErrors.length > 0)
          {
            parametersChecker.throwBadParameter(`[${index}].value`, string, "because it does not comply with the recipe schema");
          }
        }
      }
      else if (format === ImageFeatureFormat.XML)
      {
        const string = checkIsString(index, feature);
        if (XMLValidator.validate(string) !== true)
        {
          parametersChecker.throwBadParameter(`[${index}].value`, string, "it should be a well-formed XML content");
        }
      }
      else if (format === ImageFeatureFormat.BINARY)
      {
        const string = checkIsString(index, feature);
        let entity: { id: number, imageId: string, extensionId: string };
        try
        {
          entity = (await this.moduleRef.get(ImageAttachmentService).checkAttachmentUri(string, true)).entity;
        }
        catch (error)
        {
          parametersChecker.throwBadParameter(`[${index}].value`, string, (error as Error).message);
        }
        if (entity.imageId !== id)
        {
          parametersChecker.throwBadParameter(`[${index}].value`, string, `the attachment with that URI is not bound to the image with id '${id}'`);
        }
        else if (entity.extensionId !== extensionId)
        {
          parametersChecker.throwBadParameter(`[${index}].value`, string, `the attachment with that URI is not bound to the extension with id '${extensionId}'`);
        }
        toKeepAttachmentIds.push(entity.id);
      }
    }

    // We need to delete all attachments related to the extension
    const deleteAttachments = this.moduleRef.get(ImageAttachmentService).delete(id, extensionId, toKeepAttachmentIds);

    const deleteFeatures = this.entitiesProvider.imageFeature.deleteMany({
      where: { imageId: id, extensionId }
    });
    const actualFeatures = features.length === 0 ? [
      {
        type: ImageFeatureType.OTHER,
        format: ImageFeatureFormat.STRING,
        value: ImageService.emptyImageFeatureValue
      }
    ] : features;
    const createFeatures = this.entitiesProvider.imageFeature.createMany({
      data: actualFeatures.map((feature) =>
      {
        const value: string = typeof feature.value === "string" ? feature.value : (typeof feature.value === "number" ? feature.value.toString() : (feature.value as boolean).toString());
        return {
          imageId: id,
          type: feature.type,
          format: feature.format,
          name: feature.name,
          extensionId: extensionId,
          value: value
        };
      })
    });
    await this.entitiesProvider.prisma.$transaction([deleteAttachments, deleteFeatures, createFeatures]);
  }

  async getAllTags(id: string): Promise<AllExtensionImageTags>
  {
    logger.info(`Getting the tags for the image with id '${id}' for all extensions`);
    await this.getPersistedImage(id, false, false, false);
    const entities = await this.entitiesProvider.imageTag.findMany({
      where: { AND: [{ imageId: id }, { value: { not: ImageService.emptyImageTag } }] },
      orderBy: { value: "asc" }
    });
    return entities.map((entity) =>
    {
      return new ExtensionImageTag(entity.extensionId, entity.value);
    });
  }

  async setTags(id: string, extensionId: string, tags: ImageTag[], isEnsure: boolean): Promise<void>
  {
    logger.info(`${isEnsure === true ? "Ensuring" : "Setting"} the tags for the image with id '${id}' and the extension with id '${extensionId}'`);
    await this.getPersistedImage(id, false, false, true);
    this.checkExtension(extensionId);
    if (tags.length > ExtensionImageTag.PER_EXTENSION_TAGS_MAXIMUM)
    {
      parametersChecker.throwBadParameter("tags", undefined, `it exceeds the maximum amount of items, which is ${ExtensionImageTag.PER_EXTENSION_TAGS_MAXIMUM}`);
    }
    if (isEnsure === true && tags.length === 0)
    {
      parametersChecker.throwBadParameter("tags", undefined, `it must contain at least one tag when the 'isEnsure' parameter is set to 'true'`);
    }
    if (new Set<string>(tags).size !== tags.length)
    {
      parametersChecker.throwBadParameter("tags", undefined, "it contains duplicate values");
    }
    for (let index = 0; index < tags.length; index++)
    {
      parametersChecker.checkString(`tags[${index}]`, tags[index], FieldLengths.technical, StringNature.Technical);
    }
    const existingEntities = await this.entitiesProvider.imageTag.findMany({
      where: { imageId: id, extensionId }
    });
    const existingTags = existingEntities.map((entity) =>
    {
      return entity.value;
    });
    const actualTags = tags.length === 0 ? [ImageService.emptyImageTag] : tags;
    const newTags = actualTags.filter((tag) =>
    {
      return existingTags.indexOf(tag) === -1;
    });
    await this.entitiesProvider.imageTag.createMany({
      data: newTags.map((tag) =>
      {
        return {
          imageId: id,
          extensionId,
          value: tag
        };
      })
    });
    const extraneousEntitiesIds: number[] = [];
    if (isEnsure === true)
    {
      const index = existingTags.indexOf(ImageService.emptyImageTag);
      if (tags.length > 0 && index !== -1)
      {
        extraneousEntitiesIds.push(existingEntities[index].id);
      }
    }
    else
    {
      extraneousEntitiesIds.push(...existingEntities.filter((entity) =>
      {
        return actualTags.indexOf(entity.value) === -1;
      }).map((entity) =>
      {
        return entity.id;
      }));
    }
    if (extraneousEntitiesIds.length > 0)
    {
      // We remove the extraneous tags
      await this.entitiesProvider.imageTag.deleteMany({ where: { id: { in: extraneousEntitiesIds } } });
    }
  }

  async getAllEmbeddings(id: string): Promise<AllImageEmbeddings>
  {
    logger.info(`Getting all the embeddings for the image with id '${id}'`);
    await this.getPersistedImage(id, false, false, false);
    const extensionIds = await this.vectorDatabaseAccessor.getExtensionIds();
    const extensionImageEmbeddingsArray: AllImageEmbeddings = [];
    for (const extensionId of extensionIds)
    {
      const embeddings = await this.vectorDatabaseAccessor.getEmbeddings(id, extensionId);
      if (embeddings === undefined)
      {
        logger.warn(`There are no embeddings for the image with id '${id}' and the extension with id '${extensionId}'`);
      }
      else
      {
        extensionImageEmbeddingsArray.push(new ExtensionImageEmbeddings(extensionId, embeddings));
      }
    }
    return extensionImageEmbeddingsArray.sort((entity1, entity2) =>
    {
      return entity1.id.localeCompare(entity2.id);
    });
  }

  async getEmbeddings(id: string, extensionId: string): Promise<ImageEmbeddings>
  {
    logger.info(`Getting the embeddings for the image with id '${id}' and the extension with id '${extensionId}'`);
    this.checkExtension(extensionId);
    await this.getPersistedImage(id, false, false, false);
    const embeddings = await this.vectorDatabaseAccessor.getEmbeddings(id, extensionId);
    if (embeddings === undefined)
    {
      parametersChecker.throwBadParameterError(`There are no embeddings for the image with id '${id}' and the extension with id '${extensionId}'`);
    }
    return plainToInstanceViaJSON(ImageEmbeddings, { values: embeddings });
  }

  async setEmbeddings(id: string, extensionId: string, embeddings: ImageEmbeddings): Promise<void>
  {
    logger.info(`Setting the embeddings for the image with id '${id}' and the extension with id '${extensionId}'`);
    this.checkExtension(extensionId);
    await this.getPersistedImage(id, false, false, false);
    if (embeddings.values.length > ImageEmbeddings.DIMENSION_MAXIMUM)
    {
      // We limit the number of dimensions to avoid performance issues with the vector database
      parametersChecker.throwBadParameterError("The embeddings vector cannot have a dimension larger than " + ImageEmbeddings.DIMENSION_MAXIMUM);
    }
    await this.vectorDatabaseAccessor.setEmbeddings(id, extensionId, embeddings.values);
  }

  async closestImages(id: string, extensionId: string, count: number): Promise<ImageDistances>
  {
    logger.info(`Getting the ${count} closest image(s) to the image with id '${id}' related to the extension with id '${extensionId}'`);
    const imageEmbeddings = await this.getEmbeddings(id, extensionId);
    parametersChecker.checkNumber("count", count, 1);
    const imageDistances = await this.closestEmbeddingsImages(extensionId, imageEmbeddings, count + 1);
    return imageDistances.length <= 1 ? [] : imageDistances.slice(1);
  }

  async closestEmbeddingsImages(extensionId: string, embeddings: ImageEmbeddings, count: number): Promise<ImageDistances>
  {
    logger.info(`Getting the ${count} closest image(s) to some embeddings related to the extension with id '${extensionId}'`);
    this.checkExtension(extensionId);
    parametersChecker.checkNumber("count", count, 1);
    const imageIdAndDistances: ImageIdAndDistance[] = await this.vectorDatabaseAccessor.queryEmbeddings(extensionId, embeddings.values, count);
    const imageIds: string[] = imageIdAndDistances.map((imageIdAndDistance) =>
    {
      return imageIdAndDistance.imageId;
    });
    const entities = await this.entitiesProvider.images.findMany({
      where: { id: { in: imageIds } },
      include: { metadata: false, features: false }
    });
    if (imageIds.length !== entities.length)
    {
      const entitiesIds: string[] = entities.map((entity) =>
      {
        return entity.id;
      });
      const missingImageIds = imageIds.filter((id) =>
      {
        return entitiesIds.indexOf(id) === -1;
      });
      // This should only happen when an image has been deleted while the repository was not watching and should be solved by synchronizing the repository or by synchronising the extension
      logger.warn(`Could not find the images with ids '${missingImageIds.join("', '")}'`);
    }
    // We need to sort the entities because they are not sorted in the same way as the 'imageIds'
    return entities.sort((entity1, entity2) =>
    {
      return imageIds.indexOf(entity1.id) - imageIds.indexOf(entity2.id);
    }).map((entity, index) =>
    {
      return plainToInstanceViaJSON(ImageDistance, {
        distance: imageIdAndDistances[index].distance,
        image: this.toDto(entity, undefined, undefined, undefined)
      });
    });
  }

  async textToImages(text: string, extensionId: string, count: number): Promise<ImageDistances>
  {
    logger.info(`Getting the ${count} closest image(s) to the text '${text}' related to the extension with id '${extensionId}'`);
    this.checkExtension(extensionId);
    const generativeAIService: GenerativeAIService = this.moduleRef.get(GenerativeAIService);
    const embeddings = await generativeAIService.computeTextEmbeddings(text);
    return await this.closestEmbeddingsImages(extensionId, new ImageEmbeddings(embeddings), count);
  }

  async computeFormat(buffer: Buffer): Promise<ImageFormat>
  {
    logger.info("Computing the format of an image");
    this.checkImageBinaryWeight(buffer);
    try
    {
      return await computeFormat(buffer);
    }
    catch (error)
    {
      parametersChecker.throwBadParameterError(`The provided file is not a supported image. Reason: '${(error as Error).message}'`);
    }
  }

  async convertInto(format: ImageFormat, quality: NumericRange<1, 100> | undefined, buffer: Buffer): Promise<StreamableFile>
  {
    logger.info(`Converting an image to the '${format}' format`);
    this.checkImageBinaryWeight(buffer);
    if (quality !== undefined && (quality < 1 || quality > 100))
    {
      parametersChecker.throwBadParameter("quality", quality.toString(), "it must be an integer between 1 and 100");
    }
    let formatAndBuffer: FormatAndBuffer;
    try
    {
      formatAndBuffer = await resize("image", buffer, format, undefined, undefined, undefined, quality, undefined, false, false);
    }
    catch (error)
    {
      parametersChecker.throwBadParameterError(`The provided file is not a supported image. Reason: '${(error as Error).message}'`);
    }
    return new StreamableFile(stream.Readable.from(formatAndBuffer.buffer), {
      type: toMimeType(format),
      disposition: computeAttachmentDisposition("image")
    });
  }

  private async getPersistedImage(id: string, withMetadata: boolean = true, withFeatures: boolean = true, withTags: boolean = true): Promise<ImageWithIncludes>
  {
    const entity: ImageWithIncludes | null = await this.entitiesProvider.images.findUnique({
      where: { id },
      include: { metadata: withMetadata, features: withFeatures, tags: withTags }
    });
    if (entity === null)
    {
      parametersChecker.throwBadParameter("id", id, `there is no image with that identifier`);
    }
    return entity;
  }

  private checkExtension(extensionId: string): void
  {
    if (this.extensionsRegistry.exists(extensionId) === false)
    {
      parametersChecker.throwBadParameter("extensionId", extensionId, "that extension is not installed");
    }
  }

  private checkImageBinaryWeight(buffer: Buffer<ArrayBufferLike>): void
  {
    if (buffer.length > Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES)
    {
      parametersChecker.throwBadParameterError(`The provided image exceeds the maximum allowed binary weight of ${Image.IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES} bytes`);
    }
  }

  private toDto(entity: PersistedImage, metadata: PersistedImageMetadata | undefined, features: PersistedImageFeature[] | undefined, tags: PersistedImageTag[] | undefined): Image | ImageSummary
  {
    let url: string = entity.url;
    {
      // We translate the URL according to the repository mapping paths
      for (const [key, value] of paths.repositoryMappingPaths.entries())
      {
        if (url.startsWith(fileWithProtocol + key) === true)
        {
          url = fileWithProtocol + value + url.substring(fileWithProtocol.length + key.length);
          break;
        }
      }
    }
    Object.assign(entity, {
      dimensions: new ImageDimensions(entity.width, entity.height),
      fileDates: new Dates(entity.fileCreationDate.getTime(), entity.fileModificationDate.getTime()),
      uri: entity.url,
      url
    });
    Object.assign(entity, {
      metadata: metadata === undefined ? [] : this.metadataToDto(metadata)
    });
    Object.assign(entity, {
      features: features === undefined ? [] : features.filter(feature => feature.value !== ImageService.emptyImageFeatureValue).map(this.featureToDto)
    });
    Object.assign(entity, {
      tags: tags === undefined ? [] : tags.filter(tag => tag.value !== ImageService.emptyImageTag).map((tag) =>
      {
        return new ExtensionImageTag(tag.extensionId, tag.value);
      })
    });
    // @ts-ignore
    return entity;
  }

  private featureToDto(feature: PersistedImageFeature): ExtensionImageFeature
  {
    const format = feature.format as ImageFeatureFormat;
    let value: ImageFeatureValue;
    switch (format)
    {
      case ImageFeatureFormat.INTEGER:
        value = parseInt(feature.value);
        break;
      case ImageFeatureFormat.FLOAT:
        value = parseFloat(feature.value);
        break;
      case ImageFeatureFormat.BOOLEAN:
        value = feature.value === "true";
        break;
      default:
        value = feature.value;
        break;
    }
    return new ExtensionImageFeature(feature.extensionId, feature.type as ImageFeatureType, format, feature.name === null ? undefined : feature.name, value);
  }

  private metadataToDto(entity: PersistedImageMetadata): ImageMetadata
  {
    return new ImageMetadata(entity?.all ?? undefined, entity?.exif ?? undefined, entity?.icc ?? undefined, entity?.iptc ?? undefined, entity?.xmp ?? undefined, entity?.tiffTagPhotoshop ?? undefined, entity?.others ?? undefined);
  }

}

export type SearchFileStats =
  {
    fileDates: Dates,
    internalId: string,
    sizeInBytes: number
  };

type SearchImageDetails =
  Omit<Image, "id" | "repositoryId" | "uri" | "creationDate" | "modificationDate" | "sizeInBytes" | "metadata" | "features" | "tags" | "mimeType">
  & { metadata: ImageMetadata } & SearchFileStats & { applicationMetadata: ApplicationMetadata | undefined };

@Injectable()
export class SearchService
{

  constructor()
  {
    logger.debug("Instantiating a SearchService");
  }

  async listFiles(location: RepositoryLocation): Promise<string[]>
  {
    logger.info(`Listing the files in the location of type '${location.type}' at URL ${location.url}'`);
    const patterns = computeImageFormatsExtensions(ImageFormats).map((extension) =>
    {
      return `./**/*.${extension}`;
    });
    return await new fdir().withFullPaths().glob(...patterns).crawl(location.toFilePath()).withPromise();
  }

  computeImageStats(filePath: string): SearchFileStats
  {
    logger.debug(`Computing the stats for the image in file '${filePath}'`);
    const stats = fs.statSync(filePath);
    return {
      fileDates:
        {
          creationDate: stats.birthtime.getTime(),
          modificationDate: stats.mtime.getTime()
        },
      internalId: stats.ino.toString(),
      sizeInBytes: stats.size
    };
  }

  async computeImageMetadata(filePath: string): Promise<ImageMiscellaneousMetadata>
  {
    logger.debug(`Computing the metadata for the image in file '${filePath}'`);
    return readMetadata(filePath);
  }

  async computeImageDetails(filePath: string, sourceUrl?: string): Promise<SearchImageDetails>
  {
    logger.debug(`Computing the details for the image in file '${filePath}'`);
    const others: Json = {};
    if (process.platform === "darwin")
    {
      let darwinMetadata: Record<string, any>;
      try
      {
        darwinMetadata = await fileMetadata(filePath);
      }
      catch (error)
      {
        logger.warn("Could not access to the metadata of the file '" + filePath + "'. Reason: '" + (error as Error).message + "'");
        darwinMetadata = {};
      }
      const whereFroms: string[] | undefined = darwinMetadata["whereFroms"];
      if (whereFroms !== undefined)
      {
        others.source = whereFroms[whereFroms.length - 1];
      }
    }
    const imageStats = this.computeImageStats(filePath);
    const imageMetadata = await this.computeImageMetadata(filePath);
    const imageFormat = imageMetadata.format;
    const allJsonObject = imageMetadata.all;
    const exifJsonObject = imageMetadata.exif;
    const iccJsonObject = imageMetadata.icc;
    const allValue = JSON.stringify(allJsonObject);
    const exifValue = exifJsonObject === undefined ? undefined : JSON.stringify(exifJsonObject);
    const iccValue = iccJsonObject === undefined ? undefined : JSON.stringify(iccJsonObject);

    const dimensions = { width: imageMetadata.width ?? -1, height: imageMetadata.height ?? -1 };

    const applicationMetadataJson = supportsApplicationMedata(imageFormat) === false ? undefined : await readApplicationMetadata(fs.readFileSync(filePath), imageFormat);
    let applicationMetadata;
    if (applicationMetadataJson !== undefined)
    {
      try
      {
        applicationMetadata = await this.computeApplicationMetadata(applicationMetadataJson, false);
      }
      catch (error)
      {
        logger.warn(`Could not parse the application metadata of the image in file '${filePath}'. Reason: '${(error as Error).message}'`, error);
      }
    }

    logger.debug(`The image '${filePath}' format is '${imageFormat}' and its dimensions are (${dimensions.width}x${dimensions.height})`);
    return {
      name: path.basename(filePath),
      format: imageFormat,
      url: fileWithProtocol + filePath,
      sourceUrl,
      fileDates: imageStats.fileDates,
      internalId: imageStats.internalId,
      sizeInBytes: imageStats.sizeInBytes,
      dimensions,
      metadata:
        {
          all: allValue,
          exif: exifValue,
          icc: iccValue,
          iptc: imageMetadata.iptc === undefined ? undefined : JSON.stringify(imageMetadata.iptc),
          xmp: imageMetadata.xmp === undefined ? undefined : JSON.stringify(imageMetadata.xmp),
          tiffTagPhotoshop: imageMetadata.tiffTagPhotoshop,
          others: JSON.stringify(others)
        },
      applicationMetadata
    };
  }

  public async computeApplicationMetadata(applicationMetadataJson: Json, validateMetadata: boolean): Promise<ApplicationMetadata>
  {
    const applicationMetadata: ApplicationMetadata = plainToInstance(ApplicationMetadata, applicationMetadataJson, {
      excludeExtraneousValues: true,
      ignoreDecorators: true
    });
    if (validateMetadata === true)
    {
      const validationErrors = await validate(applicationMetadata, { forbidUnknownValues: true });
      if (validationErrors.length > 0)
      {
        throw validationErrors[0];
      }
    }
    // We set back property the "ApplicationMetadataItemFreeValue" items, which have been damaged by the "plainToInstance()" call
    for (let index = 0; index < applicationMetadata.items.length; index++)
    {
      const item = applicationMetadata.items[index];
      if (item.value instanceof GenerationRecipe === false)
      {
        Object.assign(item, { value: applicationMetadataJson.items[index].value });
      }
    }
    return applicationMetadata;
  }

}
