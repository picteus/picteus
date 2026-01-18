import fs from "node:fs";
import { isMainThread } from "node:worker_threads";

import { Prisma, PrismaClient } from ".prisma/client";
import { logger } from "./logger";
import { paths } from "./paths";
import { Settings } from "./dtos/app.dtos";


const defaultSettingsType = "default";
const migrationSettingsType = "migration";

export interface PersistenceProvider
{

  initialize(): Promise<void>;

  terminate(): Promise<void>;

  get prisma(): PrismaClient;

  get settings(): Promise<Settings>;

  setSettings(settings: Settings): Promise<void>;

  get apiSecrets(): Prisma.ApiSecretDelegate;

  get extensionSettings(): Prisma.ExtensionSettingsDelegate;

  get repositories(): Prisma.RepositoryDelegate;

  get images(): Prisma.ImageDelegate;

  get imageMetadata(): Prisma.ImageMetadataDelegate;

  get imageFeature(): Prisma.ImageFeatureDelegate;

  get imageTag(): Prisma.ImageTagDelegate;

  get imageAttachment(): Prisma.ImageAttachmentDelegate;

}

export class Persistence implements PersistenceProvider
{

  private prismaClient?: PrismaClient;

  public constructor()
  {
    logger.debug("Instantiating a Persistence");
  }

  async initialize(): Promise<void>
  {
    if (this.prismaClient === undefined)
    {
      const databaseCoordinates = paths.getAndFixDatabaseCoordinates();
      if (fs.existsSync(databaseCoordinates.path) === false)
      {
        // The database file does not exist yet
        if (paths.referenceDatabaseFilePath !== undefined)
        {
          logger.info(`Copying the reference database file '${paths.referenceDatabaseFilePath}' into file '${databaseCoordinates.path}'`);
          fs.copyFileSync(paths.referenceDatabaseFilePath, databaseCoordinates.path);
        }
        else
        {
          throw new Error(`The database file '${databaseCoordinates.path}' does not exist'`);
        }
      }
      logger.info(`Initializing the persistence through the database file '${databaseCoordinates.path}' with URL '${databaseCoordinates.url}'`);
      // We do not want to log debug and events in the production environment
      const commonLog: Prisma.LogDefinition[] =
        [
          {
            emit: "event",
            level: "warn"
          },
          {
            emit: "event",
            level: "error"
          }
        ];
      const log: Prisma.LogDefinition[] = paths.isProductionEnvironment === true ? [...commonLog] :
        [
          {
            emit: "event",
            level: "query"
          },
          {
            emit: "event",
            level: "info"
          },
          ...commonLog
        ];
      // We increase the default timeout duration to 10 seconds
      const options = { log, transactionOptions: { timeout: 10_000 } };
      this.prismaClient = new PrismaClient(options);
      // @ts-ignore
      this.prismaClient.$on<Prisma.QueryEvent>("query", (event: Prisma.QueryEvent) =>
      {
        logger.debug(`Ran the SQL query '${event.query}' with parameters '${event.params}' in ${event.duration} ms`);
      });
      this.prismaClient.$connect();
      if (isMainThread === true)
      {
        // We make sure that the settings are defined
        if (await this.settingsDelegate().findUnique({
          where: { type: defaultSettingsType },
          select: { value: true }
        }) === null)
        {
          await this.settingsDelegate().create({ data: { type: defaultSettingsType, value: JSON.stringify({}) } });
        }
      }
    }
  }

  async terminate(): Promise<void>
  {
    if (this.prismaClient !== undefined)
    {
      logger.debug("Disconnecting from the persistence");
      await this.prismaClient.$disconnect();
      this.prismaClient = undefined;
      logger.debug("Now disconnected from the persistence");
    }
  }

  get prisma(): PrismaClient
  {
    return this.prismaClient!;
  }

  get settings(): Promise<Settings>
  {
    return this.getSettings();
  }

  async setSettings(settings: Settings): Promise<void>
  {
    const data = JSON.stringify(settings);
    await this.settingsDelegate().update({ where: { type: defaultSettingsType }, data: { value: data } });
  }

  get apiSecrets(): Prisma.ApiSecretDelegate
  {
    return this.prisma["apiSecret"];
  }

  get extensionSettings(): Prisma.ExtensionSettingsDelegate
  {
    return this.prisma["extensionSettings"];
  }

  get repositories(): Prisma.RepositoryDelegate
  {
    return this.prisma["repository"];
  }

  get images(): Prisma.ImageDelegate
  {
    return this.prisma["image"];
  }

  get imageMetadata(): Prisma.ImageMetadataDelegate
  {
    return this.prisma["imageMetadata"];
  }

  get imageFeature(): Prisma.ImageFeatureDelegate
  {
    return this.prisma["imageFeature"];
  }

  get imageTag(): Prisma.ImageTagDelegate
  {
    return this.prisma["imageTag"];
  }

  get imageAttachment(): Prisma.ImageAttachmentDelegate
  {
    return this.prisma["imageAttachment"];
  }

  async getMigration(): Promise<string>
  {
    const data = await this.settingsDelegate().findUnique({
      where: { type: migrationSettingsType },
      select: { value: true }
    });
    return data!.value;
  }

  async setMigration(migration: string): Promise<void>
  {
    logger.info(`Remembering the latest database migration '${migration}'`);
    await this.settingsDelegate().update({ where: { type: migrationSettingsType }, data: { value: migration } });
  }

  private async getSettings(): Promise<Settings>
  {
    const settings = await this.settingsDelegate().findUnique({
      where: { type: defaultSettingsType },
      select: { value: true }
    });
    return JSON.parse(settings!.value);
  }

  private settingsDelegate(): Prisma.SettingsDelegate
  {
    return this.prisma["settings"];
  }

}
