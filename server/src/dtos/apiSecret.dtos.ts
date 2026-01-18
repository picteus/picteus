import { Expose, Type } from "class-transformer";
import { IsDefined, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength, NotEquals } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { FieldLengths } from "./common.dtos";


export enum ApiSecretType
{
  Key = "key",
  Token = "token"
}

/**
 * The API secret summary.
 */
@ApiSchema({ description: "Basic information about an API secret" })
export class ApiSecretSummary
{

  constructor(id: number, type: ApiSecretType, creationDate: number, expirationDate: number | undefined, name: string, comment: string | undefined)
  {
    this.id = id;
    this.type = type;
    this.creationDate = creationDate;
    this.expirationDate = expirationDate;
    this.name = name;
    this.comment = comment;
  }

  @ApiProperty(
    {
      description: "The secret identifier",
      type: Number,
      required: true,
      example: 123
    }
  )
  @IsInt()
  @IsDefined()
  @Expose()
  readonly id: number;

  @ApiProperty(
    {
      description: "The secret type",
      enum: ApiSecretType,
      enumName: "ApiSecretType",
      required: true,
      example: ApiSecretType.Key
    }
  )
  @IsEnum(ApiSecretType)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly type: ApiSecretType;

  @ApiProperty(
    {
      description: "The entity creation date",
      type: Number,
      format: "int64",
      required: true,
      example: 1761384334302
    }
  )
  @IsDefined()
  @IsInt()
  @Type(() => Number)
  @Expose()
  readonly creationDate: number;

  @ApiProperty(
    {
      description: "The entity expiration date",
      type: Number,
      format: "int64",
      required: false,
      example: 1761385316688
    }
  )
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  @Expose()
  readonly expirationDate?: number;

  @ApiProperty(
    {
      description: "The secret name",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.name,
      required: true,
      example: "My key"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.name)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly name: string;

  @ApiProperty(
    {
      description: "The secret comment",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.comment,
      required: false,
      example: "For the xxx application"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.comment)
  @IsOptional()
  @Expose()
  readonly comment?: string;

}

export const apiScopesSeparator = ",";

/**
 * The API secret.
 */
@ApiSchema({ description: "Detailed information about an API secret" })
export class ApiSecret extends ApiSecretSummary
{

  constructor(id: number, type: ApiSecretType, creationDate: number, expirationDate: number | undefined, name: string, comment: string | undefined, scope: string | undefined, value: string)
  {
    super(id, type, creationDate, expirationDate, name, comment);
    this.scope = scope;
    this.value = value;
  }

  @ApiProperty(
    {
      description: "The secret scope",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.technical,
      required: false,
      example: "image:read,repository:read"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.technical)
  @IsOptional()
  @Expose()
  readonly scope?: string;

  @ApiProperty(
    {
      description: "The secret value",
      type: String,
      minLength: 1,
      maxLength: FieldLengths.technical,
      required: true,
      example: "Z&Q78&fqkPq"
    }
  )
  @IsString()
  @MinLength(1)
  @MaxLength(FieldLengths.technical)
  @Expose()
  readonly value: string;

}
