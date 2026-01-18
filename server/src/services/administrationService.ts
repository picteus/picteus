import path from "node:path";
import fs from "node:fs";

import { Injectable, OnModuleInit } from "@nestjs/common";
import { fdir } from "fdir";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/binary";
import { Prisma } from ".prisma/client";

import { logger } from "../logger";
import { paths } from "../paths";
import { Persistence } from "../persistence";
import { parametersChecker } from "./utils/parametersChecker";


@Injectable()
export class AdministrationService implements OnModuleInit
{

  constructor()
  {
    logger.debug("Instantiating an AdministrationService");
  }

  async onModuleInit(): Promise<void>
  {
    if (paths.runMigrations === true)
    {
      // We run any necessary migration
      await this.migrateDatabase();
    }
    logger.debug("The initializing of an AdministrationService is over");
  }

  async migrateDatabase(): Promise<void>
  {
    logger.info(`Considering a potential migration of the persistence through the files in directory '${paths.migrationDirectoryPath}'`);
    const filePaths = (await new fdir().withFullPaths().glob("**/*").crawl(paths.migrationDirectoryPath).withPromise()).filter((filePath) =>
    {
      return filePath.endsWith(".sql");
    });
    // We make sure that the migration scripts are sorted chronologically
    filePaths.sort();

    const persistence = new Persistence();
    await persistence.initialize();
    try
    {
      const currentMigration = await persistence.getMigration();
      logger.debug(`The latest applied migration is '${currentMigration}'`);
      const prismaClient = persistence.prisma;
      let shouldRunRequest = false;
      for (const filePath of filePaths)
      {
        const directoryName = path.basename(path.join(filePath, ".."));
        const fileFragment = `${directoryName}/${path.basename(filePath)}`;
        if (shouldRunRequest === true)
        {
          logger.info(`Running the persistence migration file '${fileFragment}'`);
          const content = fs.readFileSync(filePath, { encoding: "utf-8" });
          // Taken from https://github.com/prisma/prisma/issues/2868
          const sqlStatements = content
            .split("\n")
            .filter((line) => line.indexOf("--") !== 0)
            .join("\n")
            .replace(/(\r\n|\n|\r)/gm, " ")
            .replace(/\s+/g, " ")
            .split(";").filter((sqlStatement) =>
            {
              return sqlStatement.trim().length > 0;
            });
          for (const sqlStatement of sqlStatements)
          {
            try
            {
              const sql = Prisma.sql([sqlStatement]);
              await prismaClient.$executeRaw(sql);
            }
            catch (error)
            {
              parametersChecker.throwInternalError(`The migration script '${fileFragment}' was a failure. Reason: '${(error as PrismaClientKnownRequestError).meta!.message}'`);
            }
          }
          // We remember the latest migration point
          await persistence.setMigration(directoryName);
        }
        else
        {
          logger.debug(`Skipping the persistence migration file '${fileFragment}'`);
        }
        if (directoryName === currentMigration)
        {
          // We have reached the moment of the first migration to be run
          shouldRunRequest = true;
        }
      }
    }
    finally
    {
      await persistence.terminate();
    }
    logger.debug("Migration assessment over");
  }

}
