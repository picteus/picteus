import { useContext, useEffect, useMemo, useState } from "react";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

import { API_KEY, BASE_PATH, generateRandomId } from "utils";
import { EventInformationType, EventOnResultType, SocketEventType } from "types";
import { EventService, NotificationService } from "app/services";
import createHmrStableContext from "./createHmrStableContext.ts";


type EventSocketContextType = {
  event: EventInformationType,
  eventStore: SocketClient
};
const EventSocketContext = createHmrStableContext<EventSocketContextType>(import.meta.hot, "eventSocketContext", undefined);

export function useEventSocket()
{
  return useContext(EventSocketContext);
}

class SocketClient
{

  private readonly socket: Socket;

  private socketEvent?: EventInformationType = undefined;

  private readonly socketEventListeners: Set<(event: EventInformationType) => void> = new Set();

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
        console.debug(`Received an ${isActivity === true ? "activity" : ""} event on channel '${channel}' with context id '${contextId}' emitted at ${milliseconds} ms with value ${JSON.stringify(value, undefined, 2)}`);
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

  subscribeToSocketEvents = (callback: (event: EventInformationType) => void): () => boolean =>
  {
    this.socketEventListeners.add(callback);
    return () => this.socketEventListeners.delete(callback);
  };

  getSocketEvent = (): EventInformationType =>
  {
    return this.socketEvent;
  };

}

export function EventSocketProvider({ children })
{
  const socketClient = useMemo<SocketClient>(() => new SocketClient(BASE_PATH, API_KEY), []);
  const [ event, setEvent ] = useState<EventInformationType>(undefined);

  useEffect(() =>
  {
    const unsubscribe = socketClient.subscribeToSocketEvents((theEvent: EventInformationType) =>
    {
      setEvent(theEvent);
    });
    return () =>
    {
      unsubscribe();
      socketClient.disconnect();
    };
  }, []);

  return (
    <EventSocketContext.Provider value={{ event, eventStore: socketClient }}>
      {children}
    </EventSocketContext.Provider>
  );
}
