import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { instanceToPlain } from "class-transformer";

import { Collection as PersistedCollection } from ".prisma/client";

import { logger } from "../logger";
import { Collection, FieldLengths, SearchFilter, SearchOriginKind } from "../dtos/app.dtos";
import { RegularDatabaseService } from "./regularDatabaseService";
import { parametersChecker } from "./utils/parametersChecker";
import { plainToInstanceViaJSON } from "../utils";
import { CollectionEventAction, EventEntity, NotifierService } from "./notifierService";


@Injectable()
export class CollectionService
  implements OnModuleInit, OnModuleDestroy
{

  constructor(private readonly regularDatabaseService: RegularDatabaseService, private readonly notifierService: NotifierService)
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
    const entities = await this.regularDatabaseService.collections.findMany({
      orderBy: { name: "asc" }
    });
    return entities.map(entity => this.toDto(entity));
  }

  async create(name: string, comment: string | undefined, filter: SearchFilter): Promise<Collection>
  {
    logger.debug(`Creating a collection with name '${name}${comment === undefined ? "" : (` and comment '${comment}'`)}'`);

    parametersChecker.checkString("name", name, FieldLengths.l128);
    parametersChecker.checkString("comment", comment, FieldLengths.l1k, undefined, true);

    if (await this.regularDatabaseService.collections.findFirst({ where: { name } }) !== null)
    {
      parametersChecker.throwBadParameter("name", name, "a collection with the same name already exists");
    }

    const entity = await this.regularDatabaseService.collections.create({
      data: { name, comment, filter: instanceToPlain(filter) }
    });
    this.notifierService.emit(EventEntity.Collection, CollectionEventAction.Created, undefined, { id: entity.id });
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

    parametersChecker.checkString("name", name, FieldLengths.l128, undefined, true);
    parametersChecker.checkString("comment", comment, FieldLengths.l1k, undefined, true);
    if (name !== undefined)
    {
      if (name !== entity.name && await this.regularDatabaseService.collections.findFirst({ where: { name } }) !== null)
      {
        parametersChecker.throwBadParameter("name", name, "a collection with the same name already exists");
      }
    }

    const updatedEntity = await this.regularDatabaseService.collections.update({
      where: { id: entity.id },
      data: {
        name: name,
        comment: comment,
        filter: filter === undefined ? undefined : instanceToPlain(filter)
      }
    });
    this.notifierService.emit(EventEntity.Collection, CollectionEventAction.Updated, undefined, { id });
    return this.toDto(updatedEntity);
  }

  async delete(id: number): Promise<void>
  {
    logger.debug(`Deleting the collection with id '${id}'`);
    const entity = await this.getPersistedCollection(id);
    await this.regularDatabaseService.collections.delete({ where: { id: entity.id } });
    this.notifierService.emit(EventEntity.Collection, CollectionEventAction.Deleted, undefined, { id });
  }

  async clearFromOrigin(type: SearchOriginKind, id: string): Promise<void>
  {
    await Promise.all((await this.regularDatabaseService.collections.findMany()).map(persistedCollection =>
    {
      const collection = plainToInstanceViaJSON(Collection, persistedCollection);
      const kind = collection.filter.origin?.kind;
      if (kind === type)
      {
        const origin = collection.filter.origin!;
        const index = origin?.ids.indexOf(id);
        if (index !== -1)
        {
          origin.ids.splice(index, 1);
          return this.regularDatabaseService.collections.update({
            where: { id: persistedCollection.id },
            data: { filter: instanceToPlain(collection.filter) }
          });
        }
        else
        {
          return Promise.resolve();
        }
      }
    }));
  }

  private async getPersistedCollection(id: number): Promise<PersistedCollection>
  {
    const entity = await this.regularDatabaseService.collections.findUnique({ where: { id } });
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
