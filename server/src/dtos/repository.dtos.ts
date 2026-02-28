import { Expose } from "class-transformer";
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import {
  computeIdPattern,
  Dates,
  FieldLengths,
  fileUrlPattern,
  fileWithProtocol,
  namePattern,
  repositoryIdSchema,
  uniqueIdPattern
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
      ...repositoryIdSchema,
      description: "The unique identifier of the repository",
      type: String,
      required: true
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
      ...repositoryIdSchema,
      description: "The unique identifier of the repository",
      type: String,
      required: true
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
