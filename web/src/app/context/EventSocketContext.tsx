import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

import { API_KEY, BASE_PATH, formatDate, generateRandomId } from "utils";
import { EventInformationType, SocketResponseType } from "types";
import { EventService } from "app/services";

const EventSocketContext = createContext<EventInformationType>(undefined);

export function useEventSocket() {
  return useContext(EventSocketContext);
}

export function EventSocketProvider({ children }) {
  const [event, setEvent] = useState<EventInformationType>(undefined);

  useEffect(() => {
    const options = {
      autoConnect: true,
      transports: ["websocket"],
    };
    const ioClient = io(BASE_PATH, options);
    ioClient.on(
      "events",
      async (
        { channel, contextId, milliseconds, value }: SocketResponseType,
        onResult: (result: any) => void,
      ) => {
        const rawData = { channel, contextId, milliseconds, value };
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
        setEvent(event);
        console.debug(
          `Received a notification on channel '${channel}' with context id '${contextId}' emitted at ${milliseconds} ms with value ${JSON.stringify(value, undefined, 2)}`,
        );
      },
    );
    ioClient.emit("connection", { apiKey: API_KEY, isOpen: true });

    return () => {
      ioClient.disconnect();
      console.debug("Disconnected the notification socket");
    };
  }, []);

  return (
    <EventSocketContext.Provider value={event}>
      {children}
    </EventSocketContext.Provider>
  );
}
