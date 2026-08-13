import process from "node:process";

import { Injectable } from "@nestjs/common";

import { createIPCCommandSender, HostCommand } from "@picteus/shared-back-end";

import { logger } from "../logger";


@Injectable()
export class HostService
{

  private readonly commandServer = createIPCCommandSender(process, logger);

  readonly canSend = process.send !== undefined;

  constructor()
  {
    logger.debug("Instantiating a HostService");
  }

  async send<Response>(command: HostCommand): Promise<Response>
  {
    logger.debug(`Sending a '${command.type}' command to the host process`);
    return await this.commandServer<Response>(command);
  }

}
