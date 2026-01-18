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
  const [data, setData] = useState<EventInformationType>(undefined);

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
        const eventData: EventInformationType = {
          id: generateRandomId(),
          channel,
          date: formatDate(milliseconds),
          rawData,
          notification: await EventService.generateNotification(rawData),
          onResult,
          ...(await EventService.getEventText(channel, value)),
        };
        void EventService.pushEventIntoIndexedDB(eventData);
        setData(eventData);
        console.debug(
          `Received a notification on channel '${channel}' emitted at ${milliseconds} ms with value ${JSON.stringify(value, undefined, 2)}`,
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
    <EventSocketContext.Provider value={data}>
      {children}
    </EventSocketContext.Provider>
  );
}
