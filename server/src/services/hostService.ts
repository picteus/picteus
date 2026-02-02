import process from "node:process";

import { Injectable } from "@nestjs/common";

import { HostCommand } from "@picteus/shared-back-end";

import { logger } from "../logger";


@Injectable()
export class HostService
{

  static sendCommand(command: HostCommand, doNotThrowIfNoHost: boolean = false): void
  {
    logger.debug(`Sending a '${command.type}' command to the host process`);
    if (process.send !== undefined)
    {
      // This will be run if the process is forked
      process.send(command);
    }
    else if (doNotThrowIfNoHost === false)
    {
      throw new Error("Cannot send a command, because there is no host");
    }
  }

  constructor()
  {
    logger.debug("Instantiating a HostService");
  }

  send(command: HostCommand, doNotThrowIfNoHost: boolean = false): void
  {
    HostService.sendCommand(command, doNotThrowIfNoHost);
  }

}
