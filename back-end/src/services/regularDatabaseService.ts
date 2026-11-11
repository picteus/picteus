import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { Prisma, PrismaClient } from ".prisma/client";
import { logger } from "../logger";
import { type ApplicationSettings } from "../dtos/app.dtos";
import { PrismaClientWrapper } from "./utils/prismaClientWrapper";


@Injectable()
export class RegularDatabaseService implements OnModuleInit, OnModuleDestroy
{

  private _prismaClientWrapper?: PrismaClientWrapper;

  public get prismaClientWrapper(): PrismaClientWrapper
  {
    if (this._prismaClientWrapper === undefined)
    {
      throw new Error("The persistence has not been initialized");
    }
    return this._prismaClientWrapper;
  }

  async onModuleInit(): Promise<void>
  {
    // We initialize the persistence
    await this.initialize();
    logger.debug("The initializing of an RegularDatabaseService is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying an RegularDatabaseService");
    // We terminate the persistence
    await this.terminate();
    logger.debug("Destroyed an RegularDatabaseService");
  }

  async initialize(): Promise<void>
  {
    this._prismaClientWrapper = new PrismaClientWrapper();
    await this.prismaClientWrapper.initialize();
  }

  async terminate(): Promise<void>
  {
    await this.prismaClientWrapper.terminate();
    this._prismaClientWrapper = undefined;
  }

  get prisma(): PrismaClient
  {
    return this.prismaClientWrapper.prisma;
  }

  get applicationSettings(): Promise<ApplicationSettings>
  {
    return this.prismaClientWrapper.applicationSettings;
  }

  setApplicationSettings(settings: ApplicationSettings): Promise<void>
  {
    return this.prismaClientWrapper.setApplicationSettings(settings);
  }

  get apiSecrets(): Prisma.ApiSecretDelegate
  {
    return this.prismaClientWrapper.apiSecrets;
  }

  get extensionSettings(): Prisma.ExtensionSettingsDelegate
  {
    return this.prismaClientWrapper.extensionSettings;
  }

  get repositories(): Prisma.RepositoryDelegate
  {
    return this.prismaClientWrapper.repositories;
  }

  get collections(): Prisma.CollectionDelegate
  {
    return this.prismaClientWrapper.collections;
  }

  get images(): Prisma.ImageDelegate
  {
    return this.prismaClientWrapper.images;
  }

  get imageMetadata(): Prisma.ImageMetadataDelegate
  {
    return this.prismaClientWrapper.imageMetadata;
  }

  get imageFeature(): Prisma.ImageFeatureDelegate
  {
    return this.prismaClientWrapper.imageFeature;
  }

  get imageTag(): Prisma.ImageTagDelegate
  {
    return this.prismaClientWrapper.imageTag;
  }

  get imageAttachment(): Prisma.ImageAttachmentDelegate
  {
    return this.prismaClientWrapper.imageAttachment;
  }

  get aiModel(): Prisma.AiModelDelegate
  {
    return this.prismaClientWrapper.aiModel;
  }

}
