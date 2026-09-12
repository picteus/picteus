import { ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

import { API_KEY, BASE_PATH, generateRandomId } from "utils";
import { ChannelEnum, EventInformationType, EventOnResultType, SocketEventType } from "types";
import { EventService, NotificationService } from "app/services";
import createHmrStableContext from "./createHmrStableContext.ts";


type EventSocketContextType = {
  eventStore: SocketClient
};
const EventSocketContext = createHmrStableContext<EventSocketContextType>(import.meta.hot, "eventSocketContext", undefined);

export function useEventSocket(): EventSocketContextType
{
  return useContext(EventSocketContext);
}

type EventSubscriptionCallbackType = (event: EventInformationType) => void;

export class SocketClient
{

  private readonly socket: Socket;

  private socketEvent?: EventInformationType = undefined;

  private readonly socketEventListeners: Set<EventSubscriptionCallbackType> = new Set();

  constructor(url: string, apiKey: string)
  {
    const options: Partial<ManagerOptions & SocketOptions> =
      {
        autoConnect: true,
        reconnection: true,
        transports: [ "websocket" ]
      };
    this.socket = io(url, options);
    const socket = this.socket;
    socket.on("connect", (): void =>
    {
      console.debug(`The events socket client with id '${socket.id}' is connected`);
      socket.emit("connection", { apiKey, isOpen: true });
    });
    socket.on("connect_error", (error): void =>
    {
      console.warn(`A connection issue occurred with the events socket client with id '${socket.id}'`, error);
    });
    socket.on("disconnect", (reason: Socket.DisconnectReason) =>
    {
      console.warn(`The events socket client is disconnected with reason '${reason}'`);
    });
    socket.on("events", async (
        { channel, contextId, isActivity, milliseconds, value }: SocketEventType,
        onResult: EventOnResultType
      ) =>
      {
        const socketEvent: SocketEventType = {
          id: generateRandomId(),
          channel,
          contextId,
          isActivity,
          milliseconds,
          value
        };
        console.debug(`Received an ${isActivity === true ? "activity " : ""}event on channel '${channel}' with context id '${contextId}' emitted at ${milliseconds} ms with value ${JSON.stringify(value, undefined, 2)}`);
        const event: EventInformationType = { ...socketEvent, onResult };
        void EventService.storeSocketEvent(socketEvent);
        this.socketEvent = event;
        for (const listener of this.socketEventListeners)
        {
          listener(this.socketEvent);
        }

        const notification = await EventService.generateNotification(socketEvent);
        if (notification)
        {
          await NotificationService.storeNotification(notification);
        }
      }
    );
  }

  disconnect(): void
  {
    this.socket.disconnect();
    console.debug("The socket has been disconnected");
  }

  subscribeToSocketEvents = (callback: EventSubscriptionCallbackType): () => void =>
  {
    this.socketEventListeners.add(callback);
    return () =>
    {
      this.socketEventListeners.delete(callback);
    };
  };

  subscribeToEvents = (channels: readonly ChannelEnum[], callback: EventSubscriptionCallbackType): () => void =>
  {
    const channelSet = new Set<string>(channels);
    const filteredListener = (event: EventInformationType): void =>
    {
      if (channelSet.has(event.channel))
      {
        callback(event);
      }
    };
    return this.subscribeToSocketEvents(filteredListener);
  };

  getSocketEvent = (): EventInformationType =>
  {
    return this.socketEvent;
  };

}

export function useSocketEvent(channel: ChannelEnum, callback: (event: EventInformationType) => void): void
{
  const { eventStore } = useEventSocket();
  const callbackReference = useRef(callback);
  useEffect(() =>
  {
    callbackReference.current = callback;
  }, [ callback ]);

  useEffect(() =>
  {
    return eventStore.subscribeToEvents([ channel ], (event: EventInformationType) =>
    {
      callbackReference.current(event);
    });
  }, [ eventStore, channel ]);
}

export function useSocketEvents(channels: readonly ChannelEnum[], callback: (event: EventInformationType) => void): void
{
  const { eventStore } = useEventSocket();
  const callbackReference = useRef(callback);
  useEffect(() =>
  {
    callbackReference.current = callback;
  }, [ callback ]);

  const serializedChannels = useMemo(() =>
  {
    return channels.slice().sort().join(",");
  }, [ channels ]);

  useEffect(() =>
  {
    return eventStore.subscribeToEvents(channels, (event: EventInformationType) =>
    {
      callbackReference.current(event);
    });
  }, [ eventStore, serializedChannels ]);
}

export function EventSocketProvider({ children }: { children?: ReactNode })
{
  const socketClient = useMemo<SocketClient>(() => new SocketClient(BASE_PATH, API_KEY), []);

  useEffect(() =>
  {
    return () =>
    {
      socketClient.disconnect();
    };
  }, [ socketClient ]);

  const contextValue = useMemo<EventSocketContextType>(() =>
  {
    return { eventStore: socketClient };
  }, [ socketClient ]);

  return (
    <EventSocketContext.Provider value={contextValue}>
      {children}
    </EventSocketContext.Provider>
  );
}
