import { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";

import { Server as SocketServer, ServerOptions, Socket } from "socket.io";
import * as electron from "electron";
import { dialog } from "electron";

import {
  ApiKeyHostCommand,
  HostCommand,
  HostCommandType,
  InstallChromeExtensionHostCommand,
  UninstallChromeExtensionHostCommand,
  WebCoordinates,
  WebServer
} from "@picteus/shared-back-end";

import { logger } from "./logger";
import { ApplicationWrapper } from "./main";


export type SocketCoordinates = { webCoordinates: WebCoordinates, secret: string };

/**
 * A component which is supposed to receive and execute OS commands via an HTTP socket server.
 */
export class CommandsManager
{

  private static _instance: CommandsManager = new CommandsManager();

  private webServer?: WebServer;

  private socketServer?: SocketServer;

  private readonly perEventListenersMap: Map<string, Function> = new Map();

  private readonly perEventIsTransientMap: Map<string, boolean> = new Map();

  static get instance(): CommandsManager
  {
    return CommandsManager._instance;
  }

  private constructor()
  {
  }

  async start(portNumber: number, useSsl: boolean, directoryPath: string, secretsDirectoryPath: string): Promise<SocketCoordinates>
  {
    this.webServer = new WebServer(logger);
    const webCoordinates: WebCoordinates = await this.webServer.start(portNumber, useSsl, directoryPath, secretsDirectoryPath);
    const secret = randomUUID();
    const options: Partial<ServerOptions> = {};
    this.socketServer = new SocketServer(webCoordinates.httpServer, options);
    this.socketServer.on("connection", (socket: Socket) =>
    {
      let isAuthorized = false;
      logger.debug(`A new socket client with id '${socket.id}' has connected`);
      socket.on("disconnect", (): void =>
      {
        logger.debug(`The socket client with id '${socket.id}' was disconnected`);
      });
      socket.on("initialize", ({ secret: clientSecret }: { secret: string }): void =>
      {
        if (clientSecret === secret)
        {
          isAuthorized = true;
        }
        logger.debug(`The socket client with id '${socket.id}' is ${isAuthorized === true ? "now authorized" : "not authorized"} to run command`);
      });
      socket.on("command", async ({ id, command, parameters }: {
        id: string,
        command: string,
        parameters: Record<string, any>
      }): Promise<void> =>
      {
        if (isAuthorized === true)
        {
          logger.debug(`The socket client with id '${socket.id}' received the command '${command}' with id '${id}'`);
          await this.handleCommand(socket, id, command, parameters);
        }
      });
    });
    return { webCoordinates, secret };
  }

  async stop(): Promise<void>
  {
    if (this.socketServer !== undefined)
    {
      logger.info("Stopping the internal socket server");
      await this.socketServer.close();
      this.socketServer = undefined;
      logger.debug("The internal socket server is now stopped");
    }
    if (this.webServer !== undefined)
    {
      logger.info("Stopping the internal web server");
      this.webServer.stop();
      logger.debug("The internal web server is now stopped");
      this.webServer = undefined;
    }
  }

  listenToServerProcess(serverProcess: ChildProcess): void
  {
    serverProcess.on("message", async (command: HostCommand) =>
    {
      const commandType = command.type;
      const callback = this.perEventListenersMap.get(commandType);
      if (callback === undefined)
      {
        logger.warn(`No listener is registered to handle the '${commandType}' host command`);
        return;
      }
      try
      {
        switch (commandType)
        {
          case HostCommandType.ApiKey:
            await callback((command as ApiKeyHostCommand).apiKey);
            break;
          case HostCommandType.InstallChromeExtension:
            await callback(command as InstallChromeExtensionHostCommand);
            break;
          case HostCommandType.UninstallChromeExtension:
            await callback(command as UninstallChromeExtensionHostCommand);
            break;
          default:
            logger.error(`The host command type '${commandType}' is not supported`);
            break;
        }
      }
      catch (error)
      {
        logger.error(`The '${commandType}' host command execution has failed`, error);
        console.dir(error);
      }
      finally
      {
        if (this.perEventIsTransientMap.get(commandType) == true)
        {
          this.perEventListenersMap.delete(commandType);
          this.perEventIsTransientMap.delete(commandType);
        }
      }
    });
  }

  on(type: HostCommandType, callback: Function): void
  {
    this.perEventListenersMap.set(type, callback);
    this.perEventIsTransientMap.set(type, false);
  }

  once(type: HostCommandType, callback: Function): void
  {
    this.perEventListenersMap.set(type, callback);
    this.perEventIsTransientMap.set(type, true);
  }

  private async handleCommand(socket: Socket, id: string, command: string, parameters: Record<string, any>): Promise<void>
  {
    switch (command)
    {
      default:
        logger.warn(`The command '${command}' is not supported`);
        break;
      case "pickDirectory":
        const object = await dialog.showOpenDialog({
          message: parameters.title,
          defaultPath: parameters.defaultPath,
          filters: parameters.filters,
          properties: ["openDirectory", "createDirectory"]
        });
        const value = object.filePaths.length === 0 ? undefined : object.filePaths[0];
        this.sendCommandSuccess(socket, id, value);
        break;
      case "openFile":
      case "openExplorer":
      {
        const directoryOrFilePath = parameters.path;
        if (directoryOrFilePath === undefined)
        {
          this.sendCommandError(socket, id, "Missing the 'path' parameter");
        }
        else
        {
          if (command === "openExplorer")
          {
            electron.shell.showItemInFolder(directoryOrFilePath);
          }
          else
          {
            const result = await electron.shell.openPath(directoryOrFilePath);
            this.sendCommandError(socket, id, result);
            if (result !== "")
            {
              this.sendCommandError(socket, id, result);
              return;
            }
          }
          this.sendCommandSuccess(socket, id, undefined);
        }
      }
        break;
      case "openWindow":
      {
        const url = parameters.url;
        logger.info(`Opening the window with URL '${url}'`);
        await ApplicationWrapper.instance().openWindow(url);
      }
        break;
    }
  }

  private sendCommandSuccess(socket: Socket, id: string, value: any): void
  {
    socket.emit("result", { id, value: value });
  }

  private sendCommandError(socket: Socket, id: string, error: string | Error): void
  {
    socket.emit("result", { id, error: error instanceof Error ? error.message : error as string });
  }

}
