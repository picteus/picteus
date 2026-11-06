import { ApiProperty, ApiSchema } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsOptional, IsString, NotEquals, ValidateNested } from "class-validator";

import { ExtensionManual, Manifest } from "./extension.dtos";


@ApiSchema({ description: "The marketplace extension" })
export class MarketplaceExtension
{

  constructor(manifest: Manifest, icon?: string)
  {
    this.manifest = manifest;
    this.icon = icon;
  }

  @ApiProperty(
    {
      description: "The extension manifest",
      type: Manifest,
      required: true
    }
  )
  @Type(() => Manifest)
  @ValidateNested()
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly manifest: Manifest;

  @ApiProperty(
    {
      description: "The base64 data URI of the icon in SVG or PNG",
      type: String,
      required: false,
      example: "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%22-52%20-53%20100%20100%22%20stroke-width%3D%222%22%3E%0A%20%3Cg%20fill%3D%22none%22%3E%0A%20%20%3Cellipse%20stroke%3D%22%2366899a%22%20rx%3D%226%22%20ry%3D%2244%22%2F%3E%0A%20%20%3Cellipse%20stroke%3D%22%23e1d85d%22%20rx%3D%226%22%20ry%3D%2244%22%20transform%3D%22rotate(-66)%22%2F%3E%0A%20%20%3Cellipse%20stroke%3D%22%2380a3cf%22%20rx%3D%226%22%20ry%3D%2244%22%20transform%3D%22rotate(66)%22%2F%3E%0A%20%20%3Ccircle%20%20stroke%3D%22%234b541f%22%20r%3D%2244%22%2F%3E%0A%20%3C%2Fg%3E%0A%20%3Cg%20fill%3D%22%2366899a%22%20stroke%3D%22white%22%3E%0A%20%20%3Ccircle%20fill%3D%22%2380a3cf%22%20r%3D%2213%22%2F%3E%0A%20%20%3Ccircle%20cy%3D%22-44%22%20r%3D%229%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%22-40%22%20cy%3D%2218%22%20r%3D%229%22%2F%3E%0A%20%20%3Ccircle%20cx%3D%2240%22%20cy%3D%2218%22%20r%3D%229%22%2F%3E%0A%20%3C%2Fg%3E%0A%3C%2Fsvg%3E%0A"
    }
  )
  @IsOptional()
  @IsString()
  @Expose()
  readonly icon?: string;

}

@ApiSchema({ description: "The details of a marketplace extension" })
export class MarketplaceExtensionDetails extends MarketplaceExtension
{

  constructor(manifest: Manifest, icon?: string, manual?: ExtensionManual)
  {
    super(manifest, icon);
    this.manual = manual;
  }

  @ApiProperty(
    {
      description: "The extension manual instructions",
      type: ExtensionManual,
      required: false
    }
  )
  @Type(() => ExtensionManual)
  @IsOptional()
  @Expose()
  readonly manual?: ExtensionManual;

}
