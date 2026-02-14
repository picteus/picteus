import { IsInt } from "class-validator";
import { Expose, Type } from "class-transformer";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";


export const alphaNumericPlusPattern = "a-z0-9A-Z-_.";

export const computeIdPattern = (maximumLength: number): string =>
{
  return `^[${alphaNumericPlusPattern}]{1,${maximumLength}}$`;
};

const computeNamePattern = (maximumLength: number): string =>
{
  return `^[${alphaNumericPlusPattern} ]{1,${maximumLength}}$`;
};

export const FieldLengths =
  {
    eight: 8,
    uid: 36,
    shortTechnical: 32,
    technical: 64,
    name: 128,
    command: 512,
    fileName: 512,
    comment: 1_024,
    filePath: 4 * 1_024,
    url: 4 * 1_024,
    content: 128 * 1_024,
    value: 512 * 1_024
  };

export type Json = Record<string, any>;

// Taken from https://github.com/microsoft/TypeScript/issues/43505
export type NumericRange<
  start extends number,
  end extends number,
  array extends unknown[] = [],
  access extends number = never,
> = array["length"] extends end
  ? access | start | end
  : NumericRange<start, end, [...array, 1], array[start] extends undefined ? access : access | array["length"]>;

export const fileWithProtocol = "file://";

export const attachmentUriPrefix = "attachment://";

const alphaNumericPattern = "0-9a-f";

export const uniqueIdPattern = `[${alphaNumericPattern}]{8}-[${alphaNumericPattern}]{4}-[${alphaNumericPattern}]{4}-[${alphaNumericPattern}]{4}-[${alphaNumericPattern}]{12}`;

export const namePattern = computeNamePattern(FieldLengths.name);

export const extensionIdPattern = computeIdPattern(FieldLengths.shortTechnical);

const noProtocolUriPathPattern = "[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|]";

export const uriPathPattern = `^(https?://|/?)${noProtocolUriPathPattern}+$`;

export const urlPattern = `^(https?)://${noProtocolUriPathPattern}$`;

export const fileUrlPattern = `${fileWithProtocol}.*`;

export const semverPattern = "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$";

export const urlSchema: SchemaObject =
  {
    description: "A URL",
    type: "string",
    format: "uri",
    pattern: urlPattern,
    minLength: 8,
    maxLength: FieldLengths.url,
    example: "https://static1.smartbear.co/swagger/media/assets/images/swagger_logo.svg"
  };

export const imageIdSchema: SchemaObject =
  {
    description: "An image identifier",
    type: "string",
    pattern: uniqueIdPattern,
    minLength: FieldLengths.uid,
    maxLength: FieldLengths.uid,
    example: "fb6af249-1061-48a0-9e47-026d7428d709"
  };

export const repositoryIdSchema: SchemaObject =
  {
    description: "A repository identifier",
    type: "string",
    pattern: uniqueIdPattern,
    minLength: FieldLengths.uid,
    maxLength: FieldLengths.uid,
    example: "9aa0820f-6405-4b54-a01a-a6b56489a77f"
  };

export const extensionIdSchema: SchemaObject =
  {
    description: "An extension identifier",
    type: "string",
    pattern: computeIdPattern(FieldLengths.shortTechnical),
    example: "extension-id"
  };

export const imageUrlSchema: SchemaObject =
  {
    description: "An image URL",
    type: "string",
    format: "uri",
    pattern: fileUrlPattern,
    minLength: 8,
    maxLength: FieldLengths.url,
    example: "file:///Users/me/image//path/fileName.png"
  };

export const attachmentUriSchema: SchemaObject =
  {
    description: "An attachment URI",
    type: "string",
    format: "uri",
    pattern: `^(${attachmentUriPrefix}${noProtocolUriPathPattern}`,
    minLength: 8,
    maxLength: FieldLengths.url,
    example: `${attachmentUriPrefix}1`
  };

export const applicationXGzipMimeType = "application/x-gzip";

/**
 * Dates about an entity.
 */
@ApiSchema({ description: "A pair of creation and modification dates" })
export class Dates
{

  constructor(creationDate: number, modificationDate: number)
  {
    this.creationDate = creationDate;
    this.modificationDate = modificationDate;
  }

  @ApiProperty(
    {
      description: "The entity creation date",
      type: Number,
      format: "int64",
      required: true,
      example: 1725989551416
    }
  )
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly creationDate: number;

  @ApiProperty(
    {
      description: "The entity last modification date",
      type: Number,
      format: "int64",
      required: true,
      example: 1760890442560
    }
  )
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly modificationDate: number;

}

/**
 * All the image supported types.
 */
// TODO: add the "bmp" format
export enum ImageFormat
{
  PNG = "PNG",
  JPEG = "JPEG",
  WEBP = "WEBP",
  GIF = "GIF",
  AVIF = "AVIF",
  HEIF = "HEIF"
}

/**
 * All feature formats.
 */
export enum ImageFeatureFormat
{
  STRING = "string",
  INTEGER = "integer",
  FLOAT = "float",
  BOOLEAN = "boolean",
  JSON = "json",
  XML = "xml",
  MARKDOWN = "markdown",
  HTML = "html",
  BINARY = "binary"
}

/**
 * All feature types.
 */
export enum ImageFeatureType
{
  CAPTION = "caption",
  DESCRIPTION = "description",
  COMMENT = "comment",
  ANNOTATION = "annotation",
  METADATA = "metadata",
  RECIPE = "recipe",
  OTHER = "other"
}

export const ImageFormats: ImageFormat[] = Object.keys(ImageFormat) as ImageFormat [];

export function toFileExtension(format: ImageFormat): string
{
  switch (format)
  {
    default:
      return format.toLowerCase();
    case ImageFormat.JPEG:
      return "jpg";
  }
}

export function fromMimeType(mimeType: string): ImageFormat | undefined
{
  const searchString = "image/";
  if (mimeType.startsWith(searchString) === false)
  {
    throw new Error(`Unhandled image MIME type '${mimeType}'`);
  }
  const string = mimeType.substring(searchString.length);
  switch (string)
  {
    default:
      return undefined;
    case "png":
      return ImageFormat.PNG;
    case "jpeg":
      return ImageFormat.JPEG;
    case "gif":
      return ImageFormat.GIF;
    case "webp":
      return ImageFormat.WEBP;
    case "avif":
      return ImageFormat.AVIF;
    case "heif":
      return ImageFormat.HEIF;
  }
}

export function toMimeType(format: ImageFormat): string
{
  let mimeTypeSuffix: string;
  switch (format)
  {
    default:
      throw new Error(`Unhandled image with format '${format}'`);
    case ImageFormat.PNG:
      mimeTypeSuffix = "png";
      break;
    case ImageFormat.JPEG:
      mimeTypeSuffix = "jpeg";
      break;
    case ImageFormat.WEBP:
      mimeTypeSuffix = "webp";
      break;
    case ImageFormat.GIF:
      mimeTypeSuffix = "gif";
      break;
    case ImageFormat.AVIF:
      mimeTypeSuffix = "avif";
      break;
    case ImageFormat.HEIF:
      mimeTypeSuffix = "heif";
      break;
  }
  return `image/${mimeTypeSuffix}`;
}

export const computeImageFormatsExtensions = (imageFormats: ImageFormat[]): string[] =>
{
  return imageFormats.map((imageFormat) =>
  {
    const extension = toFileExtension(imageFormat);
    if (imageFormat === ImageFormat.JPEG)
    {
      return [extension, "jpeg"];
    }
    else if (imageFormat === ImageFormat.HEIF)
    {
      return [extension, "heic"];
    }
    else
    {
      return [extension];
    }
  }).flat(1);
};

export type ImageFeatureValue = string | number | boolean;

export type ImageTag = string;
