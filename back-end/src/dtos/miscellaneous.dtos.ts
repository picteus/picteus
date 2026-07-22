import { Expose } from "class-transformer";
import { IsOptional, IsString, Matches } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { urlPattern } from "./common.dtos";


@ApiSchema({ description: "The application configuration" })
export class ApplicationConfiguration
{

  constructor(unpackedExtensionsDirectoryPath?: string)
  {
    this.unpackedExtensionsDirectoryPath = unpackedExtensionsDirectoryPath;
  }

  @ApiProperty(
    {
      description: "The directory path where unpacked extensions are located",
      type: String,
      required: false
    }
  )
  @IsString()
  @IsOptional()
  @Expose()
  unpackedExtensionsDirectoryPath?: string;

}

@ApiSchema({ description: "The application overall settings" })
export class ApplicationSettings
{

  constructor(comfyUiBaseUrl?: string)
  {
    this.comfyUiBaseUrl = comfyUiBaseUrl;
  }

  @ApiProperty(
    {
      description: "The ComfyUI base URL",
      type: String,
      pattern: urlPattern,
      required: false
    }
  )
  @IsString()
  @Matches(urlPattern)
  @IsOptional()
  @Expose()
  comfyUiBaseUrl?: string;

}
