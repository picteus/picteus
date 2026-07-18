import { Injectable } from "@nestjs/common";

import { logger } from "../logger";


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

}

