import { Expose, Type } from "class-transformer";
import { IsDefined, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength, NotEquals } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { FieldLengths, WithIdCreationDateNameComment } from "./common.dtos";


export enum ApiSecretType
{
  Key = "key",
  Token = "token"
}

@ApiSchema({ description: "Basic information about an API secret, i.e. the API secret summary" })
export class ApiSecretSummary extends WithIdCreationDateNameComment
{

  constructor(id: number, type: ApiSecretType, creationDate: number, expirationDate: number | undefined, name: string, comment?: string)
  {
    super(id, creationDate, name, comment);
    this.type = type;
    this.expirationDate = expirationDate;
  }

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

}

export const apiScopesSeparator = ",";

@ApiSchema({ description: "Detailed information about an API secret, including its secret and its scope" })
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
