import { Expose, Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
  ValidateNested
} from "class-validator";
import { ApiExtraModels, ApiProperty, ApiSchema, getSchemaPath } from "@nestjs/swagger";

import { TypeBasedValidation } from "./validators.dtos";
import { deepObjectTransform, forceArray, forceBoolean, transformStringifyJson } from "./transformers.dtos";
import {
  FieldLengths,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageFeatureValue,
  ImageFormat,
  imageIdSchema,
  repositoryIdSchema,
  technicalSchema
} from "./common.dtos";


@ApiSchema({ description: "The textual specifications to match when searching for images, i.e. how an image search should operate regarding the images multiple texts" })
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
  @Transform(forceBoolean)
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
  @Transform(forceBoolean)
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
  @Transform(forceBoolean)
  @IsBoolean()
  @Expose()
  readonly inFeatures: boolean;

}

@ApiSchema({ description: "The matching values of tags to match when searching for images, i.e. how an image search should operate regarding the image tags" })
export class SearchTags
{

  constructor(values: string[])
  {
    this.values = values;
  }

  @ApiProperty(
    {
      ...technicalSchema,
      description: "The tags to search for, i.e. images matching at least of the tags will be included in the result",
      type: String,
      isArray: true,
      required: true,
      example: ["nature"]
    }
  )
  @IsString({ each: true })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly values: string[];

}

/**
 * All the search feature operators.
 */
export enum SearchFeatureComparisonOperator
{
  EQUALS = "equals",
  DIFFERENT = "different",
  CONTAINS = "contains",
  GREATER_THAN = "greaterThan",
  GREATER_THAN_OR_EQUAL = "greaterThanOrEqual",
  LESS_THAN = "lessThan",
  LESS_THAN_OR_EQUAL = "lessThanOrEqual"
}

@ApiSchema({ description: "A condition expression for filtering image features" })
export class SearchFeatureCondition
{

  constructor(type: ImageFeatureType | undefined, format: ImageFeatureFormat, name: string | undefined, operator: SearchFeatureComparisonOperator, value: ImageFeatureValue)
  {
    this.type = type;
    this.format = format;
    this.name = name;
    this.operator = operator;
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The image feature type",
      enum: ImageFeatureType,
      enumName: "ImageFeatureType",
      required: false,
      example: "nature"
    }
  )
  @IsEnum(ImageFeatureType)
  @IsOptional()
  @Expose()
  readonly type?: ImageFeatureType;

  @ApiProperty(
    {
      description: "The image feature format",
      enum: ImageFeatureFormat,
      enumName: "ImageFeatureFormat",
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
      description: "The image feature comparison operator",
      enum: SearchFeatureComparisonOperator,
      enumName: "SearchFeatureComparisonOperator",
      required: true
    }
  )
  @IsEnum(SearchFeatureComparisonOperator)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly operator: SearchFeatureComparisonOperator;

  @ApiProperty(
    {
      description: "The image feature value",
      oneOf:
        [
          { type: "string", maxLength: FieldLengths.value },
          { type: "number", format: "int64" },
          { type: "number", format: "double" },
          { type: "boolean" }
        ],
      required: true,
      example: "Three women in a flower arrangement"
    }
  )
  @TypeBasedValidation({
    "string": [MaxLength(FieldLengths.value)],
    "number": [],
    "boolean": []
  })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly value: ImageFeatureValue;

}

/**
 * All the search feature types.
 */
export enum SearchFeatureLogicalOperator
{
  OR = "or",
  AND = "and",
  NOT = "not"
}

@ApiSchema({ description: "The expression for filtering image features" })
export class SearchFeatures
{

  constructor(operator: SearchFeatureLogicalOperator, conditions: SearchFeatureCondition[], features: SearchFeatures | undefined)
  {
    this.operator = operator;
    this.conditions = conditions;
    this.features = features;
  }

  @ApiProperty(
    {
      description: "The logical operator",
      enum: SearchFeatureLogicalOperator,
      enumName: "SearchFeatureLogicalOperator",
      required: true,
      example: "or"
    }
  )
  @IsEnum(SearchFeatureLogicalOperator)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly operator: SearchFeatureLogicalOperator;

  @ApiProperty(
    {
      description: "The search conditions",
      type: SearchFeatureCondition,
      isArray: true,
      required: true
    }
  )
  @Type(() => SearchFeatureCondition)
  @ValidateNested({ each: true })
  @IsArray()
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly conditions: SearchFeatureCondition[];

  @ApiProperty(
    {
      description: "Other nested search features",
      type: SearchFeatures,
      required: false
    }
  )
  @Type(() => SearchFeatures)
  @ValidateNested()
  @IsOptional()
  @Expose()
  readonly features?: SearchFeatures;

}

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

@ApiSchema({ description: "Technical properties to match when searching for images, i.e. how an image search should operate regarding the image technical properties" })
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

@ApiSchema({ description: "Criteria when searching for images" })
export class SearchCriteria
{

  constructor(formats?: ImageFormat[], keyword?: SearchKeyword, tags?: SearchTags, features?: SearchFeatures, properties?: SearchProperties)
  {
    this.formats = formats;
    this.keyword = keyword;
    this.tags = tags;
    this.features = features;
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
      description: "A filter which limits the result entities with the provided features specifications",
      type: SearchFeatures,
      required: false
    }
  )
  @ValidateNested()
  @Transform(deepObjectTransform(SearchFeatures))
  @Type(() => SearchFeatures)
  @IsOptional()
  @Expose()
  readonly features?: SearchFeatures;

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
 * All the search origin types.
 */
export enum SearchOriginKind
{
  Repositories = "repositories",
  Images = "images"
}

@ApiSchema({ description: "Defines the image sources for a search" })
export class BasisSearchOrigin
{

  constructor(kind: SearchOriginKind)
  {
    this.kind = kind;
  }

  @ApiProperty(
    {
      description: "Indicates how the search result entities should be sorted",
      enum: SearchOriginKind,
      enumName: "SearchOriginNature",
      required: true,
      example: SearchOriginKind.Repositories
    }
  )
  @IsEnum(SearchOriginKind)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly kind: SearchOriginKind;

}

@ApiSchema({ description: "A repositories-based search origin, involving that the images should belong to the designed repositories" })
export class SearchRepositoriesOrigin extends BasisSearchOrigin
{

  constructor(ids: string[])
  {
    super(SearchOriginKind.Repositories);
    this.ids = ids;
  }

  @ApiProperty(
    {
      ...repositoryIdSchema,
      description: "The repository identifiers",
      type: String,
      isArray: true,
      required: true
    }
  )
  @Transform(forceArray)
  @IsString({ each: true })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly ids: string[];

}

@ApiSchema({ description: "A images-based search origin, involving that the images should be part of the designed image identifiers" })
export class SearchImagesOrigin extends BasisSearchOrigin
{

  constructor(ids: string[])
  {
    super(SearchOriginKind.Images);
    this.ids = ids;
  }

  @ApiProperty(
    {
      ...imageIdSchema,
      description: "The image identifiers",
      type: String,
      isArray: true,
      required: true
    }
  )
  @Transform(forceArray)
  @IsString({ each: true })
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly ids: string[];

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
  @Transform(forceBoolean)
  @IsBoolean()
  @IsOptional()
  @Expose()
  readonly isAscending?: boolean;

}

@ApiExtraModels(SearchRepositoriesOrigin, SearchImagesOrigin)
@ApiSchema({ description: "A search criteria combined to sorting specifications" })
export class SearchFilter
{

  constructor(criteria?: SearchCriteria, origin?: SearchRepositoriesOrigin | SearchImagesOrigin, sorting?: SearchSorting)
  {
    this.criteria = criteria;
    this.origin = origin;
    this.sorting = sorting;
  }

  @ApiProperty(
    {
      description: "The criteria that will be applied when applying filter",
      type: SearchCriteria,
      required: false
    }
  )
  @Transform(transformStringifyJson<SearchCriteria>(SearchCriteria))
  @ValidateNested()
  @Type(() => SearchCriteria)
  @IsOptional()
  @Expose()
  readonly criteria?: SearchCriteria;

  @ApiProperty(
    {
      description: "The origin of the images to search in",
      oneOf:
        [
          {
            description: "In case of a repositories-based origin",
            $ref: getSchemaPath(SearchRepositoriesOrigin)
          },
          {
            description: "In case of a images-based origin",
            $ref: getSchemaPath(SearchImagesOrigin)
          }
        ],
      discriminator:
        {
          propertyName: "kind",
          mapping:
            {
              [SearchOriginKind.Repositories]: getSchemaPath(SearchRepositoriesOrigin),
              [SearchOriginKind.Images]: getSchemaPath(SearchImagesOrigin)
            }
        },
      required: false
    }
  )
  @Transform(transformStringifyJson<SearchRepositoriesOrigin | SearchImagesOrigin>(undefined, (object: any) =>
  {
    return object["kind"] === SearchOriginKind.Repositories ? SearchRepositoriesOrigin : SearchImagesOrigin;
  }))
  @ValidateNested()
  @Type(() => BasisSearchOrigin,
    {
      discriminator:
        {
          property: "kind",
          subTypes:
            [
              { value: SearchRepositoriesOrigin, name: SearchOriginKind.Repositories },
              { value: SearchImagesOrigin, name: SearchOriginKind.Images }
            ]
        },
      keepDiscriminatorProperty: true
    })
  @IsOptional()
  @Expose()
  readonly origin?: SearchRepositoriesOrigin | SearchImagesOrigin;

  @ApiProperty(
    {
      description: "Indicates how the images should be sorted",
      type: SearchSorting,
      required: false
    }
  )
  @Transform(transformStringifyJson<SearchSorting>(SearchSorting))
  @ValidateNested()
  @Type(() => SearchSorting)
  @IsOptional()
  @Expose()
  readonly sorting?: SearchSorting;

}
