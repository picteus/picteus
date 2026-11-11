import fs from "node:fs";
import { isMainThread } from "node:worker_threads";

import { Prisma, PrismaClient } from ".prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { type SqlDriverAdapter } from "@prisma/driver-adapter-utils";

import { logger } from "../../logger";
import { paths } from "../../paths";
import { type  ApplicationSettings } from "../../dtos/app.dtos";


const defaultSettingsType = "default";
const migrationSettingsType = "migration";

// This has been introduced, awaiting the https://github.com/prisma/orm/pull/30867 PR to be merged
class ConfiguredBetterSqlite3Adapter extends PrismaBetterSqlite3
{

  async connect(): Promise<SqlDriverAdapter>
  {
    return this.configureAdapter(await super.connect());
  }

  async connectToShadowDb(): Promise<SqlDriverAdapter>
  {
    return this.configureAdapter(await super.connectToShadowDb());
  }

  private configureAdapter(adapter: SqlDriverAdapter): SqlDriverAdapter
  {
    // We report SQLite 3.32+ parameter limit — i.e. 32,766 — to Prisma Client Query Engine
    const SQLITE_MAX_VARIABLE_NUMBER = 32_766;
    adapter.getConnectionInfo = () =>
    {
      return {
        supportsRelationJoins: false,
        maxBindValues: SQLITE_MAX_VARIABLE_NUMBER
      };
    };
    return adapter;
  }

}

export class PrismaClientWrapper
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
      const log: Prisma.LogDefinition[] = paths.isProductionEnvironment === true ? [ ...commonLog ] :
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
      const timeoutInMilliseconds = 10_000;
      const sqliteConfig =
        {
          url: databaseCoordinates.url,
          timeout: timeoutInMilliseconds
        };
      type PrismaBetterSqlite3Options =
        {
          shadowDatabaseUrl?: string;
          timestampFormat?: "iso8601" | "unixepoch-ms";
        };
      const sqliteOptions: PrismaBetterSqlite3Options =
        {
          // We keep a numeric representation for the epoch millisecond storage
          timestampFormat: "unixepoch-ms"
        };
      const adapter = new ConfiguredBetterSqlite3Adapter(sqliteConfig, sqliteOptions);
      // We increase the default timeout duration to 10 seconds
      const prismaOptions = { adapter, log, transactionOptions: { timeout: timeoutInMilliseconds } };
      this.prismaClient = new PrismaClient(prismaOptions);
      // @ts-ignore
      this.prismaClient.$on<Prisma.QueryEvent>("query", (event: Prisma.QueryEvent) =>
      {
        logger.debug(`Ran the SQL query '${event.query}' with parameters '${event.params}' in ${event.duration} ms`);
      });
      await this.prismaClient.$connect();
      try
      {
        // WAL (Write-Ahead Logging) mode allows concurrent reads while writes are in progress, preventing database lock contention across worker threads
        await this.prismaClient.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
      }
      catch (error)
      {
        logger.error(`Could not set PRAGMA on database. Reason: '${(error as Error).message}'`);
      }
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

  get applicationSettings(): Promise<ApplicationSettings>
  {
    return this.getSettings();
  }

  async setApplicationSettings(settings: ApplicationSettings): Promise<void>
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

  get collections(): Prisma.CollectionDelegate
  {
    return this.prisma["collection"];
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

  get aiModel(): Prisma.AiModelDelegate
  {
    return this.prisma["aiModel"];
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

  private async getSettings(): Promise<ApplicationSettings>
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
