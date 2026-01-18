import { randomUUID } from "node:crypto";

import { Server, Socket } from "socket.io";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { GatewayMetadata } from "@nestjs/websockets/interfaces";
import { ModuleRef } from "@nestjs/core";
import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { z } from "zod";
import { format } from "fecha";

import { logger } from "../logger";
import { paths } from "../paths";
import { Manifest, ManifestEvent, ManifestRuntimeEnvironment } from "../dtos/app.dtos";
import {
  fromExtensionEventActionToManifestEvent,
  fromImageEventActionToManifestEvent,
  fromProcessEventActionToManifestEvent,
  fromTextEventActionToManifestEvent,
  Json
} from "../bos";
import {
  ActivityAction,
  EventAction,
  EventEntity,
  ExtensionEventAction,
  ImageEventAction,
  Notifier,
  ProcessEventAction,
  TextEventAction
} from "../notifier";
import { AuthenticationGuard } from "../app.guards";
import { addJsonSchemaAdditionalProperties, computeAjv, validateJsonSchema, validateSchema } from "./utils/ajvWrapper";
import { ExtensionService } from "./extensionServices";
import { ExtensionRegistry } from "./extensionRegistry";
import { ExtensionTaskExecutor } from "./extensionTaskExecutor";


type SocketMessageValue = { apiKey?: string, extensionId?: string, contextId?: string }
type ConnectionValue = SocketMessageValue & {
  isOpen?: boolean,
  sdkVersion?: string,
  environment?: ManifestRuntimeEnvironment
};
type NotificationsAcknowledgment = { contextId: string, success: boolean }
type NotificationsLog = { log: string, level: string }
type NotificationsNotification = Record<string, any>

interface NotificationsParametersIntent
{
  readonly parameters: Json;
}

enum NotificationsUiAnchor
{
  Modal = "modal",
  Sidebar = "sidebar",
  ImageDetail = "imageDetail"
}

interface NotificationsUi
{
  readonly anchor: NotificationsUiAnchor;
  readonly url: string;
}

interface NotificationsUiIntent
{
  readonly ui: NotificationsUi;
}

enum NotificationsDialogType
{
  Error = "Error",
  Info = "Info",
  Question = "Question"
}

interface NotificationsDialog
{
  readonly type: NotificationsDialogType;
  readonly title: string;
  readonly description: string;
  readonly details?: string;
  readonly buttons: { yes: string, no?: string };
}

interface NotificationsDialogIntent
{
  readonly dialog: NotificationsDialog;
}

interface NotificationsImage
{
  readonly imageId: string;
  readonly title?: string;
  readonly description?: string;
  readonly details?: string;
}

interface NotificationsImages
{
  readonly images: NotificationsImage[];
  readonly title?: string;
  readonly description?: string;
  readonly details?: string;
}

interface NotificationsImagesIntent
{
  readonly images: NotificationsImages;
}

enum NotificationsShowType
{
  ExtensionSettings = "ExtensionSettings",
  Image = "Image",
  Repository = "Repository"
}

interface NotificationsShow
{
  readonly type: NotificationsShowType;
  readonly id: string;
}

interface NotificationsShowIntent
{
  readonly show: NotificationsShow;
}

type NotificationsIntent =
  NotificationsParametersIntent
  | NotificationsUiIntent
  | NotificationsDialogIntent
  | NotificationsImagesIntent
  | NotificationsShowIntent

const isNotificationsParametersIntent = (intent: NotificationsIntent): intent is NotificationsParametersIntent =>
{
  return (intent as NotificationsParametersIntent).parameters !== undefined;
};
const isNotificationsUiIntent = (intent: NotificationsIntent): intent is NotificationsUiIntent =>
{
  return (intent as NotificationsUiIntent).ui !== undefined;
};
const isNotificationsDialogIntent = (intent: NotificationsIntent): intent is NotificationsDialogIntent =>
{
  return (intent as NotificationsDialogIntent).dialog !== undefined;
};
const isNotificationsImagesIntent = (intent: NotificationsIntent): intent is NotificationsImagesIntent =>
{
  return (intent as NotificationsImagesIntent).images !== undefined;
};
const isNotificationsShowIntent = (intent: NotificationsIntent): intent is NotificationsShowIntent =>
{
  return (intent as NotificationsShowIntent).show !== undefined;
};

type NotificationsValue = SocketMessageValue & {
  log?: NotificationsLog,
  notification?: NotificationsNotification,
  acknowledgment?: NotificationsAcknowledgment,
  intent?: NotificationsIntent
}
export type NotificationsReturnedValue = { value?: any, cancel?: string, error?: string }

@WebSocketGateway<GatewayMetadata>({ transports: ["websocket"] })
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{

  @WebSocketServer()
  private io?: Server;

  private readonly activeSocketIds: Set<string> = new Set();

  private readonly perSocketIdExtensionId: Map<string, string> = new Map();

  private readonly perExtensionIdSocketIds: Map<string, string[]> = new Map();

  private readonly perExtensionsSocketSupportedEvents: Map<string, string []> = new Map();

  private readonly perEventContextId: Map<string, string> = new Map();

  // @ts-ignore
  private notifier: Notifier;

  constructor(private readonly eventEmitter: EventEmitter2, private readonly extensionTaskExecutor: ExtensionTaskExecutor, private readonly moduleRef: ModuleRef)
  {
    logger.debug("Instantiating a NotificationsGateway");
  }

  afterInit(): void
  {
  }

  handleConnection(socket: Socket): void
  {
    const sockets = this.sockets;
    logger.info(`A new socket client with id '${socket.id}' has connected${sockets === undefined ? "" : ` (the number of connected client is now ${sockets.size})`}`);
  }

  handleDisconnect(socket: Socket): void
  {
    const socketId = socket.id;
    logger.info(`The socket client with id '${socketId}' has disconnected`);

    const extensionId = this.perSocketIdExtensionId.get(socketId);
    if (extensionId !== undefined)
    {
      this.moduleRef.get(ExtensionService).onConnection(extensionId, false);
      this.perSocketIdExtensionId.delete(socketId);
      {
        const socketIds = this.perExtensionIdSocketIds.get(extensionId);
        socketIds?.splice(socketIds.indexOf(socketId), 1);
        if (socketIds?.length === 0)
        {
          this.perExtensionIdSocketIds.delete(extensionId);
        }
      }
    }
    this.activeSocketIds.delete(socketId);
    this.perExtensionsSocketSupportedEvents.delete(socketId);
  }

  async onModuleInit(): Promise<void>
  {
    this.notifier = new Notifier(this.eventEmitter);
    this.notifier.onAll(this.onNotifierEvent.bind(this));
    logger.debug("The initializing of a NotificationsGateway is over");
  }

  async onModuleDestroy(): Promise<void>
  {
    logger.debug("Destroying a NotificationsGateway");
    const sockets = this.sockets;
    if (sockets !== undefined)
    {
      for (const socket of sockets.values())
      {
        socket.disconnect(true);
      }
    }
    this.io = undefined;
    this.notifier.destroy();
    this.activeSocketIds.clear();
    this.perExtensionsSocketSupportedEvents.clear();
    this.perEventContextId.clear();
    logger.debug("Destroyed a NotificationsGateway");
  }

  private async onNotifierEvent(event: string, value: object, marker?: string, onResult?: (value: object) => void): Promise<void>
  {
    logger.debug(`The '${event}' event occurred${marker === undefined ? "" : (` with the marker '${marker}'`)}${onResult === undefined ? "" : " with a callback"}`);
    const sockets = this.sockets;
    if (sockets !== undefined)
    {
      const milliseconds = Date.now();
      for (const socketEntry of sockets)
      {
        const [socketId, socket] = socketEntry;
        if (this.activeSocketIds.has(socketId) === true)
        {
          const supportedEvents = this.perExtensionsSocketSupportedEvents.get(socketId);
          // All non-extensions sockets will be notified, but we ignore the unsupported events in case of an extension and the ones that are not directed to a specific extension
          const isExtensionSocket = supportedEvents !== undefined;
          const extensionId = isExtensionSocket === false ? undefined : this.perSocketIdExtensionId.get(socketId);
          if ((isExtensionSocket === false && marker === undefined) || (isExtensionSocket === true && supportedEvents.indexOf(event) !== -1 && (marker === undefined || marker === extensionId)))
          {
            const contextId = randomUUID();
            if (event === Notifier.buildEvent(EventEntity.Process, ProcessEventAction.RunCommand) || event === Notifier.buildEvent(EventEntity.Image, ImageEventAction.RunCommand))
            {
              this.perEventContextId.set(event, contextId);
            }
            await this.extensionTaskExecutor.run(extensionId, event, async () =>
            {
              const logSuffix = `${extensionId === undefined ? "" : (` related to the extension with id '${extensionId}'`)}`;
              // In case of an extension, we always want to wait for a socket acknowledgment, which is supposed to be issued by the extension SDK, once the processing is completed, because we want the throttling to be effective
              const waitForAcknowledgment = extensionId === undefined && onResult === undefined;
              if (waitForAcknowledgment === true)
              {
                this.emitEventToSocket(socket, event, contextId, milliseconds, value, logSuffix, undefined);
              }
              else
              {
                await new Promise<void>((resolve, reject) =>
                {
                  this.emitEventToSocket(socket, event, contextId, milliseconds, value, logSuffix, (result) =>
                  {
                    try
                    {
                      logger.debug(`The socket with id '${socketId}' responded following the '${event}' event occurred${marker === undefined ? "" : (` with the marker '${marker}'`)}`);
                      if (onResult !== undefined)
                      {
                        onResult({ value: result });
                      }
                    }
                    catch (error)
                    {
                      return reject(error);
                    }
                    resolve();
                  });
                });
              }
            });
          }
        }
      }
    }
    return Promise.resolve();
  }

  @SubscribeMessage(paths.connection)
  handleConnectionMessage(@MessageBody() connectionValue: ConnectionValue, @ConnectedSocket() socket: Socket): void
  {
    const { apiKey, isOpen, sdkVersion, environment, extensionId } = connectionValue;
    const socketId = socket.id;
    logger.debug(`Received a message coming from channel '${paths.connection}' through the socket client with id '${socketId}'${sdkVersion === undefined ? "" : ` relying on SDK version '${sdkVersion}'`}${environment === undefined ? "" : `, running in environment '${environment}'`}${isOpen === undefined ? "" : ` for ${isOpen === true ? "starting" : "stopping"} the notifications`}` + (extensionId === undefined ? "" : ` related to the extension with id '${extensionId}'`));
    if (this.checkPermission(socketId, paths.connection, apiKey, extensionId, false) === false)
    {
      return;
    }
    if (isOpen === undefined)
    {
      logger.warn(`The message from the socket client with id '${socketId}' will not be taken into account, because it does not contain the 'isOpen' property`);
      return;
    }
    if (isOpen === true)
    {
      if (extensionId !== undefined)
      {
        // We need to check the manifest to know which events the extension is interested in
        const manifest = this.moduleRef.get(ExtensionRegistry).get(extensionId)!;
        const events = this.computeManifestEvents(manifest);
        this.perSocketIdExtensionId.set(socketId, extensionId);
        {
          let socketIds = this.perExtensionIdSocketIds.get(extensionId);
          if (socketIds === undefined)
          {
            socketIds = [];
            this.perExtensionIdSocketIds.set(extensionId, socketIds);
          }
          socketIds.push(socketId);
        }
        this.perExtensionsSocketSupportedEvents.set(socketId, events);
        logger.debug(`The extension with id '${extensionId}' is interested in the [${events.join(", ")}] event(s)`);
        this.moduleRef.get(ExtensionService).onConnection(extensionId, true);
      }
      this.activeSocketIds.add(socketId);
    }
    else
    {
      if (extensionId !== undefined)
      {
        this.perSocketIdExtensionId.delete(socketId);
        {
          const socketIds = this.perExtensionIdSocketIds.get(extensionId);
          socketIds?.splice(socketIds.indexOf(socketId), 1);
          if (socketIds?.length === 0)
          {
            this.perExtensionIdSocketIds.delete(extensionId);
          }
        }
        this.perExtensionsSocketSupportedEvents.delete(extensionId);
        this.moduleRef.get(ExtensionService).onConnection(extensionId, false);
      }
      this.activeSocketIds.delete(socketId);
    }
  }

  @SubscribeMessage(paths.notifications)
  async handleNotificationsMessage(@MessageBody() notificationValue: NotificationsValue, @ConnectedSocket() socket: Socket): Promise<NotificationsReturnedValue | undefined>
  {
    const { apiKey, extensionId, contextId } = notificationValue;
    const socketId = socket.id;
    if (this.checkPermission(socketId, paths.notifications, apiKey, extensionId, true) === false)
    {
      return;
    }

    const masterSocket: Socket | undefined = this.getMasterSocket();
    if (notificationValue.acknowledgment !== undefined)
    {
      // This is an acknowledgment regarding a previously sent event
      const theContextId = contextId!;
      const success = notificationValue.acknowledgment.success;
      logger.debug(`Received a ${success === true ? "successful" : "failure"} acknowledgment regarding a previously sent event to the extension with id '${extensionId}' related to the context with id '${theContextId}'`);
      if (this.perEventContextId.delete(theContextId) === true && masterSocket !== undefined)
      {
        // We notify the master socket of the command achievement
        this.emitEventToSocket(masterSocket, Notifier.buildEvent(EventEntity.Extension, ActivityAction.Acknowledgment), theContextId, Date.now(), {
          id: extensionId,
          contextId: theContextId,
          success
        });
      }
      return;
    }

    if (masterSocket === undefined)
    {
      logger.debug(`Received a message coming from channel '${paths.notifications}' through the socket client with id '${socketId}' related to the extension with id '${extensionId}'${contextId === undefined ? "" : ` attached to the context with id '${contextId}'`}`);
    }
    else
    {
      // It is possible that the server is running headless
      // There is no rejection case, the master's socket error response is handled as a response
      return this.handleNotification(socketId, masterSocket, notificationValue, extensionId, contextId);
    }
  }

  private computeManifestEvents(manifest: Manifest): string[]
  {
    const extensionManifestEvents: ManifestEvent[] = [];
    for (const instruction of manifest.instructions)
    {
      extensionManifestEvents.push(...instruction.events);
    }
    // We add the "extension.settings" event because it is implicitly always supported
    if (extensionManifestEvents.indexOf(ManifestEvent.ExtensionSettings) === -1)
    {
      extensionManifestEvents.push(ManifestEvent.ExtensionSettings);
    }
    // We only want the extensions to be able to receive the events related to their manifest
    const manifestEvents: ManifestEvent[] = Object.values(ManifestEvent) as ManifestEvent [];
    const computeEvents = <T extends EventAction>(action: T[], eventEntity: EventEntity, fromEventActionToManifestEvent: (action: T) => ManifestEvent | null | undefined): string[] =>
    {
      const actions: T[] = Object.values(action) as T [];
      return actions.filter((action: T) =>
      {
        // We only consider the events that may be handled by an extension
        const event: ManifestEvent | null | undefined = fromEventActionToManifestEvent(action);
        if (event === undefined)
        {
          logger.error(`The event action '${action}' on entity '${eventEntity}' does not have a corresponding manifest event`);
          return false;
        }
        else if (event === null)
        {
          // This event action does not have a corresponding manifest event, but is known, so we ignore it
          return false;
        }
        else
        {
          return manifestEvents.indexOf(event) !== -1 && extensionManifestEvents.indexOf(event) !== -1;
        }
      }).map((action: T) =>
      {
        return Notifier.buildEvent(eventEntity, action);
      });
    };
    const processEvents = computeEvents<ProcessEventAction>(Object.values(ProcessEventAction), EventEntity.Process, (action: ProcessEventAction) =>
    {
      return fromProcessEventActionToManifestEvent(action);
    });
    const extensionEvents = computeEvents<ExtensionEventAction>(Object.values(ExtensionEventAction), EventEntity.Extension, (action: ExtensionEventAction) =>
    {
      return fromExtensionEventActionToManifestEvent(action);
    });
    const imageEvents = computeEvents<ImageEventAction>(Object.values(ImageEventAction), EventEntity.Image, (action: ImageEventAction) =>
    {
      return fromImageEventActionToManifestEvent(action);
    });
    const textEvents = computeEvents<TextEventAction>(Object.values(TextEventAction), EventEntity.Text, (action: TextEventAction) =>
    {
      return fromTextEventActionToManifestEvent(action);
    });
    return [...processEvents, ...extensionEvents, ...imageEvents, ...textEvents];
  }

  private get sockets(): Map<string, Socket> | undefined
  {
    return this.io?.sockets?.sockets;
  }

  private getMasterSocket(): Socket | undefined
  {
    for (const activeSocketId of this.activeSocketIds)
    {
      if (this.perExtensionsSocketSupportedEvents.has(activeSocketId) === false)
      {
        const sockets = this.sockets!;
        for (const [socketId, socket] of sockets)
        {
          if (socketId === activeSocketId)
          {
            return socket;
          }
        }
      }
    }
    return undefined;
  }

  private checkPermission(socketId: string, channel: string, apiKey: string | undefined, extensionId: string | undefined, isOnlyExtension: boolean): boolean
  {
    if (paths.requiresApiKey === false)
    {
      return true;
    }
    if (apiKey === undefined)
    {
      logger.warn(`The message${extensionId === undefined ? "" : ` emitted from the extension with '${extensionId}'`} coming from channel '${channel}' through the socket client with id '${socketId}' will not be taken into account, because it does not contain the 'apiKey' property`);
      return false;
    }
    else
    {
      if (extensionId === undefined)
      {
        if (isOnlyExtension === true)
        {
          logger.warn(`The message coming from channel '${channel}' through the socket client with id '${socketId}' will not be taken into account, because it should be emitted from an extension`);
          return false;
        }
        else if (AuthenticationGuard.isMasterApiKey(apiKey) === false)
        {
          logger.warn(`The message coming from channel '${channel}' through the socket client with id '${socketId}' will not be taken into account, because its API key is not the master one`);
          return false;
        }
      }
      else
      {
        if (AuthenticationGuard.isExtensionApiKey(apiKey, extensionId) === false)
        {
          logger.warn(`The message coming from channel '${channel}' through the socket client with id '${socketId}' related to the extension with id '${extensionId}' will not be taken into account, because its API key is not the expected one`);
          return false;
        }
      }
    }
    return true;
  }

  private handleNotification(socketId: string, masterSocket: Socket, notificationValue: NotificationsValue, extensionId: string | undefined, contextId: string | undefined): Promise<NotificationsReturnedValue | undefined>
  {
    return new Promise<NotificationsReturnedValue | undefined>(async (resolve) =>
    {
      const { log, notification, intent }:
        {
          log?: NotificationsLog,
          notification?: NotificationsNotification,
          intent?: NotificationsIntent
        } = notificationValue;
      const value: Json = { id: extensionId };
      let isOk = true;
      let messageLogChunk: string;
      let action: ExtensionEventAction | undefined;
      let onAcknowledged: ((result: any) => void) | undefined;
      if (log !== undefined)
      {
        messageLogChunk = "log";
        value.message = log;
        action = ExtensionEventAction.Log;
      }
      else if (notification !== undefined)
      {
        messageLogChunk = "notification";
        value.message = notification;
        action = ExtensionEventAction.Notification;
      }
      else if (intent !== undefined)
      {
        const result = await this.handleIntent(intent, resolve);
        if (result === undefined)
        {
          isOk = false;
        }
        else
        {
          isOk = true;
          messageLogChunk = `'${result.intentName}' intent`;
          action = ExtensionEventAction.Intent;
          onAcknowledged = result.onAcknowledged;
          value.intent = intent;
        }
      }
      else
      {
        isOk = false;
      }
      if (isOk === false || action === undefined)
      {
        logger.error(`Cannot handle the message from extension with id '${extensionId}' with value ${JSON.stringify(notificationValue)}`);
        return;
      }
      logger.debug(`Received a ${messageLogChunk!} message coming from channel '${paths.notifications}' through the socket client with id '${socketId}' related to the extension with id '${extensionId}'${contextId === undefined ? "" : ` attached to the context with id '${contextId}'`}`);
      this.emitEventToSocket(masterSocket, Notifier.buildEvent(EventEntity.Extension, action), contextId ?? randomUUID(), Date.now(), value, undefined, onAcknowledged);
      if (onAcknowledged === undefined)
      {
        resolve(undefined);
      }
    });
  }

  private async handleIntent(intent: NotificationsIntent, resolve: (value: NotificationsReturnedValue) => void): Promise<{
    intentName: string;
    onAcknowledged: ((result: any) => void)
  } | undefined>
  {
    let intentName: string;
    let onAcknowledged: ((result: any) => void);
    const resolveWithError = (message: string): undefined =>
    {
      resolve({ error: message });
    };
    const resolveWithInvalidIntentSchema = (type: string): undefined =>
    {
      return resolveWithError(`Invalid '${type}' intent because it does not conform to the expected schema`);
    };
    const checkSchema = async (schema: z.ZodSchema<any>, value: any): Promise<boolean> =>
    {
      const returnType = await schema.safeParseAsync(value);
      if (returnType.success === false)
      {
        resolveWithError(`The intent object is not well-formed. Reason: '${returnType.error.issues[0].message}'`);
        return false;
      }
      else
      {
        return true;
      }
    };

    if (isNotificationsParametersIntent(intent) === true)
    {
      intentName = "parameters";
      const specificIntent: NotificationsParametersIntent = intent;
      const specificParameters = specificIntent.parameters;
      try
      {
        validateJsonSchema(computeAjv(), specificParameters);
        addJsonSchemaAdditionalProperties(specificParameters);
      }
      catch (error)
      {
        return resolveWithError(`The intent is not compliant with the JSON schema. Reason: '${(error as Error).message}'`);
      }
      onAcknowledged = (value: NotificationsReturnedValue) =>
      {
        logger.debug(`Received the intent returned value '${JSON.stringify(value)}' from the master socket`);
        if (value.value !== undefined)
        {
          try
          {
            validateSchema(computeAjv(), specificParameters, value.value);
          }
          catch (error)
          {
            return resolveWithError(`The intent returned value is not compliant with the JSON schema. Reason: '${(error as Error).message}'`);
          }
        }
        else if (value.cancel === undefined && value.error === undefined)
        {
          return resolveWithError("The intent should have been returned an object with either a 'value', 'cancel' or 'error' property");
        }
        resolve(value);
      };
    }
    else if (isNotificationsUiIntent(intent) === true)
    {
      intentName = "UI";
      const specificIntent: NotificationsUiIntent = intent;
      if (await checkSchema(z.object({
        anchor: z.enum(NotificationsUiAnchor),
        url: z.url()
      }), specificIntent.ui) === false)
      {
        return resolveWithInvalidIntentSchema("NotificationsUiIntent");
      }
      if (specificIntent.ui.anchor === NotificationsUiAnchor.ImageDetail)
      {
        return resolveWithError(`The '${NotificationsUiAnchor.ImageDetail}' anchor is not supported`);
      }
      onAcknowledged = (value: NotificationsReturnedValue) =>
      {
        logger.debug(`Received the intent returned value '${JSON.stringify(value)}' from the master socket`);
        resolve(value);
      };
    }
    else if (isNotificationsDialogIntent(intent) === true)
    {
      intentName = "dialog";
      const specificIntent: NotificationsDialogIntent = intent;
      if (await checkSchema(z.object({
        type: z.enum(NotificationsDialogType),
        title: z.string(),
        description: z.string(),
        details: z.string().optional(),
        buttons: z.object({
          yes: z.string(),
          no: z.string().optional()
        })
      }), specificIntent.dialog) === false)
      {
        return resolveWithInvalidIntentSchema("NotificationsDialogIntent");
      }
      onAcknowledged = (value: NotificationsReturnedValue) =>
      {
        logger.debug(`Received the intent returned value '${JSON.stringify(value)}' from the master socket`);
        resolve(value);
      };
    }
    else if (isNotificationsImagesIntent(intent) === true)
    {
      intentName = "images";
      const specificIntent: NotificationsImagesIntent = intent;
      if (await checkSchema(z.object({
        images: z.array(z.object({
          imageId: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          details: z.string().optional()
        })),
        title: z.string().optional(),
        description: z.string().optional(),
        details: z.string().optional()
      }), specificIntent.images) === false)
      {
        return resolveWithInvalidIntentSchema("NotificationsImagesIntent");
      }
      onAcknowledged = (value: NotificationsReturnedValue) =>
      {
        logger.debug(`Received the intent returned value '${JSON.stringify(value)}' from the master socket`);
        resolve(value);
      };
    }
    else if (isNotificationsShowIntent(intent) === true)
    {
      intentName = "show";
      const specificIntent: NotificationsShowIntent = intent;
      if (await checkSchema(z.object({
        type: z.enum(NotificationsShowType),
        id: z.string()
      }), specificIntent.show) === false)
      {
        return resolveWithInvalidIntentSchema("NotificationsShowIntent");
      }
      onAcknowledged = (value: NotificationsReturnedValue) =>
      {
        logger.debug(`Received the intent returned value '${JSON.stringify(value)}' from the master socket`);
        resolve(value);
      };
    }
    else
    {
      return resolveWithError("The intent type is unknown");
    }
    return { intentName, onAcknowledged };
  }

  private emitEventToSocket(socket: Socket, event: string, contextId: string, milliseconds: number, value: object, logSuffix?: string, onAcknowledged?: (result: any) => void): void
  {
    const message = { channel: event, contextId, milliseconds, value };
    logger.debug(`Sending at ${format(new Date(milliseconds), "HH:mm:ss.SSS")} the '${event}' event to the socket with id '${socket.id}'${logSuffix === undefined ? "" : logSuffix}, with ${onAcknowledged === undefined ? "no" : "an"} acknowledgement callback, attached to the context with id '${message.contextId}'`);
    // We need to split the 2 use cases, because invoking the 'emit' method with an "undefined" value for the callback parameter causes a runtime error with the Python socket.io client
    if (onAcknowledged === undefined)
    {
      socket.emit(paths.events, message);
    }
    else
    {
      socket.emit(paths.events, message, (result: any) =>
      {
        onAcknowledged(result);
      });
    }
  }

}
