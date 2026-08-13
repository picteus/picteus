import { ChildProcess } from "node:child_process";
import crypto from "node:crypto";

import { Logger } from "winston";


export enum HostCommandType
{
  ApiKey = "apiKey",
  InstallChromeExtension = "installChromeExtension",
  UninstallChromeExtension = "uninstallChromeExtension",
  ShowDialog = "showDialog",
  PickFileResource = "pickFileResource",
  Notification = "notification"
}

interface NamedCommand<T extends HostCommandType>
{
  type: T;
}

export interface ApiKeyHostCommand extends NamedCommand<HostCommandType.ApiKey>
{
  apiKey: string;
}

export interface InstallChromeExtensionHostCommand extends NamedCommand<HostCommandType.InstallChromeExtension>
{
  name: string;
  archive: string;
}

export interface UninstallChromeExtensionHostCommand extends NamedCommand<HostCommandType.UninstallChromeExtension>
{
  name: string;
}

export interface ShowDialogHostCommand extends NamedCommand<HostCommandType.ShowDialog>
{
  nature: "info" | "warning" | "error";
  title: string;
  message: string;
}

export interface PickFileResourceHostCommand extends NamedCommand<HostCommandType.PickFileResource>
{
  message: string;
  defaultPath?: string;
  kind: "file" | "directory";
  nature: "open" | "save",
  extensions?: string[];
}

export interface NotificationCommandHostCommand extends NamedCommand<HostCommandType.Notification>
{
  title: string;
  subtitle: string;
  body: string;
  silent: boolean;
  icon?: Buffer;
}

export type HostCommand =
  ApiKeyHostCommand
  | InstallChromeExtensionHostCommand
  | UninstallChromeExtensionHostCommand
  | ShowDialogHostCommand
  | PickFileResourceHostCommand
  | NotificationCommandHostCommand;


type ResponseProvider = <Response>(command: HostCommand) => Promise<Response>;

export function createIPCCommandSender(targetProcess: NodeJS.Process, logger: Logger): ResponseProvider
{
  logger.info("Creating an Inter-Process Communication (IPC) sender for handling commands");
  const handlers = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void; }>();

  targetProcess.on("message", (message: { correlationId: string; result?: unknown; error?: string; }) =>
  {
    const { correlationId, result, error } = message;
    logger.debug(`Received a response from a command with correlation id '${correlationId}`);
    if (correlationId !== undefined && handlers.has(correlationId) === true)
    {
      const { resolve, reject } = handlers.get(correlationId)!;
      handlers.delete(correlationId);
      if (error)
      {
        reject(new Error(error));
      }
      else
      {
        resolve(result);
      }
    }
  });

  return <Response>(command: HostCommand): Promise<Response> =>
  {
    if (targetProcess.send === undefined)
    {
      return Promise.reject(new Error("Cannot send a command, because there is no host"));
    }
    return new Promise<Response>((resolve, reject) =>
    {
      const correlationId = crypto.randomUUID();
      handlers.set(correlationId, { resolve, reject });
      const commandType = command.type;
      logger.debug(`Sending a command of type '${commandType}' with correlation id '${correlationId}'`);
      targetProcess.send!({ correlationId, command }, (error: Error | null) =>
      {
        if (error !== null)
        {
          logger.error(`An error occurred while attempting to send a command of type '${commandType}' with correlation id '${correlationId}'. Reason: ''${error.message}`);
          handlers.delete(correlationId);
          reject(error);
        }
      });
    });
  };
}

export function createIPCCommandReceiver(targetProcess: ChildProcess, logger: Logger, responseProvider: ResponseProvider): void
{
  logger.info("Creating an Inter-Process Communication (IPC) receiver for handling commands");

  targetProcess.on("message", async (message: { correlationId: string, command: HostCommand }) =>
  {
    const { correlationId, command } = message;
    const commandType = command.type;
    logger.debug(`Received a command of type '${commandType}' with correlation id '${correlationId}'`);
    try
    {
      const result = await responseProvider(command);
      logger.debug(`Sending a response following a command of type '${commandType}' with correlation id '${correlationId}`);
      targetProcess.send({ correlationId, result });
    }
    catch (error)
    {
      logger.debug(`Sending an error response following a command of type '${commandType}' with correlation id '${correlationId}`);
      targetProcess.send({ correlationId, error: (error as Error).message });
    }
  });
}
