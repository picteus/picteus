import { Expose } from "class-transformer";
import { IsOptional, IsString, Matches } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { urlPattern } from "./common.dtos";

/**
 * The application settings.
 */
@ApiSchema({ description: "The application overall settings" })
export class Settings
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
