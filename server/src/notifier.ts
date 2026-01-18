import { randomUUID } from "node:crypto";

import { EventAndListener, Listener, ListenerFn } from "eventemitter2";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { logger } from "./logger";
import { checkIsMainThread } from "./utils";


export enum EventEntity
{
  Process = "process",
  Extension = "extension",
  Repository = "repository",
  Image = "image",
  Text = "text"
}

export enum ActivityAction
{
  Acknowledgment = "acknowledgment"
}

export enum ProcessEventAction
{
  RunCommand = "runCommand"
}

export enum ExtensionEventProcess
{
  Started = "started",
  Stopped = "stopped",
}

export enum ExtensionEventAction
{
  Installed = "installed",
  Updated = "updated",
  Uninstalled = "uninstalled",
  Paused = "paused",
  Resumed = "resumed",
  Process = "process",
  Settings = "settings",
  Error = "error",
  Log = "log",
  Notification = "notification",
  Intent = "intent"
}

export enum RepositoryEventAction
{
  Created = "created",
  Synchronize = "synchronize",
  Watch = "watch",
  Deleted = "deleted"
}

export enum ImageEventAction
{
  Created = "created",
  Updated = "updated",
  Deleted = "deleted",
  Renamed = "renamed",
  ComputeFeatures = "computeFeatures",
  ComputeEmbeddings = "computeEmbeddings",
  ComputeTags = "computeTags",
  RunCommand = "runCommand"
}

export enum TextEventAction
{
  ComputeEmbeddings = "computeEmbeddings"
}

export type EventStateDoubleWildcardType = "**";

export type EventAction =
  ActivityAction
  | ProcessEventAction
  | ExtensionEventAction
  | RepositoryEventAction
  | ImageEventAction
  | TextEventAction
  | EventStateDoubleWildcardType;

export type NotifierEvent = { eventEntity: EventEntity, action: EventAction, state: string | undefined };

export type EventListener = (event: string, value: object, marker?: string, onResult?: (value: object) => void) => Promise<void>;

export type OffListener =
  {
    off: () => void
  };

interface WrapperEvent
{
  value: object;
  marker: string | undefined;
  callbackId?: string | undefined;
}

export interface CallbackObject<T>
{
  value: T;
}

export class Notifier
{

  static readonly delimiter = ".";

  static readonly eventWildcardSuffix = ".**";

  private static count = 0;

  private static readonly broadcastEvenPrefix = "broadcast|";

  private static readonly returnEvenPrefix = "return|";

  private readonly offs: OffListener[] = [];

  private readonly id: string;

  static buildEvent(eventEntity: EventEntity, action: EventAction, state?: string): string
  {
    return `${eventEntity}${Notifier.delimiter}${action}${state === undefined ? "" : (`${Notifier.delimiter}${state}`)}`;
  }

  static parseEvent(event: string): NotifierEvent
  {
    const tokens = event.split(Notifier.delimiter);
    return {
      eventEntity: tokens[0] as EventEntity,
      action: tokens[1] as EventAction,
      state: tokens.length >= 2 ? tokens[2] : undefined
    };
  }

  private static buildBroadcastEvent(event: string): string
  {
    return `${Notifier.broadcastEvenPrefix}${event}`;
  }

  constructor(private readonly eventEmitter: EventEmitter2)
  {
    checkIsMainThread();
    this.id = (Notifier.count++).toString();
    logger.debug(`Instantiating a Notifier with id '${this.id}'`);
  }

  emit<T = void>(eventEntity: EventEntity, action: EventAction, state: string | undefined, value: object, marker?: string | undefined, onResult?: (value: T) => void): boolean
  {
    const event = Notifier.buildBroadcastEvent(Notifier.buildEvent(eventEntity, action, state));
    logger.debug(`The notifier with id '${this.id}' emits the event '${event}'${marker === undefined ? "" : (` with the marker '${marker}'`)}` + (onResult === undefined ? "" : " with a callback"));
    const wrapperEvent: WrapperEvent = { value, marker };
    if (onResult !== undefined)
    {
      // The EventEmitter2 documentation https://github.com/EventEmitter2/EventEmitter2?tab=readme-ov-file#emitteremitasyncevent--eventns-arg1-arg2- states that the "emit()" method could be given a callback function, but this does not seem to work
      wrapperEvent.callbackId = randomUUID();
      const returnEvent = Notifier.returnEvenPrefix + wrapperEvent.callbackId;
      const wrappedListener = async (object: CallbackObject<T>) =>
      {
        logger.debug(`The notifier with id '${this.id}' received the callback event '${event}'`);
        onResult(object.value);
      };
      const returnedListener = this.eventEmitter.once(returnEvent, wrappedListener);
      const off = { off: this.computeOffListener(returnedListener, wrappedListener, returnEvent) };
      this.offs.push(off);
    }
    return this.eventEmitter.emit(event, wrapperEvent);
  }

  on(eventEntity: EventEntity, action: EventAction, state: string | undefined, listener: EventListener): OffListener
  {
    const event = Notifier.buildBroadcastEvent(Notifier.buildEvent(eventEntity, action, state));
    logger.debug(`The notifier with id '${this.id}' subscribes to the event '${event}'`);
    const wrappedListener = async (value: object) =>
    {
      logger.debug(`The notifier with id '${this.id}' received the event '${event}'`);
      await this.notifyListener(listener, event, value);
    };
    const returnedListener = this.eventEmitter.on(event, wrappedListener);
    const off = { off: this.computeOffListener(returnedListener, wrappedListener, event) };
    this.offs.push(off);
    return off;
  }

  once(eventEntity: EventEntity, action: EventAction, state: string | undefined, listener: EventListener): OffListener
  {
    const event = Notifier.buildBroadcastEvent(Notifier.buildEvent(eventEntity, action, state));
    logger.debug(`The notifier with id '${this.id}' subscribes once to the event '${event}'`);
    const returnedListener = this.eventEmitter.once(event, async (value: object) =>
    {
      logger.debug(`The notifier with id '${this.id}' received once the event '${event}'`);
      await this.notifyListener(listener, event, value);
    });
    const off = { off: this.computeOffListener(returnedListener, listener, event) };
    this.offs.push(off);
    return off;
  }

  onAll(listener: EventListener): OffListener
  {
    logger.debug(`The notifier with id '${this.id}' subscribes to all events with the prefix '${Notifier.broadcastEvenPrefix}'`);
    const wrappedListener: EventAndListener = async (event: string | string[], value: object) =>
    {
      const events: string[] = Array.isArray(event) === false ? [event as string] : (event as string[]);
      for (const anEvent of events)
      {
        if (anEvent.startsWith(Notifier.broadcastEvenPrefix) === true)
        {
          // We ignore non-broadcast events
          await this.notifyListener(listener, anEvent, value);
        }
      }
    };
    this.eventEmitter.onAny(wrappedListener);
    const off =
      {
        off: () =>
        {
          this.eventEmitter.offAny(wrappedListener);
        }
      };
    this.offs.push(off);
    return off;
  }

  destroy(): void
  {
    logger.debug(`Removing from the notifier with id '${this.id}' ${this.offs.length} remaining listener(s)`);
    for (const off of this.offs)
    {
      off.off();
    }
    this.offs.length = 0;
  }

  private computeOffListener(returnedListener: EventEmitter2 | Listener, listener: ListenerFn, event: string): () => void
  {
    return () =>
    {
      if (returnedListener instanceof EventEmitter2)
      {
        (returnedListener as EventEmitter2).off(event, listener);
      }
      else
      {
        (returnedListener as Listener).off();
      }
    };

  }

  private async notifyListener(listener: EventListener, event: string, value: object): Promise<void>
  {
    const wrapperEvent: WrapperEvent = value as WrapperEvent;
    const broadcastEvent = event.substring(Notifier.broadcastEvenPrefix.length);
    // We need to provide exactly the same number of arguments and not just use "undefined" for undefined arguments, so that the listener's expected signature is respected
    if (wrapperEvent.callbackId === undefined)
    {
      if (wrapperEvent.marker === undefined)
      {
        await listener(broadcastEvent, wrapperEvent.value);
      }
      else
      {
        await listener(broadcastEvent, wrapperEvent.value, wrapperEvent.marker);
      }
    }
    else
    {
      await listener(broadcastEvent, wrapperEvent.value, wrapperEvent.marker, (value: any) =>
      {
        const returnEvent = Notifier.returnEvenPrefix + wrapperEvent.callbackId;
        logger.debug(`The notifier with id '${this.id}' emits the callback event '${returnEvent}'`);
        this.eventEmitter.emit(returnEvent, value);
      });
    }
  }

}
