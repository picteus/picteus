import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

import { API_KEY, BASE_PATH, formatDate, generateRandomId } from "utils";
import { EventInformationType, SocketEventType } from "types";
import { EventService } from "app/services";


type EventSocketContextType = {
  event: EventInformationType,
  eventStore: SocketClient
};
const EventSocketContext = createContext<EventSocketContextType>(undefined);

export function useEventSocket() {
  return useContext(EventSocketContext);
}

export class SocketClient {

  private readonly socket: Socket;

  private readonly listeners: Set<(event: EventInformationType) => void> = new Set();

  private event: EventInformationType = undefined;

  constructor(url: string, apiKey: string) {
    const options = {
      autoConnect: true,
      transports: ["websocket"],
    };
    this.socket = io(url, options);
    this.socket.on("connect", (): void => {
      console.debug("The socket is now connected");
    });
    this.socket.on("connect_error", (): void => {
      console.debug("The socket connection is erroneous");
    });
    this.socket.on(
      "events",
      async (
        { channel, contextId, isActivity, milliseconds, value }: SocketEventType,
        onResult: (result: any) => void,
      ) => {
        const rawData = { channel, contextId, isActivity, milliseconds, value };
        const event: EventInformationType = {
          id: generateRandomId(),
          channel,
          date: formatDate(milliseconds),
          rawData,
          notification: await EventService.generateNotification(rawData),
          onResult,
          ...(await EventService.getEventText(channel, value)),
        };
        void EventService.pushEventIntoIndexedDB(event);
        console.debug(
          `Received an ${isActivity === true ? "activity" : ""} event on channel '${channel}' with context id '${contextId}' emitted at ${milliseconds} ms with value ${JSON.stringify(value, undefined, 2)}`
        );
        this.event = event;
        this.emitChange();
      },
    );
    this.socket.emit("connection", { apiKey, isOpen: true });
  }

  disconnect(): void {
    this.socket.disconnect();
    console.debug("The socket has been disconnected");
  }

  subscribe = (callback: (event: EventInformationType) => void): () => boolean => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };

  getEvent = (): EventInformationType => {
    return this.event;
  };

  private emitChange(): void {
    for (const listener of this.listeners) {
      listener(this.event);
    }
  }

}

export function EventSocketProvider({ children }) {
  const socketClient = useMemo<SocketClient>(() => new SocketClient(BASE_PATH, API_KEY), []);
  const [event, setEvent] = useState<EventInformationType>(undefined);

  useEffect(() => {
    const unsubscribe = socketClient.subscribe((theEvent: EventInformationType) => {
      setEvent(theEvent);
    });
    return () => {
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
