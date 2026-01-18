import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { CommandContextType, CommandParameters, CommandSocketResponseType } from "types";

const CommandSocketContext = createContext(undefined);

export function useCommandSocket(): CommandContextType {
  return useContext(CommandSocketContext);
}

export function CommandSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const callbacks = useRef({});

  useEffect(() => {
    const options = {
      autoConnect: true,
      transports: ["websocket"],
    };
    const urlSearchParams = new URLSearchParams(window.location.search);
    const commandsSocketBaseUrl = urlSearchParams.get("commandsSocketBaseUrl");
    const commandsSocketSecret = urlSearchParams.get("commandsSocketSecret");
    const ioClient = io(commandsSocketBaseUrl, options);
    ioClient.on("connect", ()=>
    {
      setConnected(true);
    });
    ioClient.on("disconnect", async (): Promise<void> =>
    {
      setConnected(false);
    });
    ioClient.emit("initialize", { secret: commandsSocketSecret });
    ioClient.on("result", (response: CommandSocketResponseType) => {
      const { id, error, value } = response;
      if (callbacks.current[id]) {
        if (error) {
          callbacks.current[id].reject(new Error(error));
        } else {
          callbacks.current[id].resolve(value);
        }
        delete callbacks.current[id];
      }
    });

    setSocket(ioClient);

    return () => {
      ioClient.disconnect();
      console.debug("Disconnected the command socket");
    };
  }, []);

  const sendCommand = useCallback(
    (command: string, parameters: CommandParameters) => {
      if (!socket) {
        return Promise.reject(new Error("Socket not initialized"));
      }

      const id = "id-" + Date.now();
      const eventArguments = { id, command, parameters };

      return new Promise((resolve, reject) => {
        callbacks.current[id] = { resolve, reject };
        socket.emit("command", eventArguments);
      });
    },
    [socket],
  );

  return (
    <CommandSocketContext.Provider value={{ sendCommand, isAvailable: () =>
      {
        return connected === true;
      }}}>
      {children}
    </CommandSocketContext.Provider>
  );
}
