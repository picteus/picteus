import { Injectable } from "@nestjs/common";

import { logger } from "../logger";


@Injectable()
export class MiscellaneousService
{

  constructor()
  {
    logger.debug("Instantiating a MiscellaneousService");
  }

  ping(): string
  {
    logger.debug("Received a ping request");
    return "pong";
  }

  test(): string
  {
    logger.debug("Received a test request");
    return "none";
  }

}

