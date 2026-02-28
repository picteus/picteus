import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { instanceToPlain } from "class-transformer";

import { Collection as PersistedCollection } from ".prisma/client";

import { logger } from "../logger";
import { Collection, FieldLengths, SearchFilter } from "../dtos/app.dtos";
import { EntitiesProvider } from "./databaseProviders";
import { parametersChecker } from "./utils/parametersChecker";
import { plainToInstanceViaJSON } from "../utils";


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
    logger.debug("Listing all the collections");
    const entities = await this.entitiesProvider.collections.findMany({
      orderBy: { name: "asc" }
    });
    return entities.map(entity => this.toDto(entity));
  }

  async create(name: string, comment: string | undefined, filter: SearchFilter): Promise<Collection>
  {
    logger.debug(`Creating a collection with name '${name}${comment === undefined ? "" : (` and comment '${comment}'`)}'`);

    parametersChecker.checkString("name", name, FieldLengths.name);
    parametersChecker.checkString("comment", comment, FieldLengths.comment, undefined, true);

    if (await this.entitiesProvider.collections.findFirst({ where: { name } }) !== null)
    {
      parametersChecker.throwBadParameter("name", name, "a collection with the same name already exists");
    }

    const entity = await this.entitiesProvider.collections.create({
      data: { name, comment, filter: instanceToPlain(filter) }
    });
    return this.toDto(entity);
  }

  async get(id: number): Promise<Collection>
  {
    logger.debug(`Getting the collection with id '${id}'`);
    const entity = await this.getPersistedCollection(id);
    return this.toDto(entity);
  }

  async update(id: number, name: string | undefined, comment: string | undefined, filter: SearchFilter | undefined): Promise<Collection>
  {
    logger.debug(`Updating the collection with id '${id}'`);
    const entity = await this.getPersistedCollection(id);

    parametersChecker.checkString("name", name, FieldLengths.name, undefined, true);
    parametersChecker.checkString("comment", comment, FieldLengths.comment, undefined, true);
    if (name !== undefined)
    {
      if (name !== entity.name && await this.entitiesProvider.collections.findFirst({ where: { name } }) !== null)
      {
        parametersChecker.throwBadParameter("name", name, "a collection with the same name already exists");
      }
    }

    const updatedEntity = await this.entitiesProvider.collections.update({
      where: { id: entity.id },
      data: {
        name: name,
        comment: comment,
        filter: filter === undefined ? undefined : instanceToPlain(filter)
      }
    });
    return this.toDto(updatedEntity);
  }

  async delete(id: number): Promise<void>
  {
    logger.debug(`Deleting the collection with id '${id}'`);
    const entity = await this.getPersistedCollection(id);
    await this.entitiesProvider.collections.delete({ where: { id: entity.id } });
  }

  private async getPersistedCollection(id: number): Promise<PersistedCollection>
  {
    const entity = await this.entitiesProvider.collections.findUnique({ where: { id } });
    if (entity === null)
    {
      parametersChecker.throwBadParameter("id", id.toString(), "there is no collection with that identifier");
    }
    return entity;
  }

  private toDto(entity: PersistedCollection): Collection
  {
    return plainToInstanceViaJSON(Collection, entity);
  }

}
