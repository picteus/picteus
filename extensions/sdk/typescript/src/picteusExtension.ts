import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
// We do not import the "process" package on purpose, otherwise we get the runtime error "process.on is not a function"
import console from "node:console";

import { io, Socket } from "socket.io-client";

import {
  ApiSecretApi,
  CollectionApi,
  Configuration,
  ExtensionApi,
  ImageApi,
  ImageAttachmentApi,
  IntentToastType,
  Manifest,
  ManifestFromJSON,
  MiscellaneousApi,
  RepositoryApi
} from "./index";
import { Intent } from "./intents";


export type EventValue = Record<string, any>;

export const InstructionReturnedErrorCause = { Cancel: 0, Error: 1 } as const;
export type InstructionReturnedErrorCause = (typeof InstructionReturnedErrorCause)[keyof typeof InstructionReturnedErrorCause];

export class InstructionReturnedError extends Error
{

  constructor(message: string, public readonly reason: InstructionReturnedErrorCause)
  {
    super(message);
  }

}

export type CommandParameters = Record<string, any>;

export class CommandError extends Error
{

  static fromError(error: CommandParameters): CommandError
  {
    return new CommandError(error.message);
  }

  constructor(message: string)
  {
    super(message);
  }

}

export const EventName =
  {
    ProcessRunCommand: "process.runCommand",
    ImageCreated: "image.created",
    ImageUpdated: "image.updated",
    ImageTagsUpdated: "image.tags.updated",
    ImageFeaturesUpdated: "image.features.updated",
    ImageDeleted: "image.deleted",
    ImageComputeFeatures: "image.computeFeatures",
    ImageComputeEmbeddings: "image.computeEmbeddings",
    ImageComputeTags: "image.computeTags",
    ImageRunCommand: "image.runCommand",
    TextComputeEmbeddings: "text.computeEmbeddings"
  } as const;
export type EventName = (typeof EventName)[keyof typeof EventName];

const extensionVersionsChannel = "extension.versions";
const extensionReadyChannel = "extension.ready";
const extensionSettingsChannel = "extension.settings";

// noinspection JSUnusedGlobalSymbols
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

  return function (message: any, ...meta: any[]): Logger
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

const stringifyWithStrippedBuffers = (object: object): string =>
{
  const bufferReplacement = "<bytes>";
  return JSON.stringify(object, (_key, value) =>
  {
    // We check if the value is a Buffer
    if (value !== undefined && value !== null && value.type === "Buffer" && Array.isArray(value.data) === true)
    {
      return bufferReplacement;
    }
    // We also check for native Buffer instances if they haven't been pre-processed
    if (Buffer.isBuffer(value) === true)
    {
      return bufferReplacement;
    }
    return value;
  }, 0);
};

class MessageSender
{

  private readonly logger: Logger;

  private readonly parameters: ExtensionParameters;

  private readonly socket: Socket;

  public readonly toString: () => string;

  private readonly contextId?: string;

  private _maximumPayloadSizeInBytes?: number;

  constructor(logger: Logger, parameters: ExtensionParameters, socket: Socket, toString: () => string, contextId?: string)
  {
    this.logger = logger;
    this.parameters = parameters;
    this.socket = socket;
    this.toString = toString;
    this.contextId = contextId;
  }

  set maximumPayloadSizeInBytes(value: number)
  {
    this._maximumPayloadSizeInBytes = value;
  }

  sendMessage(event: string, body: Record<string, any>, callback?: (result: any) => Promise<void>): void
  {
    const contextId = this.contextId;
    this.logger.debug(`Sending the message '${stringifyWithStrippedBuffers(body)}' through the '${event}' event for ${this.toString()}${contextId === undefined ? "" : ` attached to the context with id '${contextId}'`}${callback === undefined ? "" : " and waiting for a callback"}`);
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
      this.socket.emit(event, value);
    }
    else
    {
      this.socket.emit(event, value, callback);
    }
  }

}

const instructionsEvent = "instructions";

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
    this.sendMessage(instructionsEvent, { log: { message, level } });
  }

  // noinspection JSUnusedGlobalSymbols
  sendNotification(value: Record<string, any>): void
  {
    this.sendMessage(instructionsEvent, { notification: value });
  }

  async launchIntent<T>(intent: Intent): Promise<T>
  {
    return await new Promise<T>((resolve, reject) =>
    {
      this.sendMessage(instructionsEvent, { intent }, async ({ value, cancel, error }: {
        value: any | undefined,
        cancel: string | undefined,
        error: string | undefined
      }) =>
      {
        this.logger.debug(`Received a result related to the intent '${stringifyWithStrippedBuffers(intent)}' for ${this.sender.toString()}`);
        if (cancel !== undefined)
        {
          reject(new InstructionReturnedError(cancel, InstructionReturnedErrorCause.Cancel));
        }
        else if (error !== undefined)
        {
          reject(new InstructionReturnedError(error, InstructionReturnedErrorCause.Error));
        }
        else
        {
          resolve(value as T);
        }
      });
    });
  }

  private sendMessage(event: string, body: Record<string, any>, callback?: (result: any) => Promise<void>): void
  {
    this.sender.sendMessage(event, body, callback);
  }

}

export type SettingsValue = Record<string, any>;
export type Versions = { previous: string | undefined, current: string };

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

  // noinspection JSUnusedGlobalSymbols
  public static getCacheDirectoryPath(): string
  {
    return path.join(PicteusExtension.getExtensionHomeDirectoryPath(), ".cache");
  }

  public static getExtensionHomeDirectoryPath(): string
  {
    return path.resolve(process.cwd());
  }

  public static readonly SOFTWARE: string = "picteus";

  protected readonly logger: Logger = new Logger();

  protected readonly parameters: ExtensionParameters;

  protected readonly extensionId: string;

  protected readonly webServicesBaseUrl: string;

  protected readonly apiKey: string;

  protected readonly configuration: Configuration;

  private socket?: Socket;

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
      this.exit(1, error, "the initialization failed");
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
          this.exit(2, error, "the connection failed");
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
    return `extension${this.extensionId === undefined ? "" : ` with id '${this.extensionId}'`} of class '${this.constructor.name}'`;
  }

  protected async initialize(): Promise<boolean>
  {
    return true;
  }

  protected async onUpgrade(_communicator: Communicator, _versions: Versions): Promise<void>
  {
  }

  protected async onReady(_communicator?: Communicator): Promise<void>
  {
  }

  protected async onTerminate(): Promise<void>
  {
  }

  protected async onSettings(_communicator: Communicator, _value: SettingsValue): Promise<void>
  {
  }

  protected async onEvent(communicator: Communicator, event: EventName, value: EventValue): Promise<any>
  {
    if (event === EventName.ImageCreated)
    {
      const imageId: string = value["id"];
      return await this.onImageCreated(communicator, imageId);
    }
    else if (event === EventName.ImageUpdated)
    {
      const imageId: string = value["id"];
      return await this.onImageUpdated(communicator, imageId);
    }
    else if (event === EventName.ImageDeleted)
    {
      const imageId: string = value["id"];
      return await this.onImageDeleted(communicator, imageId);
    }
    else if (event === EventName.ImageTagsUpdated)
    {
      const imageId: string = value["id"];
      return await this.onImageTagsUpdated(communicator, imageId);
    }
    else if (event === EventName.ImageFeaturesUpdated)
    {
      const imageId: string = value["id"];
      return await this.onImageFeaturesUpdated(communicator, imageId);
    }
    else if (event === EventName.ImageComputeTags)
    {
      const imageId: string = value["id"];
      return await this.onComputeImageTags(communicator, imageId);
    }
    else if (event === EventName.ImageComputeFeatures)
    {
      const imageId: string = value["id"];
      return await this.onComputeImageFeatures(communicator, imageId);
    }
    else if (event === EventName.ImageComputeEmbeddings)
    {
      const imageId: string = value["id"];
      return await this.onComputeImageEmbeddings(communicator, imageId);
    }
    else if (event === EventName.ImageRunCommand)
    {
      const commandId: string = value["commandId"];
      const imageIds: string[] = value["imageIds"];
      const parameters: CommandParameters = value["parameters"] ?? {};
      return await this.onImagesCommand(communicator, commandId, imageIds, parameters);
    }
    else if (event === EventName.ProcessRunCommand)
    {
      const commandId: string = value["commandId"];
      const parameters: CommandParameters = value["parameters"] ?? {};
      return await this.onProcessCommand(communicator, commandId, parameters);
    }
    else if (event === EventName.TextComputeEmbeddings)
    {
      const text: string = value["text"];
      return await this.onComputeTextEmbeddings(communicator, text);
    }
  }

  protected async onImageCreated(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onImageUpdated(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onImageDeleted(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onImageTagsUpdated(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onImageFeaturesUpdated(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onComputeImageTags(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onComputeImageFeatures(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onComputeImageEmbeddings(_communicator: Communicator, _imageId: string): Promise<void>
  {
  }

  protected async onImagesCommand(_communicator: Communicator, _commandId: string, _imageIds: string[], _parameters: CommandParameters): Promise<void>
  {
  }

  protected async onProcessCommand(_communicator: Communicator, _commandId: string, _parameters: CommandParameters): Promise<void>
  {
  }

  protected async onComputeTextEmbeddings(_communicator: Communicator, _text: string): Promise<number []>
  {
    return [];
  }

  // noinspection JSUnusedGlobalSymbols
  protected getMiscellaneousApi(): MiscellaneousApi
  {
    return new MiscellaneousApi(this.configuration);
  }

  // noinspection JSUnusedGlobalSymbols
  protected getApiSecretApi(): ApiSecretApi
  {
    return new ApiSecretApi(this.configuration);
  }

  // noinspection JSUnusedGlobalSymbols
  protected getExtensionApi(): ExtensionApi
  {
    return new ExtensionApi(this.configuration);
  }

  // noinspection JSUnusedGlobalSymbols
  protected getRepositoryApi(): RepositoryApi
  {
    return new RepositoryApi(this.configuration);
  }

  // noinspection JSUnusedGlobalSymbols
  protected getCollectionApi(): CollectionApi
  {
    return new CollectionApi(this.configuration);
  }

  protected getImageApi(): ImageApi
  {
    return new ImageApi(this.configuration);
  }

  // noinspection JSUnusedGlobalSymbols
  protected getImageAttachmentApi(): ImageAttachmentApi
  {
    return new ImageAttachmentApi(this.configuration);
  }

  // noinspection JSUnusedGlobalSymbols
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
        transports: [ "websocket" ],
        rejectUnauthorized: false
      };
    this.socket = io(this.parameters.webServicesBaseUrl, options);
    const globalSender = new MessageSender(this.logger, this.parameters, this.socket, () =>
    {
      return this.toString();
    });
    this.socket.on("connect", async (): Promise<void> =>
    {
      this.logger.info(`The ${this.toString()} socket is connected`);
      globalSender.sendMessage("connection", {
        isOpen: true,
        sdkVersion: PicteusExtension.getSdkVersion(),
        environment: "node"
      }, async (result: { maximumPayloadSizeInBytes: number }) =>
      {
        const maximumPayloadSizeInBytes = result.maximumPayloadSizeInBytes;
        this.logger.debug(`The ${this.toString()} socket has a maximum payload size of ${maximumPayloadSizeInBytes} bytes`);
        globalSender.maximumPayloadSizeInBytes = maximumPayloadSizeInBytes;
      });
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
        value: EventValue
      }, onResult: (result: any) => void): Promise<void> =>
      {
        const { channel, contextId, milliseconds, value } = command;
        this.logger.info(`The ${this.toString()} received at ${dateToString(new Date(milliseconds))} the command '${JSON.stringify(command)}' on channel '${channel}' attached to the context with id '${contextId}'`);
        const sender = new MessageSender(this.logger, this.parameters, this.socket, () =>
        {
          return this.toString();
        }, contextId);
        sender.maximumPayloadSizeInBytes = globalSender.maximumPayloadSizeInBytes;
        const communicator: Communicator = new Communicator(this.logger, sender);
        const requiresResult = channel !== extensionSettingsChannel;
        let result: any;
        let success = false;
        let eventName: EventName | undefined;
        try
        {
          if (channel === extensionSettingsChannel)
          {
            result = await this.onSettings(communicator, value.value as SettingsValue);
          }
          else if (channel === extensionVersionsChannel)
          {
            type VersionsWithUpgrade = Versions & { upgrade: boolean };
            const { upgrade, ...versions } = value as VersionsWithUpgrade;
            if (upgrade === true)
            {
              await this.onUpgrade(communicator, versions);
              result = true;
            }
            else
            {
              result = true;
            }
          }
          else if (channel === extensionReadyChannel)
          {
            try
            {
              await this.onReady(communicator);
              result = true;
            }
            catch (error)
            {
              this.exit(3, error, "an error occurred during the execution of the 'onReady()' method: stopping the process");
            }
          }
          else
          {
            eventName = channel as EventName;
            result = await this.onEvent(communicator, eventName, value);
          }
          success = true;
        }
        catch (error)
        {
          // We want the process to continue even if an exception occurs
          this.logger.error(`An error occurred during the handling of the event on channel '${channel}'`, error);
          if ((eventName === EventName.ImageRunCommand || eventName === EventName.ProcessRunCommand) && error instanceof CommandError)
          {
            void communicator.launchIntent({ toast: { type: IntentToastType.Error, subtitle: error.message } });
          }
          else
          {
            communicator.sendLog(`The handling of the event failed for the ${this.toString()}. Reason: '${error.message}'`, "error");
          }
        }
        finally
        {
          sender.sendMessage(instructionsEvent, { acknowledgment: { success } });
        }
        if (requiresResult === true && onResult !== undefined)
        {
          onResult(result);
        }
      }
    );
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

  private exit(code: number, error: Error, message: string): never
  {
    this.logger.error(`For the ${this.toString()}, ${message}. Reason: '${error.message}'`, error);
    process.exit(code);
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
