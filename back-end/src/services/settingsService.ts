import { Injectable } from "@nestjs/common";

import { logger } from "../logger";
import { RegularDatabaseService } from "./regularDatabaseService";
import { ApplicationSettings } from "../dtos/app.dtos";
import { plainToInstanceViaJSON } from "../utils";


@Injectable()
export class SettingsService
{

  constructor(private readonly regularDatabaseService: RegularDatabaseService)
  {
    logger.debug("Instantiating a SettingsService");
  }

  async get(): Promise<ApplicationSettings>
  {
    return plainToInstanceViaJSON(ApplicationSettings, await this.regularDatabaseService.applicationSettings);
  }

  async set(settings: ApplicationSettings): Promise<ApplicationSettings>
  {
    await this.regularDatabaseService.setApplicationSettings(settings);
    return settings;
  }

}
