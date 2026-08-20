import fs from "node:fs";
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
import { GatewayMetadata } from "@nestjs/websockets/interfaces";
import { ModuleRef } from "@nestjs/core";
import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { z } from "zod";
import { format } from "fecha";

import {
  ActionIntent,
  DialogIntent,
  FormIntent,
  ImagesIntent,
  IntentDialogType,
  IntentShowType,
  IntentToastType,
  IntentUiAnchor,
  isActionIntent,
  isDialogIntent,
  isFormIntent,
  isImagesIntent,
  isNotificationIntent,
  isShowIntent,
  isToastIntent,
  isUiIntent,
  NotificationIntent,
  ShowIntent,
  ToastIntent,
  UiIntent
} from "@picteus/shared-core";
import { HostCommandType } from "@picteus/shared-back-end";

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
import { deepCopy, stringify } from "../utils";
import {
  EventAction,
  EventEntity,
  ExtensionEventAction,
  ImageEventAction,
  NotifierService,
  ProcessEventAction,
  TextEventAction
} from "./notifierService";
import { AuthenticationGuard } from "../app.guards";
import { addJsonSchemaAdditionalProperties, computeAjv, validateJsonSchema, validateSchema } from "./utils/ajvWrapper";
import {
  checkUiProperties,
  ExtensionService,
  ExtensionSettingsVersions,
  ExtensionsUiServer,
  stripAndExtractParametersUiProperties
} from "./extensionServices";
import { ExtensionRegistry } from "./extensionRegistry";
import { ExtensionTaskExecutor, ExtensionTaskExecutorError } from "./extensionTaskExecutor";
import { BundleIntent, Intent, ReadFileIntent, WriteFileIntent } from "./intents";
import { HostService } from "./hostService";


const contextIdPropertyName = "contextId";
type WithContextId = { [contextIdPropertyName]: string; };
type SocketAdditionalMessage = WithContextId & { isActivity?: boolean };
type SocketMessageValue = { apiKey?: string, extensionId?: string, [contextIdPropertyName]?: string }
type ConnectionValue = SocketMessageValue & {
  isOpen?: boolean,
  sdkVersion?: string,
  environment?: ManifestRuntimeEnvironment
};
type InstructionsLog = { log: string, level: string }
type InstructionsAcknowledgment = WithContextId & { success: boolean }
type InstructionsNotification = Record<string, any>

type InstructionValue = SocketMessageValue & {
  log?: InstructionsLog,
  notification?: InstructionsNotification,
  acknowledgment?: InstructionsAcknowledgment,
  intent?: Intent
}
export type InstructionReturnedValue = { value?: any, cancel?: string, error?: string }

const isBundleIntent = (intent: Intent): intent is BundleIntent =>
{
  return (intent as BundleIntent).serveBundle !== undefined;
};
const isReadFileIntent = (intent: Intent): intent is ReadFileIntent =>
{
  return (intent as ReadFileIntent).readFile !== undefined;
};
const isWriteFileIntent = (intent: Intent): intent is WriteFileIntent =>
{
  return (intent as WriteFileIntent).writeFile !== undefined;
};

const zodDialogContent = z.object({
  title: z.string(),
  description: z.string(),
  details: z.string().optional()
});
const zodDialogIconContent = zodDialogContent.extend({
  icon: z.object({ url: z.string().optional(), content: z.instanceof(Buffer).optional() }).optional()
});
const zodDialogIconSizeContent = zodDialogIconContent.extend({
  size: z.enum([ "auto", "xs", "s", "m", "l", "xl" ]).optional()
});

const zodFrameContent = z.union([ z.object({ url: z.string() }), z.object({ html: z.string() }) ]);

const zodUi = z.object({
  id: z.string(),
  integration: z.union([
    z.object({
      anchor: z.string(IntentUiAnchor.Sidebar),
      isExternal: z.boolean()
    }),
    z.object({ anchor: z.string(IntentUiAnchor.Window) }),
    z.object({ anchor: z.string(IntentUiAnchor.Modal) })
  ]),
  frameContent: zodFrameContent,
  dialogContent: zodDialogIconContent.optional()
});

const zodShow = z.object({
  type: z.enum(IntentShowType),
  id: z.string()
});

@WebSocketGateway<GatewayMetadata>({
  transports: [ "websocket" ],
  httpCompression: true,
  maxHttpBufferSize: NotificationsGateway.maximumPayloadSizeInBytes
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{

  private static readonly maximumPayloadSizeInBytes = 16 * 1_024 * 1_024;

  @WebSocketServer()
  private io?: Server;

  private readonly activeSocketIds: Set<string> = new Set();

  private readonly perSocketIdExtensionId: Map<string, string> = new Map();

  private readonly perExtensionIdSocketIds: Map<string, string[]> = new Map();

  private readonly perExtensionsSocketSupportedEvents: Map<string, string []> = new Map();

  private readonly activitiesContextIds: Set<string> = new Set();

  constructor(private readonly notifierService: NotifierService, private readonly extensionTaskExecutor: ExtensionTaskExecutor, private readonly uiServer: ExtensionsUiServer, private readonly hostService: HostService, private readonly moduleRef: ModuleRef)
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
    this.notifierService.onAll(this.onNotifierEvent.bind(this));
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
    this.activeSocketIds.clear();
    this.perExtensionsSocketSupportedEvents.clear();
    this.activitiesContextIds.clear();
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
        const [ socketId, socket ] = socketEntry;
        if (this.activeSocketIds.has(socketId) === true)
        {
          const supportedEvents = this.perExtensionsSocketSupportedEvents.get(socketId);
          // All non-extensions sockets will be notified, but we ignore the unsupported events in case of an extension and the ones that are not directed to a specific extension
          const isExtensionSocket = supportedEvents !== undefined;
          const extensionId = isExtensionSocket === false ? undefined : this.perSocketIdExtensionId.get(socketId);
          if ((isExtensionSocket === false && marker === undefined) || (isExtensionSocket === true && supportedEvents.indexOf(event) !== -1 && (marker === undefined || marker === extensionId)))
          {
            const contextId = randomUUID();
            if (event === NotifierService.buildEvent(EventEntity.Process, ProcessEventAction.RunCommand) || event === NotifierService.buildEvent(EventEntity.Image, ImageEventAction.RunCommand))
            {
              this.activitiesContextIds.add(contextId);
            }
            await this.extensionTaskExecutor.run(extensionId, event, async (signal: AbortSignal) =>
            {

              async function process(gateway: NotificationsGateway): Promise<void>
              {
                const logSuffix = `${extensionId === undefined ? "" : (` related to the extension with id '${extensionId}'`)}`;
                // In case of an extension, we always want to wait for a socket acknowledgment, which is supposed to be issued by the extension SDK, once the processing is completed, because we want the throttling to be effective
                const waitForAcknowledgment = extensionId === undefined && onResult === undefined;
                if (waitForAcknowledgment === true)
                {
                  gateway.emitEventToSocket(socket, event, { contextId }, milliseconds, value, logSuffix, undefined);
                }
                else
                {
                  await new Promise<void>((resolve, reject) =>
                  {
                    gateway.emitEventToSocket(socket, event, { contextId }, milliseconds, value, logSuffix, (result) =>
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
              }

              await new Promise<void>((topResolve, topReject) =>
              {
                const listener = () =>
                {
                  topReject(new ExtensionTaskExecutorError("The job has been aborted via the signal"));
                };
                signal.addEventListener("abort", listener);
                process(this).then(() =>
                {
                  signal.removeEventListener("abort", listener);
                  topResolve();
                }).catch(topReject);
              });
            });
          }
        }
      }
    }
    return Promise.resolve();
  }

  @SubscribeMessage(paths.connection)
  async handleConnectionMessage(@MessageBody() connectionValue: ConnectionValue, @ConnectedSocket() socket: Socket): Promise<void | {
    maximumPayloadSizeInBytes: number
  }>
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
        this.perExtensionsSocketSupportedEvents.set(socketId, this.computeManifestEvents(manifest, true, false));
        void this.sendExtensionVersionsEvent(extensionId, () =>
        {
          this.perExtensionsSocketSupportedEvents.set(socketId, this.computeManifestEvents(manifest, false, true));
          this.sendExtensionReadyEvent(extensionId, () =>
          {
            const events = this.computeManifestEvents(manifest, false, false);
            this.perExtensionsSocketSupportedEvents.set(socketId, events);
            logger.debug(`The extension with id '${extensionId}' is interested in the [${events.join(", ")}] event(s)`);
            this.moduleRef.get(ExtensionService).onConnection(extensionId, true);
          });
        });
      }
      this.activeSocketIds.add(socketId);
      return { maximumPayloadSizeInBytes: NotificationsGateway.maximumPayloadSizeInBytes };
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

  @SubscribeMessage(paths.instructions)
  async handleInstructionsMessage(@MessageBody() instructionValue: InstructionValue, @ConnectedSocket() socket: Socket): Promise<InstructionReturnedValue | undefined>
  {
    const { apiKey, extensionId, contextId } = instructionValue;
    const socketId = socket.id;
    if (this.checkPermission(socketId, paths.instructions, apiKey, extensionId, true) === false)
    {
      return;
    }

    const masterSocket: Socket | undefined = this.getMasterSocket();
    if (instructionValue.acknowledgment !== undefined)
    {
      // This is an acknowledgment regarding a previously sent event
      const theContextId = contextId!;
      const success = instructionValue.acknowledgment.success;
      logger.debug(`Received a ${success === true ? "successful" : "failure"} acknowledgment regarding a previously sent event to the extension with id '${extensionId}' related to the context with id '${theContextId}'`);
      if (this.activitiesContextIds.delete(theContextId) === true && masterSocket !== undefined)
      {
        // We notify the master socket of the command achievement
        this.emitEventToSocket(masterSocket, NotifierService.buildEvent(EventEntity.Extension, ExtensionEventAction.Acknowledgment), {
          contextId: theContextId,
          isActivity: true
        }, Date.now(), {
          id: extensionId,
          contextId: theContextId,
          success
        });
      }
      return;
    }

    if (masterSocket === undefined)
    {
      logger.debug(`Received a message coming from channel '${paths.instructions}' through the socket client with id '${socketId}' related to the extension with id '${extensionId}'${contextId === undefined ? "" : ` attached to the context with id '${contextId}'`}`);
    }
    else
    {
      // It is possible that the server is running headless
      // There is no rejection case, the master's socket error response is handled as a response
      return this.handleInstruction(socketId, masterSocket, instructionValue, extensionId!, contextId);
    }
  }

  private computeManifestEvents(manifest: Manifest, withVersions: boolean, withReady: boolean): string[]
  {
    const extensionManifestEvents: ManifestEvent[] = [];
    if (withVersions === false && withReady === false)
    {
      for (const instruction of manifest.instructions)
      {
        extensionManifestEvents.push(...instruction.events);
      }
    }
    {
      // We add the "extension.versions", ""extension.ready" and "extension.settings" events because they are implicitly always supported
      if (withVersions === true && extensionManifestEvents.indexOf(ManifestEvent.ExtensionVersions) === -1)
      {
        extensionManifestEvents.push(ManifestEvent.ExtensionVersions);
      }
      if (withReady === true && extensionManifestEvents.indexOf(ManifestEvent.ExtensionReady) === -1)
      {
        extensionManifestEvents.push(ManifestEvent.ExtensionReady);
      }
      if ((withVersions === false && withReady === false) && extensionManifestEvents.indexOf(ManifestEvent.ExtensionSettings) === -1)
      {
        extensionManifestEvents.push(ManifestEvent.ExtensionSettings);
      }
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
        return NotifierService.buildEvent(eventEntity, action);
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
    return [ ...processEvents, ...extensionEvents, ...imageEvents, ...textEvents ];
  }

  private async sendExtensionVersionsEvent(extensionId: string, onSuccess: () => void): Promise<void>
  {
    const extensionService = this.moduleRef.get(ExtensionService);
    const extensionSettings = (await extensionService.getPersistedSettings(extensionId));
    if (extensionSettings === null || extensionSettings.versions === null)
    {
      logger.error(`The settings for the extension with id '${extensionId}' are missing`);
      return;
    }

    const versions: ExtensionSettingsVersions = JSON.parse(extensionSettings.versions);
    const upgrade = versions.upgraded === false;
    this.notifierService.emit(EventEntity.Extension, ExtensionEventAction.Versions, undefined, {
      previous: versions.previous, current: versions.current, upgrade
    }, extensionId, async (isSuccess: boolean) =>
    {
      if (isSuccess === true)
      {
        if (upgrade === true)
        {
          logger.debug(`The extension with id '${extensionId}' has been properly upgraded to v${versions.current}`);
          versions.upgraded = true;
          await extensionService.updatedPersistedSettings(extensionId, versions);
        }
        onSuccess();
      }
      else
      {
        logger.error(`An error occurred in the extension with id '${extensionId}' during the processing of the '${ExtensionEventAction.Versions}' event`);
      }
    });
  }

  private async sendExtensionReadyEvent(extensionId: string, onSuccess: () => void): Promise<void>
  {
    this.notifierService.emit(EventEntity.Extension, ExtensionEventAction.Ready, undefined, {
      id: extensionId
    }, extensionId, async (isSuccess: boolean) =>
    {
      if (isSuccess === true)
      {
        onSuccess();
      }
      else
      {
        logger.error(`An error occurred in the extension with id '${extensionId}' during the processing of the '${ExtensionEventAction.Ready}' event`);
      }
    });
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
        for (const [ socketId, socket ] of sockets)
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

  private handleInstruction(socketId: string, masterSocket: Socket, instructionValue: InstructionValue, extensionId: string, contextId: string | undefined): Promise<InstructionReturnedValue | undefined>
  {
    return new Promise<InstructionReturnedValue | undefined>(async (resolve) =>
    {
      const { log, notification, intent }:
        {
          log?: InstructionsLog,
          notification?: InstructionsNotification,
          intent?: Intent
        } = instructionValue;
      const value: Json = { id: extensionId };
      let isOk = true;
      let messageLogChunk: string;
      let action: ExtensionEventAction | undefined;
      let onAcknowledged: ((result: any) => void) | null | undefined;
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
        let result;
        try
        {
          result = await this.handleIntent(extensionId, intent, resolve);
        }
        catch (error)
        {
          const reasonMessage = (error as Error).message;
          logger.error(`An unexpected error occurred during the handling of the intent from message from extension with id '${extensionId}'. Reason: '${reasonMessage}'`);
          resolve({ error: `Could not handle properly the intent. Reason: '${reasonMessage}'` });
          return;
        }
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
        logger.error(`Cannot handle the message from extension with id '${extensionId}' with value ${stringify(instructionValue)}`);
        return;
      }
      logger.debug(`Received a ${messageLogChunk!} message coming from channel '${paths.instructions}' through the socket client with id '${socketId}' related to the extension with id '${extensionId}'${contextId === undefined ? "" : ` attached to the context with id '${contextId}'`}`);
      if (onAcknowledged === null)
      {
        return;
      }
      this.emitEventToSocket(masterSocket, NotifierService.buildEvent(EventEntity.Extension, action), {
        contextId: contextId ?? randomUUID(),
        isActivity: contextId !== undefined && this.activitiesContextIds.has(contextId) === true
      }, Date.now(), value, undefined, onAcknowledged);
      if (onAcknowledged === undefined)
      {
        resolve(undefined);
      }
    });
  }

  private async handleIntent(extensionId: string, intent: Intent, resolve: (value: InstructionReturnedValue) => void): Promise<{
    intentName: string;
    onAcknowledged: ((result: any) => void) | null
  } | undefined>
  {
    let intentName: string;
    let onAcknowledged: ((result: any) => void) | null;

    const onAcknowledgedFromMasterSocketFactory = (onValidate?: (value: InstructionReturnedValue) => boolean): (value: InstructionReturnedValue) => void =>
    {
      return (value: InstructionReturnedValue) =>
      {
        logger.debug(`Received the intent returned value '${stringify(value)}' from the master socket`);
        if (onValidate !== undefined)
        {
          if (onValidate(value) === false)
          {
            return;
          }
        }
        resolve(value);
      };
    };

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

    const noFileResourceSelected = "No file resource selected";
    if (isFormIntent(intent) === true)
    {
      intentName = "parameters";
      const specificIntent: FormIntent = intent;
      if (await checkSchema(z.object({
        parameters: z.object(),
        dialogContent: zodDialogIconSizeContent.optional()
      }), intent.form) === false)
      {
        return resolveWithInvalidIntentSchema("FormIntent");
      }
      const specificParameters = specificIntent.form.parameters;
      const withStrippedUiPropertiesParameters = deepCopy(specificParameters);
      const uiProperties = stripAndExtractParametersUiProperties(withStrippedUiPropertiesParameters);
      try
      {
        validateJsonSchema(computeAjv(), withStrippedUiPropertiesParameters);
        addJsonSchemaAdditionalProperties(specificParameters);
        checkUiProperties(uiProperties);
      }
      catch (error)
      {
        return resolveWithError(`The intent is not compliant with the JSON schema. Reason: '${(error as Error).message}'`);
      }
      onAcknowledged = onAcknowledgedFromMasterSocketFactory((value: InstructionReturnedValue): boolean =>
      {
        if (value.value !== undefined)
        {
          try
          {
            validateSchema(computeAjv(), withStrippedUiPropertiesParameters, value.value);
          }
          catch (error)
          {
            resolveWithError(`The intent returned value is not compliant with the JSON schema. Reason: '${(error as Error).message}'`);
            return false;
          }
        }
        else if (value.cancel === undefined && value.error === undefined)
        {
          resolveWithError("The intent should have been returned an object with either a 'value', 'cancel' or 'error' property");
          return false;
        }
        return true;
      });
    }
    else if (isUiIntent(intent) === true)
    {
      intentName = "UI";
      const specificIntent: UiIntent = intent;
      if (await checkSchema(zodUi, specificIntent.ui) === false)
      {
        return resolveWithInvalidIntentSchema("UiIntent");
      }
      onAcknowledged = onAcknowledgedFromMasterSocketFactory();
    }
    else if (isDialogIntent(intent) === true)
    {
      intentName = "dialog";
      const specificIntent: DialogIntent = intent;
      if (await checkSchema(zodDialogIconSizeContent.extend({
        type: z.enum(IntentDialogType),
        frame: z.object({
          content: zodFrameContent,
          height: z.int32().min(0).max(100)
        }).optional(),
        buttons: z.object({
          yes: z.string(),
          no: z.string().optional()
        })
      }), specificIntent.dialog) === false)
      {
        return resolveWithInvalidIntentSchema("DialogIntent");
      }
      onAcknowledged = onAcknowledgedFromMasterSocketFactory();
    }
    else if (isImagesIntent(intent) === true)
    {
      intentName = "images";
      const specificIntent: ImagesIntent = intent;
      if (await checkSchema(z.object({
        images: z.array(z.object({
          imageId: z.string(),
          dialogContent: zodDialogContent.optional()
        })),
        dialogContent: zodDialogIconContent.optional()
      }), specificIntent.images) === false)
      {
        return resolveWithInvalidIntentSchema("ImagesIntent");
      }
      onAcknowledged = onAcknowledgedFromMasterSocketFactory();
    }
    else if (isShowIntent(intent) === true)
    {
      intentName = "show";
      const specificIntent: ShowIntent = intent;
      if (await checkSchema(zodShow, specificIntent.show) === false)
      {
        return resolveWithInvalidIntentSchema("ShowIntent");
      }
      onAcknowledged = onAcknowledgedFromMasterSocketFactory();
    }
    else if (isToastIntent(intent) === true)
    {
      intentName = "toast";
      const specificIntent: ToastIntent = intent;
      if (await checkSchema(z.object({
        toast: z.object({
          type: z.enum(IntentToastType),
          title: z.string(),
          subtitle: z.string()
        })
      }), specificIntent) === false)
      {
        return resolveWithInvalidIntentSchema("ToastIntent");
      }
      onAcknowledged = onAcknowledgedFromMasterSocketFactory();
    }
    else if (isNotificationIntent(intent) === true)
    {
      intentName = "notification";
      const specificIntent: NotificationIntent = intent;
      if (await checkSchema(z.object({
        notification: z.object({
          title: z.string(),
          subtitle: z.string(),
          body: z.string(),
          silent: z.boolean(),
          icon: z.instanceof(Buffer).optional(),
          isNative: z.boolean()
        })
      }), specificIntent) === false)
      {
        return resolveWithInvalidIntentSchema("NotificationIntent");
      }
      const notification = specificIntent.notification;
      if (notification.isNative === true)
      {
        onAcknowledged = null;
        await this.hostService.send<void>({
          type: HostCommandType.Notification,
          title: notification.title,
          subtitle: notification.subtitle,
          body: notification.body,
          silent: notification.silent,
          icon: notification.icon
        });
        resolve({ value: undefined });
      }
      else
      {
        onAcknowledged = onAcknowledgedFromMasterSocketFactory();
      }
    }
    else if (isActionIntent(intent) === true)
    {
      intentName = "action";
      const specificIntent: ActionIntent = intent;
      if (await checkSchema(z.object({
        action: z.object({
          intent: z.xor([
            z.object({ ui: zodUi }),
            z.object({ show: zodShow }),
            z.object({
              processCommand: z.object({
                extensionId: z.string(),
                commandId: z.string()
              })
            })
          ]),
          dialogContent: zodDialogIconSizeContent,
          label: z.string().optional()
        })
      }), specificIntent) === false)
      {
        return resolveWithInvalidIntentSchema("ActionIntent");
      }
      // TODO: in case of a process command, check that the extension and the command exist
      onAcknowledged = onAcknowledgedFromMasterSocketFactory();
    }
    else if (isBundleIntent(intent) === true)
    {
      intentName = "serveBundle";
      const specificIntent: BundleIntent = intent;
      if (await checkSchema(z.object({
        content: z.instanceof(Buffer),
        settings: z.object().optional()
      }), specificIntent.serveBundle) === false)
      {
        return resolveWithInvalidIntentSchema("BundleIntent");
      }
      onAcknowledged = null;
      const extensionApiKey = AuthenticationGuard.registerExtensionApiKey(extensionId);
      try
      {
        resolve({ value: await this.uiServer.serveBundle(extensionApiKey, specificIntent.serveBundle.settings, specificIntent.serveBundle.content) });
      }
      catch (error)
      {
        resolveWithError(`Could not inflate the provided bundle archive. Reason:'${(error as Error).message}'`);
      }
    }
    else if (isReadFileIntent(intent) === true)
    {
      intentName = "readFile";
      const specificIntent: ReadFileIntent = intent;
      if (await checkSchema(z.object({
        readFile: z.object({
          extensions: z.string().array(),
          message: z.string()
        })
      }), specificIntent) === false)
      {
        return resolveWithInvalidIntentSchema("ReadFileIntent");
      }
      const readFile = specificIntent.readFile;
      onAcknowledged = null;
      const nodePath: string | null = await this.hostService.send<string | null>({
        type: HostCommandType.PickFileResource,
        kind: "file",
        nature: "open",
        extensions: readFile.extensions,
        message: readFile.message
      });
      if (nodePath === null)
      {
        resolve({ cancel: noFileResourceSelected });
      }
      else
      {
        resolve({ value: fs.readFileSync(nodePath) });
      }
    }
    else if (isWriteFileIntent(intent) === true)
    {
      intentName = "writeFile";
      const specificIntent: WriteFileIntent = intent;
      if (await checkSchema(z.object({
        writeFile: z.object({
          name: z.string(),
          extension: z.string(),
          content: z.instanceof(Buffer),
          message: z.string()
        })
      }), specificIntent) === false)
      {
        return resolveWithInvalidIntentSchema("WriteFileIntent");
      }
      const writeFile = specificIntent.writeFile;
      onAcknowledged = null;
      const nodePath: string | null = await this.hostService.send<string | null>({
        type: HostCommandType.PickFileResource,
        kind: "file",
        nature: "save",
        extensions: [ writeFile.extension ],
        defaultPath: writeFile.name,
        message: writeFile.message
      });
      if (nodePath === null)
      {
        resolve({ cancel: noFileResourceSelected });
      }
      else
      {
        fs.writeFileSync(nodePath, specificIntent.writeFile.content);
        resolve({ value: undefined });
      }
    }
    else
    {
      return resolveWithError("The intent type is unknown");
    }
    return { intentName, onAcknowledged };
  }

  private emitEventToSocket(socket: Socket, event: string, additionalMessage: SocketAdditionalMessage, milliseconds: number, value: object, logSuffix?: string, onAcknowledged?: (result: any) => void): void
  {
    const message = { ...additionalMessage, channel: event, milliseconds, value };
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
