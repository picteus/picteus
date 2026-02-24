import { Expose, Type } from "class-transformer";
import { IsDefined, IsInt, IsOptional, NotEquals, ValidateNested } from "class-validator";
import { ApiProperty, ApiSchema } from "@nestjs/swagger";

import { WithIdCreationDateNameComment } from "./common.dtos";
import { SearchCriteria, SearchSorting } from "./repository.dtos";


@ApiSchema({ description: "The filter of a collection" })
export class CollectionFilter
{

  constructor(criteria: SearchCriteria, sorting?: SearchSorting)
  {
    this.criteria = criteria;
    this.sorting = sorting;
  }

  @ApiProperty(
    {
      description: "The criteria that will be applied when applying filter",
      type: SearchCriteria,
      required: true
    }
  )
  @ValidateNested()
  @Type(() => SearchCriteria)
  @IsDefined()
  @NotEquals(null)
  @Expose()
  readonly criteria: SearchCriteria;

  @ApiProperty(
    {
      description: "Indicates how the images should be sorted",
      type: SearchSorting,
      required: false
    }
  )
  @ValidateNested()
  @Type(() => SearchSorting)
  @IsOptional()
  @Expose()
  readonly sorting?: SearchSorting;

}

@ApiSchema({ description: "The specifications for defining a collection of images" })
export class Collection extends WithIdCreationDateNameComment
{

  constructor(id: number, creationDate: number, modificationDate: number, name: string, comment: string | undefined, filter: CollectionFilter)
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
      type: CollectionFilter,
      required: true
    }
  )
  @Type(() => CollectionFilter)
  @IsDefined()
  @NotEquals(null)
  @ValidateNested()
  @Expose()
  readonly filter: CollectionFilter;

}
