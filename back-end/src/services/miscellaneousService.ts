import { Injectable } from "@nestjs/common";

import { logger } from "../logger";
import { paths } from "../paths";
import { ApplicationConfiguration } from "../dtos/miscellaneous.dtos";


@Injectable()
export class MiscellaneousService
{

  constructor()
  {
    logger.debug("Instantiating a MiscellaneousService");
  }

  ping(request: Request, ipAddress: string): string
  {
    logger.debug(`Received a ping request from IP address '${ipAddress}' with headers ${JSON.stringify(request.headers)}`);
    return "pong";
  }

  test(): string
  {
    logger.debug("Received a test request");
    return "none";
  }

  getConfiguration(): ApplicationConfiguration
  {
    logger.debug("Getting the application configuration");
    return new ApplicationConfiguration(paths.unpackedExtensionsDirectoryPath);
  }

}

