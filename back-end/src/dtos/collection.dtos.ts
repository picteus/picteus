import { Expose, Type } from "class-transformer";
import { IsDefined, IsInt, NotEquals, ValidateNested } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { WithIdCreationDateNameComment } from "./common.dtos";
import { SearchFilter } from "./search.dtos";


@ApiSchema({ description: "The specifications for defining a collection of images" })
export class Collection extends WithIdCreationDateNameComment
{

  constructor(id: number, creationDate: number, modificationDate: number, name: string, comment: string | undefined, filter: SearchFilter)
  {
    super(id, creationDate, name, comment);
    this.modificationDate = modificationDate;
    this.filter = filter;
  }

  @ApiProperty(
    {
      description: "The entity creation date",
      type: Number,
      format: "int64",
      required: true,
      example: 1771937596
    }
  )
  @IsInt()
  @Type(() => Number)
  @IsDefined()
  @Expose()
  readonly modificationDate: number;

  @ApiProperty(
    {
      description: "The filter which applies for the collection",
      type: SearchFilter,
      required: true
    }
  )
  @Type(() => SearchFilter)
  @IsDefined()
  @NotEquals(null)
  @ValidateNested()
  @Expose()
  readonly filter: SearchFilter;

}
