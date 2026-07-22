import { Injectable } from "@nestjs/common";

import { logger } from "../logger";
import { EntitiesProvider } from "./databaseProviders";
import { ApplicationSettings } from "../dtos/app.dtos";
import { plainToInstanceViaJSON } from "../utils";


@Injectable()
export class SettingsService
{

  constructor(private readonly entitiesProvider: EntitiesProvider)
  {
    logger.debug("Instantiating a SettingsService");
  }

  async get(): Promise<ApplicationSettings>
  {
    return plainToInstanceViaJSON(ApplicationSettings, await this.entitiesProvider.applicationSettings);
  }

  async set(settings: ApplicationSettings): Promise<ApplicationSettings>
  {
    await this.entitiesProvider.setApplicationSettings(settings);
    return settings;
  }

}
