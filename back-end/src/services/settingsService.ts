import { Injectable } from "@nestjs/common";

import { logger } from "../logger";
import { EntitiesProvider } from "./databaseProviders";
import { Settings } from "../dtos/app.dtos";
import { plainToInstanceViaJSON } from "../utils";


@Injectable()
export class SettingsService
{

  constructor(private readonly entitiesProvider: EntitiesProvider)
  {
    logger.debug("Instantiating a SettingsService");
  }

  async get(): Promise<Settings>
  {
    return plainToInstanceViaJSON(Settings, await this.entitiesProvider.settings);
  }

  async set(settings: Settings): Promise<Settings>
  {
    await this.entitiesProvider.setSettings(settings);
    return settings;
  }

}
