import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import os from "node:os";
import { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { Readable } from "node:stream";

import * as electron from "electron";
import { shell } from "electron";
import { DisconnectReason, Server as SocketServer, ServerOptions, Socket } from "socket.io";
import AdmZip from "adm-zip";
import tar from "tar-fs";
import { Resvg } from "@resvg/resvg-js";

import { detectImageMimeType } from "@picteus/shared-front-end";
import {
  ApiKeyHostCommand,
  createIPCCommandReceiver,
  HostCommand,
  HostCommandType,
  InstallChromeExtensionHostCommand,
  NotificationCommandHostCommand,
  PickFileResourceHostCommand,
  ShowDialogHostCommand,
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
      socket.on("connect", (): void =>
      {
        logger.debug(`The socket client with id '${socket.id}' is connected`);
      });
      socket.on("disconnect", (reason: DisconnectReason): void =>
      {
        logger.warn(`The socket client with id '${socket.id}' was disconnected with reason '${reason}'`);
      });
      socket.on("disconnecting", (reason: DisconnectReason): void =>
      {
        logger.warn(`The socket client with id '${socket.id}' was disconnecting with reason '${reason}'`);
      });
      socket.on("connect_error", (error): void =>
      {
        logger.warn(`A connection issue occurred with the socket client with id '${socket.id}'`, error);
      });
      socket.on("error", (error): void =>
      {
        logger.warn(`The socket client with id '${socket.id}' received an error`, error);
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
          try
          {
            await this.handleCommand(socket, id, command, parameters);
          }
          catch (error)
          {
            this.sendCommandError(socket, id, `An error occurred while executing the command from socket client with id '${socket.id}' received the command '${command}' with id '${id}'. Reason: '${(error as Error).message}'`);
          }
        }
        else
        {
          logger.warn(`The socket client with id '${socket.id}' received the unauthorized command '${command}' with id '${id}'`);
          this.sendCommandError(socket, id, `The socket client with id '${socket.id}' is not authorized to run commands`);
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

  listenToProcess(backendProcess: ChildProcess): void
  {
    this.on(HostCommandType.PickFileResource, async (command: PickFileResourceHostCommand) =>
    {
      const nodePath = await this.pickFileOrDirectory(command.message, command.kind, command.nature, command.extensions === undefined ? undefined : {
        name: "",
        extensions: command.extensions
      }, command.defaultPath);
      return nodePath ?? null;
    });
    this.on(HostCommandType.Notification, async (command: NotificationCommandHostCommand) =>
    {
      let icon: electron.NativeImage | undefined;
      if (command.icon !== undefined)
      {
        const edge = 64;
        const commandIcon: Buffer = command.icon;
        const iconBuffer = detectImageMimeType(commandIcon) !== "image/svg+xml" ? commandIcon : new Resvg(commandIcon, {
          background: "rgba(255, 255, 255, .0)",
          fitTo: { mode: "width", value: edge }
        }).render().asPng();
        icon = electron.nativeImage.createFromBuffer(iconBuffer).resize({
          width: edge,
          height: edge,
          quality: "best"
        });
      }
      const notification = new electron.Notification({
        title: command.title,
        subtitle: command.subtitle,
        body: command.body,
        silent: command.silent,
        icon
      });
      notification.show();
    });
    createIPCCommandReceiver(backendProcess, logger, async <Response>(command: HostCommand): Promise<Response> =>
    {
      const commandType = command.type;
      const callback = this.perEventListenersMap.get(commandType);
      if (callback === undefined)
      {
        throw new Error(`No listener is registered to handle the '${commandType}' host command`);
      }
      try
      {
        let callbackArguments;
        switch (commandType)
        {
          case HostCommandType.ApiKey:
            callbackArguments = (command as ApiKeyHostCommand).apiKey;
            break;
          case HostCommandType.InstallChromeExtension:
            callbackArguments = command as InstallChromeExtensionHostCommand;
            break;
          case HostCommandType.UninstallChromeExtension:
            callbackArguments = command as UninstallChromeExtensionHostCommand;
            break;
          case HostCommandType.ShowDialog:
            callbackArguments = command as ShowDialogHostCommand;
            break;
          case HostCommandType.PickFileResource:
            callbackArguments = command as PickFileResourceHostCommand;
            break;
          case HostCommandType.Notification:
            callbackArguments = command as NotificationCommandHostCommand;
            break;
          default:
            throw new Error(`The host command type '${commandType}' is not supported`);
        }
        return await callback(callbackArguments);
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
    logger.info(`Received the '${command}' command with id '${id}'`);
    switch (command)
    {
      case "pickDirectory":
        const nodePath = await this.pickFileOrDirectory(parameters.title, "directory", "open", parameters.filter, parameters.defaultPath);
        this.sendCommandSuccess(socket, id, nodePath);
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
        const { id: parametersId, isTransient, automaticallyReopen, url, html }: {
          id?: string,
          isTransient?: boolean,
          automaticallyReopen?: boolean,
          url?: string,
          html?: string
        } = parameters;
        if (parametersId === undefined)
        {
          return this.sendCommandError(socket, id, "Missing 'id' parameter");
        }
        if (url === undefined && html === undefined)
        {
          return this.sendCommandError(socket, id, "Missing 'url' or 'html' parameter");
        }
        else if (url !== undefined && html !== undefined)
        {
          return this.sendCommandError(socket, id, "The 'url' or 'html' parameters should not be defined at the same time");
        }
        let actualUrl: string;
        if (html !== undefined)
        {
          const directoryPath = fs.mkdtempSync(path.join(os.tmpdir(), "picteus-"));
          const filePath = path.join(directoryPath, "index.html");
          fs.writeFileSync(filePath, html);
          actualUrl = `file://${filePath}`;
        }
        else
        {
          actualUrl = url!;
        }
        logger.info(`Opening the window with id '${id}' and with URL '${actualUrl}'`);
        await ApplicationWrapper.instance().openWindow(parametersId, actualUrl, isTransient ?? true, automaticallyReopen ?? false);
        this.sendCommandSuccess(socket, id, undefined);
        break;
      }
      case "openBrowser":
      {
        const { url }: { url?: string } = parameters;
        if (url === undefined)
        {
          return this.sendCommandError(socket, id, "Missing 'url' parameter");
        }
        logger.info(`Opening the browser with URL '${url}'`);
        await shell.openExternal(url);
        this.sendCommandSuccess(socket, id, undefined);
      }
        break;
      case "inflateZip":
      case "inflateTarball":
      {
        // TODO: check that the directoryPath is harmless
        const { directoryPath, content }: { directoryPath?: string; content?: string } = parameters;
        if (directoryPath === undefined)
        {
          this.sendCommandError(socket, id, "Missing 'directoryPath' parameter");
        }
        else if (content === undefined)
        {
          this.sendCommandError(socket, id, "Missing 'content' parameter");
        }
        else
        {
          if (fs.existsSync(directoryPath) === true)
          {
            return this.sendCommandError(socket, id, `The directory with path '${directoryPath}' already exists`);
          }
          fs.mkdirSync(directoryPath, { recursive: true });
          const buffer = Buffer.from(content, "base64");
          if (command === "inflateZip")
          {
            const zip = new AdmZip(buffer);
            zip.extractAllTo(directoryPath, true);
          }
          else
          {
            const decompressedBuffer = zlib.gunzipSync(buffer);
            await new Promise<void>((resolve, reject) =>
            {
              const packagesPrefix = "package/";
              Readable.from(decompressedBuffer).pipe(tar.extract(directoryPath, {
                  map: (header) =>
                  {
                    if (header.name.startsWith(packagesPrefix))
                    {
                      header.name = header.name.substring(packagesPrefix.length);
                    }
                    return header;
                  }
                })
              ).on("finish", resolve).on("error", reject);
            });
          }
          this.sendCommandSuccess(socket, id, undefined);
        }
      }
        break;
      case "saveFile":
      {
        // TODO: check that the filePath is harmless
        const { filePath, content }: { filePath?: string; content?: string } = parameters;
        if (filePath === undefined)
        {
          this.sendCommandError(socket, id, "Missing 'filePath' parameter");
        }
        else if (content === undefined)
        {
          this.sendCommandError(socket, id, "Missing 'content' parameter");
        }
        else
        {
          const buffer = Buffer.from(content, "base64");
          fs.writeFileSync(filePath, buffer);
          this.sendCommandSuccess(socket, id, undefined);
        }
      }
        break;
      default:
        const message = `The command '${command}' is not supported`;
        logger.error(message);
        return this.sendCommandError(socket, id, message);
    }
  }

  private sendCommandSuccess(socket: Socket, id: string, value: any): void
  {
    logger.info(`Sending a success response related to the command with id '${id}'`);
    socket.emit("result", { id, value });
  }

  private sendCommandError(socket: Socket, id: string, error: string | Error): void
  {
    logger.warn(`Sending an error response related to the command with id '${id}'`);
    socket.emit("result", { id, error: error instanceof Error ? error.message : error as string });
  }

  private async pickFileOrDirectory(message: string, kind: "file" | "directory", nature: "open" | "save", filter?: {
    name: string,
    extensions: string[],
  }, defaultPath?: string): Promise<string | undefined>
  {
    const filters = filter === undefined ? undefined : [ filter ];
    if (nature === "open")
    {
      const object = await electron.dialog.showOpenDialog({
        message,
        defaultPath,
        filters,
        properties: kind === "directory" ? [ "openDirectory", "createDirectory", "showHiddenFiles" ] : [ "openFile", "showHiddenFiles" ]
      });
      return object.canceled === true || object.filePaths.length === 0 ? undefined : object.filePaths[0];
    }
    else
    {
      const object = await electron.dialog.showSaveDialog({
        message,
        defaultPath,
        filters,
        properties: [ "createDirectory", "showHiddenFiles", "treatPackageAsDirectory", "showOverwriteConfirmation" ]
      });
      return object.canceled === true ? undefined : object.filePath;
    }
  }

}
