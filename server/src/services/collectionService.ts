import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { logger } from "../logger";
import { EntitiesProvider } from "./databaseProviders";
import { Collection, CollectionFilter } from "../dtos/collection.dtos";


@Injectable()
export class CollectionService
  implements OnModuleInit, OnModuleDestroy
{

  constructor(private readonly entitiesProvider: EntitiesProvider)
  {
    logger.debug("Instantiating a CollectionService");
  }

  async onModuleInit(): Promise<void>
  {
    logger.debug("The initializing of a CollectionService is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a CollectionService");
    logger.debug("Destroyed a CollectionService");
  }

  async list(): Promise<Collection[]>
  {
    // TODO: to implement
    return [];
  }

  async create(name: string, comment: string, filter: CollectionFilter): Promise<Collection>
  {
    // TODO: to implement
    // @ts-ignore
    return undefined;
  }

  async get(id: number): Promise<Collection>
  {
    // TODO: to implement
    // @ts-ignore
    return undefined;
  }

  async update(id: number, name: string | undefined, comment: string | undefined, filter: CollectionFilter | undefined): Promise<Collection>
  {
    // TODO: to implement
    // @ts-ignore
    return undefined;
  }

  async delete(id: number): Promise<void>
  {
    // TODO: to implement
  }

}
