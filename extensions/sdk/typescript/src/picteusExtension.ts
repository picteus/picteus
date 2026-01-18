import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
// We do not import the "process" package on purpose, otherwise we get the runtime error "process.on is not a function"
import console from "node:console";

import { io, Socket } from "socket.io-client";

import {
  ApiSecretApi,
  Configuration,
  ExtensionApi,
  ImageApi,
  ImageAttachmentApi,
  Json,
  Manifest,
  ManifestFromJSON,
  MiscellaneousApi,
  RepositoryApi
} from "./index";


export type NotificationValue = Record<string, any>;

export enum NotificationReturnedErrorCause {Cancel, Error}

export class NotificationReturnedError extends Error
{

  public readonly reason: NotificationReturnedErrorCause;

  constructor(message: string, reason: NotificationReturnedErrorCause)
  {
    super(message);
    this.reason = reason;
  }

}

export interface NotificationsParametersIntent
{
  readonly parameters: Json;
}

export enum NotificationsUiAnchor
{
  // noinspection JSUnusedGlobalSymbols
  Modal = "modal",
  Sidebar = "sidebar",
  ImageDetail = "imageDetail"
}

export interface NotificationsUi
{
  readonly anchor: NotificationsUiAnchor;
  readonly url: string;
}

export interface NotificationsUiIntent
{
  readonly ui: NotificationsUi;
}

export enum NotificationsDialogType
{
  Error = "Error",
  Info = "Info",
  Question = "Question"
}

export interface NotificationsDialog
{
  readonly type: NotificationsDialogType;
  readonly title: string;
  readonly description: string;
  readonly details?: string;
  readonly buttons: { yes: string, no?: string };
}

export interface NotificationsDialogIntent
{
  readonly dialog: NotificationsDialog;
}

export interface NotificationsImage
{
  readonly imageId: string;
  readonly title?: string;
  readonly description?: string;
  readonly details?: string;
}

export interface NotificationsImages
{
  readonly images: NotificationsImage[];
  readonly title?: string;
  readonly description?: string;
  readonly details?: string;
}

export interface NotificationsImagesIntent
{
  readonly images: NotificationsImages;
}

export enum NotificationsShowType
{
  ExtensionSettings = "ExtensionSettings",
  Image = "Image",
  Repository = "Repository"
}

export interface NotificationsShow
{
  readonly type: NotificationsShowType;
  readonly id: string;
}

export interface NotificationsShowIntent
{
  readonly show: NotificationsShow;
}

export type NotificationsIntent =
  NotificationsParametersIntent
  | NotificationsUiIntent
  | NotificationsDialogIntent
  | NotificationsImagesIntent
  | NotificationsShowIntent

export enum NotificationEvent
{
  ProcessRunCommand = "process.runCommand",
  ImageCreated = "image.created",
  ImageUpdated = "image.updated",
  ImageDeleted = "image.deleted",
  ImageComputeFeatures = "image.computeFeatures",
  ImageComputeEmbeddings = "image.computeEmbeddings",
  ImageComputeTags = "image.computeTags",
  ImageRunCommand = "image.runCommand",
  TextComputeEmbeddings = "text.computeEmbeddings"
}

const extensionSettingsEvent = "extension.settings";

export class Helper
{

  static readonly GENERATION_RECIPE_SCHEMA_VERSION = 1;

}

export interface ApiCallErrorDetails
{
  status: number;
  code: number;
  message: string;
}

export class ApiCallError extends Error
{

  constructor(public readonly details: ApiCallErrorDetails)
  {
    super();
  }

}

const dateToString = (date: Date): string =>
{

  function padNumber(number: number, length: number): string
  {
    return number.toString().padStart(length, "0");
  }

  return `${padNumber(date.getHours(), 2)}:${padNumber(date.getMinutes(), 2)}:${padNumber(date.getSeconds(), 2)}.${padNumber(date.getMilliseconds(), 3)}`;
};

const computeLeveledLogMethod = (logger: Logger, level: string): LeveledLogMethod =>
{

  return function(message: any, ...meta: any[]): Logger
  {
    // @ts-ignore
    const consoleFunction: (message: any, ...meta: any[]) => {} = console[level];
    const prefix: string = `${dateToString(new Date())} | ${process.pid} | main [${level.toUpperCase().padStart(5, " ")}]`;
    consoleFunction(`${prefix}: ${message}`, ...meta);
    return logger;
  };

};

interface LeveledLogMethod
{
  (message: string, ...meta: any[]): Logger;

  (message: any): Logger;

  (infoObject: object): Logger;
}

export class Logger
{

  readonly debug: LeveledLogMethod = computeLeveledLogMethod(this, "log");

  readonly info: LeveledLogMethod = computeLeveledLogMethod(this, "info");

  readonly warn: LeveledLogMethod = computeLeveledLogMethod(this, "warn");

  readonly error: LeveledLogMethod = computeLeveledLogMethod(this, "error");

}

class ExtensionParameters
{

  readonly apiKey?: string;

  readonly extensionId: string;

  readonly webServicesBaseUrl: string;

  constructor(parameters: Record<string, any>)
  {
    this.apiKey = parameters.apiKey;
    this.extensionId = parameters.extensionId;
    this.webServicesBaseUrl = parameters.webServicesBaseUrl;
  }

}

class MessageSender
{

  private readonly logger: Logger;

  private readonly parameters: ExtensionParameters;

  private readonly socket: Socket;

  public readonly toString: () => string;

  private readonly contextId?: string;

  constructor(logger: Logger, parameters: ExtensionParameters, socket: Socket, toString: () => string, contextId?: string)
  {
    this.logger = logger;
    this.parameters = parameters;
    this.socket = socket;
    this.toString = toString;
    this.contextId = contextId;
  }

  sendMessage(channel: string, body: Record<string, any>, callback?: (result: any) => Promise<void>): void
  {
    const contextId = this.contextId;
    this.logger.debug(`Sending the message '${JSON.stringify(body)}' on channel '${channel}' for ${this.toString()}${contextId === undefined ? "" : ` attached to the context with id '${contextId}'`}${callback === undefined ? "" : " and waiting for a callback"}`);
    const value: Record<string, any> =
      {
        extensionId: this.parameters.extensionId,
        ...body
      };
    // If there is no API key, we do not set it
    if (this.parameters.apiKey !== undefined)
    {
      value.apiKey = this.parameters.apiKey;
    }
    if (contextId !== undefined)
    {
      value.contextId = contextId;
    }
    if (callback === undefined)
    {
      this.socket.emit(channel, value);
    }
    else
    {
      this.socket.emit(channel, value, callback);
    }
  }

}

const notificationsChannel = "notifications";

export class Communicator
{

  private readonly logger: Logger;

  private readonly sender: MessageSender;

  constructor(logger: Logger, sender: MessageSender)
  {
    this.logger = logger;
    this.sender = sender;
  }

  sendLog(message: string, level: "debug" | "info" | "warn" | "error"): void
  {
    this.logger[level](message);
    this.sendMessage(notificationsChannel, { log: { message, level } });
  }

  sendNotification(value: Record<string, any>): void
  {
    this.sendMessage(notificationsChannel, { notification: value });
  }

  async launchIntent<T>(intent: NotificationsIntent): Promise<T>
  {
    return await new Promise<T>((resolve, reject) =>
    {
      this.sendMessage(notificationsChannel, { intent }, async ({ value, cancel, error }: {
        value: any | undefined,
        cancel: string | undefined,
        error: string | undefined
      }) =>
      {
        this.logger.debug(`Received a result related to the intent '${JSON.stringify(intent)}' for ${this.sender.toString()}`);
        if (cancel !== undefined)
        {
          reject(new NotificationReturnedError(cancel, NotificationReturnedErrorCause.Cancel));
        }
        else if (error !== undefined)
        {
          reject(new NotificationReturnedError(error, NotificationReturnedErrorCause.Error));
        }
        else
        {
          resolve(value as T);
        }
      });
    });
  }

  private sendMessage(channel: string, body: Record<string, any>, callback?: (result: any) => Promise<void>): void
  {
    this.sender.sendMessage(channel, body, callback);
  }

}

export type SettingsValue = Record<string, any>;

export class PicteusExtension
{

  public static getManifest(): Manifest
  {
    return ManifestFromJSON(JSON.parse(fs.readFileSync(path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "manifest.json"), { encoding: "utf8" })));
  }

  public static getSdkVersion(): string
  {
    return JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"), { encoding: "utf8" })).version;
  }

  public static getCacheDirectoryPath(): string
  {
    return path.join(PicteusExtension.getExtensionHomeDirectoryPath(), ".cache");
  }

  public static getExtensionHomeDirectoryPath(): string
  {
    return path.resolve(process.cwd());
  }

  protected readonly logger: Logger = new Logger();

  protected readonly parameters: ExtensionParameters;

  protected readonly extensionId: string;

  protected readonly webServicesBaseUrl: string;

  protected readonly apiKey: string;

  protected readonly configuration: Configuration;

  private socket?: Socket;

  private globalCommunicator?: Communicator;

  constructor()
  {
    this.logger.info(`Instantiating the ${this.toString()} through the process with id '${process.pid}' relying on the SDK version '${PicteusExtension.getSdkVersion()}'`);
    process.on("SIGTERM", async (signal: NodeJS.Signals) =>
    {
      this.logger.info(`Received the termination signal '${signal}' regarding the ${this.toString()}`);
      try
      {
        await this.onTerminate();
      }
      finally
      {
        this.disconnectSocket();
        this.logger.info(`Exiting from the ${this.toString()}`);
        process.exit(0);
      }
    });
    this.parameters = new ExtensionParameters(this.getParameters());
    this.extensionId = this.parameters.extensionId;
    this.webServicesBaseUrl = this.parameters.webServicesBaseUrl;
    this.apiKey = this.parameters.apiKey;
    this.configuration = this.getApiConfiguration();
  }

  public async run(): Promise<void>
  {
    this.logger.info(`Running the ${(this.toString())}`);
    let result;
    try
    {
      result = await this.initialize();
    }
    catch (error)
    {
      this.logger.error(`The initialization of the ${this.toString()} failed. Reason: '${error.message}'`, error);
      process.exit(1);
    }
    try
    {
      if (result === true)
      {
        try
        {
          this.connectSocket();
        }
        catch (error)
        {
          this.logger.error(`The connection of the ${this.toString()} failed. Reason: '${error.message}'`, error);
          process.exit(2);
        }
      }
      else
      {
        await this.onReady();
      }
    }
    finally
    {
      this.logger.info(`The ${this.toString()} is over`);
    }
  }

  protected toString(): string
  {
    return `extension` + (this.extensionId === undefined ? "" : ` with id '${this.extensionId}'`) + ` of class '${this.constructor.name}'`;
  }

  protected async initialize(): Promise<boolean>
  {
    return true;
  }

  protected async onReady(communicator?: Communicator): Promise<void>
  {
  }

  protected async onTerminate(): Promise<void>
  {
  }

  protected async onSettings(communicator: Communicator, value: SettingsValue): Promise<void>
  {
    return Promise.resolve();
  }

  // noinspection JSUnusedLocalSymbols
  protected async onEvent(communicator: Communicator, event: string, value: NotificationValue): Promise<any>
  {
  }

  protected getMiscellaneousApi(): MiscellaneousApi
  {
    return new MiscellaneousApi(this.configuration);
  }

  protected getApiSecretApi(): ApiSecretApi
  {
    return new ApiSecretApi(this.configuration);
  }

  protected getExtensionApi(): ExtensionApi
  {
    return new ExtensionApi(this.configuration);
  }

  protected getRepositoryApi(): RepositoryApi
  {
    return new RepositoryApi(this.configuration);
  }

  protected getImageApi(): ImageApi
  {
    return new ImageApi(this.configuration);
  }

  protected getImageAttachmentApi(): ImageAttachmentApi
  {
    return new ImageAttachmentApi(this.configuration);
  }

  protected async getSettings(): Promise<SettingsValue>
  {
    return (await new ExtensionApi(this.configuration).extensionGetSettings({ id: this.extensionId })).value;
  }

  private getParameters(): Record<string, any>
  {
    return JSON.parse(fs.readFileSync(path.join(PicteusExtension.getExtensionHomeDirectoryPath(), "parameters.json"), { encoding: "utf8" }));
  }

  private connectSocket(): void
  {
    this.logger.info(`Connecting the ${this.toString()} to the server`);
    const options =
      {
        autoConnect: true,
        transports: ["websocket"],
        rejectUnauthorized: false
      };
    this.socket = io(this.parameters.webServicesBaseUrl, options);
    const globalSender = new MessageSender(this.logger, this.parameters, this.socket, () =>
    {
      return this.toString();
    });
    this.globalCommunicator = new Communicator(this.logger, globalSender);
    this.socket.on("connect", async (): Promise<void> =>
    {
      this.logger.info(`The ${this.toString()} socket is connected`);
      await this.onReady(this.globalCommunicator);
    });
    this.socket.on("connect_error", async (): Promise<void> =>
    {
      this.logger.warn(`The ${this.toString()} socket connection failed"`);
    });
    this.socket.on("disconnect", async (): Promise<void> =>
    {
      this.logger.info(`The ${this.toString()} socket is disconnected`);
    });
    this.socket.on("events", async (command: {
        channel: string,
        contextId: string,
        milliseconds: number,
        value: NotificationValue
      }, onResult: (result: any) => void): Promise<void> =>
      {
        const { channel, contextId, milliseconds, value } = command;
        this.logger.info(`The ${this.toString()} received at ${dateToString(new Date(milliseconds))} the command '${JSON.stringify(command)}' on channel '${channel}' attached to the context with id '${contextId}'`);
        const sender = new MessageSender(this.logger, this.parameters, this.socket, () =>
        {
          return this.toString();
        }, contextId);
        const communicator: Communicator = new Communicator(this.logger, sender);
        const isRegularEvent = channel !== extensionSettingsEvent;
        let result: any;
        let success = false;
        try
        {
          result = await (isRegularEvent === true ? this.onEvent(communicator, channel, value) : this.onSettings(communicator, value.value));
          success = true;
        }
        catch (error)
        {
          // We want the process to continue even if an exception occurs
          this.logger.error(`An error occurred during the handling of the event on channel '${channel}'`, error);
          communicator.sendLog(`The handling of the event failed for the ${this.toString()}. Reason: '${error.message}'`, "error");
        }
        finally
        {
          sender.sendMessage(notificationsChannel, { acknowledgment: { success } });
        }
        if (isRegularEvent === true && onResult !== undefined)
        {
          onResult(result);
        }
      }
    );
    globalSender.sendMessage("connection", {
      isOpen: true,
      sdkVersion: PicteusExtension.getSdkVersion(),
      environment: "node"
    });
  }

  private disconnectSocket(): void
  {
    if (this.socket !== undefined && this.socket.disconnected === false)
    {
      this.logger.info(`Disconnecting the ${this.toString()} from the server`);
      this.socket.close();
      this.socket = undefined;
    }
  }

  private getApiConfiguration(): Configuration
  {
    if (this.parameters.webServicesBaseUrl.startsWith("https://localhost") == true)
    {
      // This enables to discard the warning log message, caused by the fact that we are issuing HTTPS request on the localhost exposing a self-served certificate
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    }
    return new Configuration({
      basePath: this.webServicesBaseUrl,
      apiKey: this.apiKey,
      fetchApi: async (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response> =>
      {
        const response = await fetch(input, init);
        if (response.status < 400)
        {
          return Promise.resolve(response);
        }
        let code: number = -1;
        let message: string;
        const contentType = response.headers.get("content-type");
        if (contentType !== null && contentType.includes("application/json") === true)
        {
          const json = await response.json();
          code = json.code;
          message = json.message;
        }
        else
        {
          // The result is not a JSON content
          message = await response.text();
        }
        return Promise.reject(new ApiCallError({ status: response.status, code, message }));
      }
    });
  }

}
