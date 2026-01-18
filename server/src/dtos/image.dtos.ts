import { Expose, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsJSON,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
  ValidateNested
} from "class-validator";
import { ApiExtraModels, ApiProperty, ApiSchema, getSchemaPath } from "@nestjs/swagger";
import {
  alphaNumericPlusPattern,
  computeIdPattern,
  Dates,
  FieldLengths,
  fileUrlPattern,
  ImageFormat,
  imageIdSchema,
  ImageTag,
  Json,
  repositoryIdSchema,
  toMimeType,
  uniqueIdPattern,
  uriPathPattern,
  urlPattern
} from "./common.dtos";


/**
 * The image dimensions.
 */
@ApiSchema({ description: "The dimensions of an image" })
export class ImageDimensions
{

  constructor(width: number, height: number)
  {
    this.width = width;
    this.height = height;
  }

  @ApiProperty(
    {
      description: "The image width in pixels",
      type: Number,
      format: "int32",
      minimum: 1,
      required: true
    }
  )
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly width: number;

  @ApiProperty(
    {
      description: "The image height in pixels",
      type: Number,
      format: "int32",
      minimum: 1,
      required: true
    }
  )
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly height: number;

}

/**
 * The image metadata.
 */
@ApiSchema({ description: "The image metadata" })
export class ImageMetadata
{

  constructor(all?: string, exif?: string, icc?: string, iptc?: string, xmp?: string, tiffTagPhotoshop?: string, others?: string)
  {
    this.all = all;
    this.exif = exif;
    this.icc = icc;
    this.iptc = iptc;
    this.xmp = xmp;
    this.tiffTagPhotoshop = tiffTagPhotoshop;
    this.others = others;
  }

  @ApiProperty(
    {
      description: "All the image metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly all?: string;

  @ApiProperty(
    {
      description: "The image EXIF metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly exif?: string;

  @ApiProperty(
    {
      description: "The image ICC metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly icc?: string;

  @ApiProperty(
    {
      description: "The image IPTC metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly iptc?: string;

  @ApiProperty(
    {
      description: "The image XMP metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly xmp?: string;

  @ApiProperty(
    {
      description: "The image Adobe Photoshop (TIFFTAG_PHOTOSHOP) metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly tiffTagPhotoshop?: string;

  @ApiProperty(
    {
      description: "All the others image metadata, which is a JSON stringified string",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsJSON()
  @IsOptional()
  @Expose()
  readonly others?: string;

}

/**
 * All prompt kinds.
 */
export enum PromptKind
{
  TEXTUAL = "textual",
  INSTRUCTIONS = "instructions"
}

@ApiSchema({ description: "The basis prompt of an AI-based generated image" })
export class BasisPrompt
{

  constructor(kind: PromptKind)
  {
    this.kind = kind;
  }

  @ApiProperty(
    {
      description: "The kind of prompt",
      enum: PromptKind,
      enumName: "PromptKind",
      required: true,
      example: PromptKind.INSTRUCTIONS
    }
  )
  @IsEnum(PromptKind)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly kind: PromptKind;

}

@ApiSchema({ description: "The textual prompt of an AI-based generated image" })
export class TextualPrompt extends BasisPrompt
{

  constructor(text: string)
  {
    super(PromptKind.TEXTUAL);
    this.text = text;
  }

  @ApiProperty(
    {
      description: "The textual prompt",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.content,
      required: true,
      example: "A white sign with a black background"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.content)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly text: string;

}

@ApiSchema({ description: "The instructions of an AI-based generated image" })
export class InstructionsPrompt extends BasisPrompt
{

  constructor(value: Json)
  {
    super(PromptKind.INSTRUCTIONS);
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The instructions-based prompt",
      type: Object,
      required: true
    }
  )
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly value: Json;

}

const modelAndSoftwareTagPattern = `^(([${alphaNumericPlusPattern}]{1,})/)?([${alphaNumericPlusPattern}]{1,})(:([${alphaNumericPlusPattern}]{1,}))?$`;

export const generationRecipeSchemaVersion = 1;

/**
 * The image generation recipe.
 */
@ApiExtraModels(TextualPrompt, InstructionsPrompt)
@ApiSchema({ description: "The image generation recipe" })
export class GenerationRecipe
{

  constructor(modelTags: string[], prompt: TextualPrompt | InstructionsPrompt, id?: string | undefined, url?: string | undefined, software?: string | undefined, inputAssets?: string[] | undefined, aspectRatio?: number | undefined)
  {
    this.modelTags = modelTags;
    this.prompt = prompt;
    this.id = id;
    this.url = url;
    this.software = software;
    this.inputAssets = inputAssets;
    this.aspectRatio = aspectRatio;
  }

  @ApiProperty(
    {
      description: "The version of the schema the hereby recipe complies to",
      type: Number,
      format: "int32",
      minimum: 1,
      maximum: generationRecipeSchemaVersion,
      required: true,
      example: 1
    }
  )
  @IsInt()
  @IsDefined()
  @Min(1)
  @Max(generationRecipeSchemaVersion)
  @Expose()
  readonly schemaVersion: number = 1;

  @ApiProperty(
    {
      description: "The identifier of the recipe instance",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.technical,
      required: false,
      example: "820hh5e0w5rmc0ctgw38b1t4pr"
    }
  )
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(FieldLengths.technical)
  @Expose()
  readonly id?: string;

  @ApiProperty(
    {
      description: "The URL of the recipe instance",
      type: String,
      format: "uri",
      pattern: uriPathPattern,
      minLength: 1,
      maxLength: FieldLengths.url,
      required: false,
      example: "https://api.replicate.com/v1/predictions/820hh5e0w5rmc0ctgw38b1t4pr"
    }
  )
  @IsString()
  @Matches(uriPathPattern)
  @MinLength(1)
  @MaxLength(FieldLengths.url)
  @IsOptional()
  @Expose()
  readonly url?: string;

  @ApiProperty(
    {
      description: "The tags of the model generators",
      type: String,
      isArray: true,
      pattern: modelAndSoftwareTagPattern,
      minLength: 1,
      maxLength: FieldLengths.url,
      required: true,
      example: "google/gemini-2.5-flash-image:2.5"
    }
  )
  @IsString({ each: true })
  @IsArray()
  @Matches(modelAndSoftwareTagPattern, undefined, { each: true })
  @IsDefined()
  @IsDefined({ each: true })
  @NotEquals(null)
  @MinLength(1, { each: true })
  @MaxLength(FieldLengths.url, { each: true })
  @Expose()
  readonly modelTags: string[];

  @ApiProperty(
    {
      description: "The software that ran the generation",
      type: String,
      pattern: modelAndSoftwareTagPattern,
      minLength: 1,
      maxLength: FieldLengths.name,
      required: false,
      example: "comfyui"
    }
  )
  @IsString()
  @Matches(modelAndSoftwareTagPattern)
  @IsOptional()
  @MinLength(1)
  @MaxLength(FieldLengths.name)
  @Expose()
  readonly software?: string;

  @ApiProperty(
    {
      description: "The identifiers or URLs of the input assets",
      type: String,
      isArray: true,
      minLength: 1,
      maxLength: FieldLengths.url,
      required: false
    }
  )
  @IsString({ each: true })
  @IsArray()
  @MinLength(1, { each: true })
  @MaxLength(FieldLengths.url, { each: true })
  @IsOptional()
  @Expose()
  readonly inputAssets?: string[];

  @ApiProperty(
    {
      description: "The required image aspect ratio, i.e. the result of its width by its height",
      type: Number,
      minimum: 0,
      exclusiveMinimum: true,
      required: false,
      example: 1.7777
    }
  )
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Expose()
  readonly aspectRatio?: number;

  @ApiProperty(
    {
      description: "The prompt which enabled to generate the image",
      oneOf:
        [
          {
            description: "In case of a prompt-based generated image",
            $ref: getSchemaPath(TextualPrompt)
          },
          {
            description: "In case of a instructions-based generated image",
            $ref: getSchemaPath(InstructionsPrompt)
          }
        ],
      discriminator:
        {
          propertyName: "kind",
          mapping:
            {
              [PromptKind.TEXTUAL]: getSchemaPath(TextualPrompt),
              [PromptKind.INSTRUCTIONS]: getSchemaPath(InstructionsPrompt)
            }
        },
      required: false
    }
  )
  @IsOptional()
  @Expose()
  readonly prompt?: TextualPrompt | InstructionsPrompt;

}

@ApiSchema({ description: "The free form of the application metadata of an image" })
export class ApplicationMetadataItemFreeValue extends Map<string, any>
{

}

@ApiExtraModels(GenerationRecipe, ApplicationMetadataItemFreeValue)
@ApiSchema({ description: "The application metadata item specific to an extension" })
export class ApplicationMetadataItem
{

  constructor(extensionId: string, value: GenerationRecipe | Json)
  {
    this.extensionId = extensionId;
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The identifier of the extension",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "extension-id"
    }
  )
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @IsDefined()
  @NotEquals(null)
  @IsString()
  @Expose()
  readonly extensionId: string;

  @ApiProperty(
    {
      description: "The application metadata item associated with an extension",
      oneOf:
        [
          {
            description: "The image recipe",
            $ref: getSchemaPath(GenerationRecipe)
          },
          {
            description: "The image free metadata value",
            $ref: getSchemaPath(ApplicationMetadataItemFreeValue)
          }
        ],
      required: true
    }
  )
  @ValidateNested()
  @Type((type) =>
  {
    if (type?.object?.value["modelTags"])
    {
      return GenerationRecipe;
    }
    else
    {
      return ApplicationMetadataItemFreeValue;
    }
  })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly value: GenerationRecipe | Json;

}

@ApiSchema({ description: "The application metadata" })
export class ApplicationMetadata
{

  constructor(items: ApplicationMetadataItem[])
  {
    this.items = items;
  }

  @ApiProperty(
    {
      description: "The application metadata items",
      type: ApplicationMetadataItem,
      isArray: true,
      required: true
    }
  )
  @Type(() => ApplicationMetadataItem)
  @IsArray()
  @ValidateNested({ each: true })
  @Expose()
  readonly items: ApplicationMetadataItem[];

}

/**
 * All feature types.
 */
export enum ImageFeatureType
{
  CAPTION = "caption",
  DESCRIPTION = "description",
  COMMENT = "comment",
  METADATA = "metadata",
  RECIPE = "recipe",
  OTHER = "other"
}

/**
 * All feature formats.
 */
export enum ImageFeatureFormat
{
  STRING = "string",
  JSON = "json",
  XML = "xml",
  MARKDOWN = "markdown",
  HTML = "html",
  BINARY = "binary"
}

/**
 * The image feature.
 */

@ApiExtraModels(GenerationRecipe)
@ApiSchema({ description: "The image features" })
export class ImageFeature
{

  constructor(type: ImageFeatureType, format: ImageFeatureFormat, name: string | undefined, value: string)
  {
    this.type = type;
    this.format = format;
    this.name = name;
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The image feature type",
      required: true,
      enum: ImageFeatureType,
      enumName: "ImageFeatureType",
      enumSchema: {
        description: "All the possible types for an image feature.",
        default: ImageFeatureType.OTHER
      }
    }
  )
  @IsEnum(ImageFeatureType)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly type: ImageFeatureType;

  @ApiProperty(
    {
      description: "The image feature format",
      enum: ImageFeatureFormat,
      enumName: "ImageFeatureFormat",
      enumSchema: {
        description: "All the possible formats for an image feature.",
        default: ImageFeatureFormat.STRING
      },
      required: true
    }
  )
  @IsEnum(ImageFeatureFormat)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly format: ImageFeatureFormat;

  @ApiProperty(
    {
      description: "The image feature name",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.technical,
      required: false,
      example: "field"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.technical)
  @IsOptional()
  @Expose()
  readonly name?: string;

  @ApiProperty(
    {
      description: "The image feature value",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.value,
      required: true,
      example: "Three women in a flower arrangement"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.value)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly value: string;

}

/**
 * The different ways an image should be resized.
 */
export enum ImageResizeRender
{
  Inbox = "inbox",
  Outbox = "outbox"
}

/**
 * An image feature for an extension.
 */
@ApiExtraModels(ImageFeature)
@ApiSchema({ description: "The image features, along with its extension identifier" })
export class ExtensionImageFeature extends ImageFeature
{

  constructor(id: string, type: ImageFeatureType, format: ImageFeatureFormat, name: string | undefined, value: string)
  {
    super(type, format, name, value);
    this.id = id;
  }

  @ApiProperty(
    {
      description: "The extension identifier",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true
    }
  )
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @Expose()
  readonly id: string;

}

export type AllImageFeatures = ExtensionImageFeature[];

/**
 * An image tag for an extension.
 */
@ApiSchema({ description: "A tag on an image for a given extension" })
export class ExtensionImageTag
{

  // The maximum number of tags an image can have for a single extension
  static readonly PER_EXTENSION_TAGS_MAXIMUM = 256;

  // The maximum number of features an image can have for a single extension
  static readonly PER_EXTENSION_FEATURES_MAXIMUM = 32;

  constructor(id: string, value: string)
  {
    this.id = id;
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The extension identifier",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "extension-id"
    }
  )
  @IsString()
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The image tag value",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.technical,
      required: true
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.technical)
  @Expose()
  readonly value: ImageTag;

}

export type AllExtensionImageTags = ExtensionImageTag[];

/**
 * An image embeddings individual element.
 */
export type ImageEmbedding = number;

/**
 * An image embeddings vector.
 */
@ApiSchema({ description: "A vectorial representation of an image" })
export class ImageEmbeddings
{

  // The value for the "VGG-16 / VGG-19" models, https://en.wikipedia.org/wiki/VGGNet, which is known to be the second largest commonly used image embeddings dimension, after the "ViT-22B" with a dimension of 6144, https://arxiv.org/abs/2302.05442
  static readonly DIMENSION_MAXIMUM = 4_096;

  constructor(values: ImageEmbedding[])
  {
    this.values = values;
  }

  @ApiProperty(
    {
      description: "The image embeddings vector",
      type: Number,
      format: "double",
      isArray: true,
      minItems: 1,
      maxItems: ImageEmbeddings.DIMENSION_MAXIMUM,
      required: true
    }
  )
  @IsNumber({}, { each: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ImageEmbeddings.DIMENSION_MAXIMUM)
  @Expose()
  readonly values: ImageEmbedding[];

}

/**
 * The image embeddings vectors computed by an extension.
 */
@ApiSchema({ description: "Multiple vectorial representations of an image" })
export class ExtensionImageEmbeddings extends ImageEmbeddings
{

  constructor(id: string, values: ImageEmbedding[])
  {
    super(values);
    this.id = id;
  }

  @ApiProperty(
    {
      description: "The extension identifier",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true
    }
  )
  @Matches(computeIdPattern(FieldLengths.shortTechnical))
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @Expose()
  readonly id: string;

}

export type AllImageEmbeddings = ExtensionImageEmbeddings[];

/**
 * A summary of an image.
 */
@ApiSchema({ description: "Basic information about an image" })
export class ImageSummary extends Dates
{

  constructor(id: string, repositoryId: string, parentId: string | undefined, name: string, format: ImageFormat, uri: string, url: string, sourceUrl: string | undefined, creationDate: number, modificationDate: number, sizeInBytes: number, dimensions: ImageDimensions, fileDates: Dates)
  {
    super(creationDate, modificationDate);
    this.id = id;
    this.repositoryId = repositoryId;
    this.parentId = parentId;
    this.name = name;
    this.format = format;
    this.uri = uri;
    this.url = url;
    this.sourceUrl = sourceUrl;
    this.sizeInBytes = sizeInBytes;
    this.dimensions = dimensions;
    this.fileDates = fileDates;
  }

  @ApiProperty(
    {
      description: "The unique identifier of the image",
      type: String,
      pattern: uniqueIdPattern,
      minLength: FieldLengths.uid,
      maxLength: FieldLengths.uid,
      required: true,
      example: imageIdSchema.example
    }
  )
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The unique identifier of the repository it belongs to",
      type: String,
      pattern: uniqueIdPattern,
      minLength: FieldLengths.uid,
      maxLength: FieldLengths.uid,
      required: true,
      example: repositoryIdSchema.example
    }
  )
  @Expose()
  readonly repositoryId: string;

  @ApiProperty(
    {
      description: "The unique identifier of the image parent",
      type: String,
      pattern: uniqueIdPattern,
      minLength: FieldLengths.uid,
      maxLength: FieldLengths.uid,
      required: false
    }
  )
  @Expose()
  readonly parentId?: string;

  @ApiProperty(
    {
      description: "The image name",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.fileName,
      required: true,
      example: "fileName.png"
    }
  )
  @Expose()
  readonly name: string;

  @ApiProperty(
    {
      description: "The image format",
      enum: ImageFormat,
      enumName: "ImageFormat",
      required: true,
      example: ImageFormat.PNG
    }
  )
  @Expose()
  readonly format: ImageFormat = ImageFormat.PNG;

  @ApiProperty(
    {
      description: "The image MIME type",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: true,
      example: "image/jpeg"
    }
  )
  @Expose()
  mimeType(): string
  {
    return toMimeType(this.format);
  }

  @ApiProperty(
    {
      description: "The image URI",
      type: String,
      pattern: fileUrlPattern,
      minLength: 8,
      maxLength: FieldLengths.filePath,
      required: true,
      example: "file:///Users/me/image//path/fileName.png"
    }
  )
  @Expose()
  readonly uri: string;

  @ApiProperty(
    {
      description: "The image URL",
      type: String,
      pattern: fileUrlPattern,
      minLength: 8,
      maxLength: FieldLengths.filePath,
      required: true,
      example: "file:///Users/me/image//path/fileName.png"
    }
  )
  @Expose()
  readonly url: string;

  @ApiProperty(
    {
      description: "The image source URL",
      type: String,
      format: "uri",
      pattern: urlPattern,
      minLength: 8,
      maxLength: FieldLengths.url,
      required: false,
      example: "https://static1.smartbear.co/swagger/media/assets/images/swagger_logo.svg"
    }
  )
  @Expose()
  readonly sourceUrl?: string;

  @ApiProperty(
    {
      description: "The image size in bytes",
      type: Number,
      minimum: 0,
      exclusiveMinimum: true,
      required: true
    }
  )
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly sizeInBytes: number;

  @ApiProperty(
    {
      description: "The image dimensions",
      type: ImageDimensions,
      required: true
    }
  )
  @Expose()
  readonly dimensions: ImageDimensions;

  @ApiProperty(
    {
      description: "The image file dates",
      type: Dates,
      required: true
    }
  )
  @Expose()
  readonly fileDates: Dates;

}

/**
 * A list of images following a filtered query.
 */
@ApiSchema({ description: "a list of basic information about images" })
export class ImageSummaryList
{

  constructor(entities: ImageSummary[], totalCount: number)
  {
    this.entities = entities;
    this.totalCount = totalCount;
  }

  @ApiProperty(
    {
      description: "The image entities",
      type: ImageSummary,
      isArray: true,
      required: true
    }
  )
  @Expose()
  readonly entities: ImageSummary[];

  @ApiProperty(
    {
      description: "The total number of image entities",
      type: Number,
      format: "int64",
      minimum: 0,
      required: true
    }
  )
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly totalCount: number;

}

/**
 * The distances of an image given an embedding.
 */
@ApiSchema({ description: "The vectorial distance with a reference image" })
export class ImageDistance
{

  constructor(distance: number, image: ImageSummary)
  {
    this.distance = distance;
    this.image = image;
  }

  @ApiProperty(
    {
      description: "The distance of the image to the embeddings",
      type: Number,
      format: "double",
      minimum: 0,
      required: true
    }
  )
  @IsNumber()
  @Type(() => Number)
  @Expose()
  readonly distance: number;

  @ApiProperty(
    {
      description: "The image summary",
      type: ImageSummary,
      required: true
    }
  )
  @Type(() => ImageSummary)
  @Expose()
  readonly image: ImageSummary;

}

export type ImageDistances = ImageDistance[];

/**
 * All the information about an image.
 */
@ApiSchema({ description: "Comprehensive information about an image" })
export class Image extends ImageSummary
{

  static readonly IMAGE_MAXIMUM_BINARY_WEIGHT_IN_BYTES = 32 * 1_024 * 1_024;

  static readonly ATTACHMENT_MAXIMUM_BINARY_WEIGHT_IN_BYTES = 1_024 * 1_024;

  constructor(id: string, repositoryId: string, parentId: string | undefined, name: string, format: ImageFormat, uri: string, url: string, sourceUrl: string | undefined, creationDate: number, modificationDate: number, sizeInBytes: number, dimensions: ImageDimensions, fileDates: Dates, metadata: ImageMetadata, features: ExtensionImageFeature[], tags: ExtensionImageTag[])
  {
    super(id, repositoryId, parentId, name, format, uri, url, sourceUrl, creationDate, modificationDate, sizeInBytes, dimensions, fileDates);
    this.metadata = metadata;
    this.features = features;
    this.tags = tags;
  }

  @ApiProperty(
    {
      description: "The image metadata",
      type: ImageMetadata,
      required: true
    }
  )
  @Expose()
  readonly metadata: ImageMetadata;

  @ApiProperty(
    {
      description: "The image features",
      type: ExtensionImageFeature,
      isArray: true,
      required: true
    }
  )
  @Expose()
  readonly features: ExtensionImageFeature[];

  @ApiProperty(
    {
      description: "The image tags",
      type: ExtensionImageTag,
      isArray: true,
      required: true
    }
  )
  @Expose()
  readonly tags: ExtensionImageTag[];

}

@ApiSchema({ description: "The computed format of an image" })
export class ComputedImageFormat
{

  constructor(value: ImageFormat)
  {
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The value",
      enum: ImageFormat,
      enumName: "ImageFormat",
      required: true
    }
  )
  @IsDefined()
  @IsEnum(ImageFormat)
  @Expose()
  value: ImageFormat;

}
