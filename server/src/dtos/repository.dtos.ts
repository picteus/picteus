import { Expose, Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
  ValidateNested
} from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { deepObjectTransform, forceArray, transformBoolean } from "./transformers.dtos";
import {
  computeIdPattern,
  Dates,
  FieldLengths,
  fileUrlPattern,
  fileWithProtocol,
  ImageFormat,
  namePattern,
  uniqueIdPattern,
  urlPattern
} from "./common.dtos";


/**
 * All image repository location types.
 */
export enum RepositoryLocationType
{
  File = "file"
}

/**
 * The definition of a repository type and its back-end location.
 */
@ApiSchema({ description: "The definition of a repository type and its back-end location" })
export class RepositoryLocation
{

  constructor(type: RepositoryLocationType, url: string)
  {
    this.type = type;
    this.url = url;
  }

  @ApiProperty(
    {
      description: "The type of the repository",
      enum: RepositoryLocationType,
      enumName: "RepositoryLocationType",
      required: true,
      default: RepositoryLocationType.File,
      example: RepositoryLocationType.File
    }
  )
  @IsEnum(RepositoryLocationType)
  @Expose()
  readonly type: RepositoryLocationType;

  @ApiProperty(
    {
      description: "The URL of the repository",
      type: String,
      format: "uri",
      pattern: fileUrlPattern,
      minLength: 8,
      maxLength: FieldLengths.url,
      required: true
    }
  )
  @IsString()
  @Matches(fileUrlPattern)
  @MinLength(1)
  @MaxLength(FieldLengths.url)
  @Expose()
  readonly url: string;

  toFilePath()
  {
    return this.url.substring(fileWithProtocol.length);
  }

}

/**
 * All the repository statuses.
 */
export enum RepositoryStatus
{
  UNAVAILABLE = "UNAVAILABLE",
  READY = "READY",
  INDEXING = "INDEXING",
  UNAVAILABLE_INDEXING = "UNAVAILABLE_INDEXING"
}

/**
 * A repository of images.
 */
@ApiSchema({ description: "A warehouse of images located in the same unit" })
export class Repository extends Dates
{

  constructor(creationDate: number, modificationDate: number, id: string, type: RepositoryLocationType, url: string, technicalId: string | undefined, name: string, comment: string | undefined, status: RepositoryStatus)
  {
    super(creationDate, modificationDate);
    this.id = id;
    this.type = type;
    this.url = url;
    this.technicalId = technicalId;
    this.name = name;
    this.comment = comment;
    this.status = status;
  }

  @ApiProperty(
    {
      description: "The unique identifier of the repository",
      type: String,
      pattern: uniqueIdPattern,
      minLength: FieldLengths.uid,
      maxLength: FieldLengths.uid,
      required: true,
      example: "9aa0820f-6405-4b54-a01a-a6b56489a77f"
    }
  )
  @IsString()
  @Matches(uniqueIdPattern)
  @MinLength(FieldLengths.uid)
  @MaxLength(FieldLengths.uid)
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The type of the repository back-end location",
      enum: RepositoryLocationType,
      enumName: "RepositoryLocationType",
      enumSchema: { description: "The possible types of repositories" },
      required: true,
      default: RepositoryLocationType.File,
      example: RepositoryLocationType.File
    }
  )
  @IsEnum(RepositoryLocationType)
  @Expose()
  readonly type: RepositoryLocationType;

  @ApiProperty(
    {
      description: "The URL of the repository back-end location",
      type: String,
      format: "uri",
      pattern: fileUrlPattern,
      minLength: 1,
      maxLength: FieldLengths.url,
      required: true,
      example: "file:///Users/me/folder/path"
    }
  )
  @IsString()
  @Matches(fileUrlPattern)
  @MinLength(1)
  @MaxLength(FieldLengths.url)
  @Expose()
  readonly url: string;

  @ApiProperty(
    {
      description: "The technical identifier of the repository",
      type: String,
      pattern: computeIdPattern(FieldLengths.shortTechnical),
      minLength: 1,
      maxLength: FieldLengths.shortTechnical,
      required: false,
      example: "technical-id"
    }
  )
  @IsString()
  @Matches(fileUrlPattern)
  @MinLength(1)
  @MaxLength(FieldLengths.shortTechnical)
  @IsOptional()
  @Expose()
  readonly technicalId?: string;

  @ApiProperty(
    {
      description: "The name of the repository",
      type: String,
      pattern: namePattern,
      minLength: 1,
      maxLength: FieldLengths.name,
      required: true,
      example: "myRepository"
    }
  )
  @IsString()
  @Matches(namePattern)
  @MinLength(1)
  @MaxLength(FieldLengths.name)
  @Expose()
  readonly name: string;

  @ApiProperty(
    {
      description: "The comment about the repository",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.comment,
      required: false,
      example: "A very interesting series of photos."
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.comment)
  @IsOptional()
  @Expose()
  readonly comment?: string;

  @ApiProperty(
    {
      description: "The status of the repository",
      enum: RepositoryStatus,
      enumName: "RepositoryStatus",
      required: true,
      example: RepositoryStatus.READY
    }
  )
  @IsEnum(RepositoryStatus)
  @Expose()
  readonly status: RepositoryStatus;

  getLocation()
  {
    return new RepositoryLocation(this.type, this.url);
  }

}

/**
 * A list of image repositories.
 */
export type RepositoryList = Repository[];

/**
 * All possible repository activity kinds.
 */
export enum RepositoryActivityKind
{
  None = "none",
  Synchronizing = "synchronizing",
  Watching = "watching"
}

/**
 * The activity of a repository.
 */
@ApiSchema({ description: "The activity of a repository" })
export class RepositoryActivity
{

  constructor(id: string, kind: RepositoryActivityKind)
  {
    this.id = id;
    this.kind = kind;
  }

  @ApiProperty(
    {
      description: "The unique identifier of the repository",
      type: String,
      pattern: uniqueIdPattern,
      minLength: FieldLengths.uid,
      maxLength: FieldLengths.uid,
      required: true,
      example: "9aa0820f-6405-4b54-a01a-a6b56489a77f"
    }
  )
  @IsString()
  @Matches(uniqueIdPattern)
  @MinLength(FieldLengths.uid)
  @MaxLength(FieldLengths.uid)
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The kind of activity of the repository",
      enum: RepositoryActivityKind,
      enumName: "RepositoryActivityKind",
      required: true,
      default: RepositoryActivityKind.None,
      example: RepositoryActivityKind.None
    }
  )
  @IsEnum(RepositoryActivityKind)
  @Expose()
  readonly kind: RepositoryActivityKind;

}

/**
 * A list of repository activities.
 */
export type RepositoryActivities = RepositoryActivity[];

/**
 * The media URL of an image.
 */
@ApiSchema({ description: "The medial URL of an image" })
export class ImageMediaUrl
{

  constructor(id: string, url: string)
  {
    this.id = id;
    this.url = url;
  }

  @ApiProperty(
    {
      description: "The unique identifier of the repository",
      type: String,
      pattern: uniqueIdPattern,
      minLength: FieldLengths.uid,
      maxLength: FieldLengths.uid,
      required: true,
      example: "9aa0820f-6405-4b54-a01a-a6b56489a77f"
    }
  )
  @IsString()
  @Matches(uniqueIdPattern)
  @MinLength(FieldLengths.uid)
  @MaxLength(FieldLengths.uid)
  @Expose()
  readonly id: string;

  @ApiProperty(
    {
      description: "The URL of the image that may be used to display it",
      type: String,
      pattern: urlPattern,
      required: true,
      example: "https://localhost:3001/resize/?u=file%3A%2F%2F%2FUsers%2Fuser%2Fimage.jpg&w=320"
    }
  )
  @IsString()
  @Matches(urlPattern)
  @Expose()
  readonly url: string;

}

/**
 * How an image search should operate regarding the images multiple texts.
 */
@ApiSchema({ description: "The textual specifications to match when searching for images" })
export class SearchKeyword
{

  constructor(text: string, inName: boolean, inMetadata: boolean, inFeatures: boolean)
  {
    this.text = text;
    this.inName = inName;
    this.inMetadata = inMetadata;
    this.inFeatures = inFeatures;
  }

  @ApiProperty(
    {
      description: "The text to search for",
      type: String,
      required: true,
      example: "comfy"
    }
  )
  @IsString()
  @Expose()
  readonly text: string;

  @ApiProperty(
    {
      description: "Whether the text should be searched in the image name",
      type: Boolean,
      required: true
    }
  )
  @Transform(transformBoolean)
  @IsBoolean()
  @Expose()
  readonly inName: boolean;

  @ApiProperty(
    {
      description: "Whether the text should be searched in the image metadata",
      type: Boolean,
      required: true
    }
  )
  @Transform(transformBoolean)
  @IsBoolean()
  @Expose()
  readonly inMetadata: boolean;

  @ApiProperty(
    {
      description: "Whether the text should be searched in the image features",
      type: Boolean,
      required: true
    }
  )
  @Transform(transformBoolean)
  @IsBoolean()
  @Expose()
  readonly inFeatures: boolean;

}

/**
 * How an image search should operate regarding the image tags.
 */
@ApiSchema({ description: "The matching values of tags to match when searching for images" })
export class SearchTags
{

  constructor(values: string[])
  {
    this.values = values;
  }

  @ApiProperty(
    {
      description: "The tags to search for",
      type: String,
      isArray: true,
      required: true,
      example: ["nature"]
    }
  )
  @IsArray()
  @ValidateNested({ each: true })
  @IsDefined()
  @Expose()
  readonly values: string[];

}

/**
 * The minimum and maximum value of a technical property when searching for images.
 */
@ApiSchema({ description: "The minimal and maximal value of a technical property when searching for images" })
export class SearchPropertyRange
{

  constructor(minimum?: number, maximum?: number)
  {
    this.minimum = minimum;
    this.maximum = maximum;
  }

  @ApiProperty(
    {
      description: "The minimal value",
      type: Number,
      format: "int64",
      minimum: 0,
      required: false,
      example: 0
    }
  )
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  @Expose()
  readonly minimum?: number;

  @ApiProperty(
    {
      description: "The maximal value",
      type: Number,
      format: "int64",
      required: false,
      example: 100
    }
  )
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  @Expose()
  readonly maximum?: number;

  toEntityString(entityName: string): string
  {
    return this.minimum === undefined && this.maximum === undefined ? "" : (`${entityName} belonging to ${this.minimum === undefined ? "]-inf" : ("[" + this.minimum)}, ${this.maximum === undefined ? "+inf[" : (`${this.maximum}]`)}`);
  }

}

/**
 * How an image search should operate regarding the image technical properties.
 */
@ApiSchema({ description: "Technical properties to match when searching for images" })
export class SearchProperties
{

  constructor(width?: SearchPropertyRange, height?: SearchPropertyRange, weightInBytes?: SearchPropertyRange, creationDate?: SearchPropertyRange, modificationDate?: SearchPropertyRange)
  {
    this.width = width;
    this.height = height;
    this.weightInBytes = weightInBytes;
    this.creationDate = creationDate;
    this.modificationDate = modificationDate;
  }

  @ApiProperty(
    {
      description: "The range of the image width",
      type: SearchPropertyRange,
      required: false
    }
  )
  @Type(() => SearchPropertyRange)
  @IsOptional()
  @Expose()
  readonly width?: SearchPropertyRange;

  @ApiProperty(
    {
      description: "The range of the image height",
      type: SearchPropertyRange,
      required: false
    }
  )
  @Type(() => SearchPropertyRange)
  @IsOptional()
  @Expose()
  readonly height?: SearchPropertyRange;

  @ApiProperty(
    {
      description: "The range of the image binary weight",
      type: SearchPropertyRange,
      required: false
    }
  )
  @Type(() => SearchPropertyRange)
  @IsOptional()
  @Expose()
  readonly weightInBytes?: SearchPropertyRange;

  @ApiProperty(
    {
      description: "The range of the image creation dates, expressed in milliseconds from 1970, January 1st",
      type: SearchPropertyRange,
      required: false
    }
  )
  @Type(() => SearchPropertyRange)
  @IsOptional()
  @Expose()
  readonly creationDate?: SearchPropertyRange;

  @ApiProperty(
    {
      description: "The range of the image modification dates, expressed in milliseconds from 1970, January 1st",
      type: SearchPropertyRange,
      required: false
    }
  )
  @Type(() => SearchPropertyRange)
  @IsOptional()
  @Expose()
  readonly modificationDate?: SearchPropertyRange;

}

/**
 * Criteria used when performing a search in images.
 */
@ApiSchema({ description: "Criteria when searching for images" })
export class SearchCriteria
{

  constructor(formats?: ImageFormat[], keyword?: SearchKeyword, tags?: SearchTags, properties?: SearchProperties)
  {
    this.formats = formats;
    this.keyword = keyword;
    this.tags = tags;
    this.properties = properties;
  }

  @ApiProperty(
    {
      description: "A filter used by the search which will limit the result entities to those having one of the provided image formats",
      enum: ImageFormat,
      enumName: "ImageFormat",
      isArray: true,
      required: false,
      default: [ImageFormat.PNG, ImageFormat.JPEG, ImageFormat.WEBP, ImageFormat.GIF, ImageFormat.AVIF, ImageFormat.HEIF],
      example: [ImageFormat.PNG, ImageFormat.JPEG]
    }
  )
  @Transform(forceArray)
  @IsEnum(ImageFormat, { each: true })
  @IsOptional()
  @Expose()
  readonly formats?: ImageFormat[];

  @ApiProperty(
    {
      description: "A filter which limits the result entities with the provided text specifications",
      type: SearchKeyword,
      required: false
    }
  )
  @ValidateNested()
  @Transform(deepObjectTransform(SearchKeyword))
  @Type(() => SearchKeyword)
  @IsOptional()
  @Expose()
  readonly keyword?: SearchKeyword;

  @ApiProperty(
    {
      description: "A filter which limits the result entities with the provided tags specifications",
      type: SearchTags,
      required: false
    }
  )
  @ValidateNested()
  @Transform(deepObjectTransform(SearchTags))
  @Type(() => SearchTags)
  @IsOptional()
  @Expose()
  readonly tags?: SearchTags;

  @ApiProperty(
    {
      description: "A filter which limits the result entities with the provided technical properties",
      type: SearchProperties,
      required: false
    }
  )
  @ValidateNested()
  @Transform(deepObjectTransform(SearchProperties))
  @Type(() => SearchProperties)
  @IsOptional()
  @Expose()
  readonly properties?: SearchProperties;

}

/**
 * All the properties which may be used to sort the result of an image search.
 */
export enum SearchSortingProperty
{
  Name = "name",
  CreationDate = "creationDate",
  ModificationDate = "modificationDate",
  ImportDate = "importDate",
  UpdateDate = "updateDate",
  BinarySize = "binarySize",
  Width = "width",
  Height = "height"
}

/**
 * The sorting of images following a search.
 */
@ApiSchema({ description: "Sorting instructions when searching for images" })
export class SearchSorting
{

  constructor(property: SearchSortingProperty, isAscending?: boolean)
  {
    this.property = property;
    this.isAscending = isAscending;
  }

  @ApiProperty(
    {
      description: "Indicates how the search result entities should be sorted",
      enum: SearchSortingProperty,
      enumName: "SearchSortingProperty",
      required: true,
      default: SearchSortingProperty.Name,
      example: SearchSortingProperty.Name
    }
  )
  @IsEnum(SearchSortingProperty)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly property: SearchSortingProperty;

  @ApiProperty(
    {
      description: "Whether the returned entities should be sorted in ascending or descending order in respect of the property",
      type: Boolean,
      required: false
    }
  )
  @Transform(transformBoolean)
  @IsBoolean()
  @IsOptional()
  @Expose()
  readonly isAscending?: boolean;

}

/**
 * Indicates how to restrict the number of entities following a search.
 */
@ApiSchema({ description: "A range of images to return when searching for images" })
export class SearchRange
{

  constructor(take?: number, skip?: number)
  {
    this.take = take;
    this.skip = skip;
  }

  @ApiProperty(
    {
      description: "The number of items to return",
      type: Number,
      format: "int64",
      minimum: 1,
      maximum: 1_000,
      required: false,
      default: 20,
      example: 20
    }
  )
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1_000)
  @IsOptional()
  @Expose()
  readonly take?: number;

  @ApiProperty(
    {
      description: "The number of items to skip",
      type: Number,
      format: "int64",
      minimum: 0,
      required: false,
      default: 0,
      example: 0
    }
  )
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  @Expose()
  readonly skip?: number;

}

/**
 * The criteria, sorting order and range when performing a search in images.
 */
@ApiSchema({ description: "Criteria, sorting and range parameter when searching for images" })
export class SearchParameters
{

  constructor(criteria?: SearchCriteria, sorting?: SearchSorting, range?: SearchRange)
  {
    this.criteria = criteria;
    this.sorting = sorting;
    this.range = range;
  }

  @ApiProperty(
    {
      description: "The criteria that will be applied to the search as a filter",
      type: SearchCriteria,
      required: false
    }
  )
  @ValidateNested()
  @Type(() => SearchCriteria)
  @IsOptional()
  @Expose()
  readonly criteria?: SearchCriteria;

  @ApiProperty(
    {
      description: "Indicates how the search results should be sorted",
      type: SearchSorting,
      required: false
    }
  )
  @ValidateNested()
  @Type(() => SearchSorting)
  @IsOptional()
  @Expose()
  readonly sorting?: SearchSorting;

  @ApiProperty(
    {
      description: "The range of items to consider following the search",
      type: SearchRange,
      required: false
    }
  )
  @ValidateNested()
  @Type(() => SearchRange)
  @IsOptional()
  @Expose()
  readonly range?: SearchRange;

}

@ApiSchema({ description: "Criteria, sorting and range parameter when searching for images, plus a list of repositories' identifiers" })
export class ImageSearchParameters extends SearchParameters
{

  constructor(criteria?: SearchCriteria, sorting?: SearchSorting, range?: SearchRange, ids?: string[])
  {
    super(criteria, sorting, range);
    this.ids = ids;
  }

  @ApiProperty(
    {
      description: "The repository identifiers the images should belong to",
      type: String,
      isArray: true,
      required: false
    }
  )
  @Transform(forceArray)
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  readonly ids?: string[];

}


