import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { CommandContextType, CommandParameters, CommandSocketResponseType } from "types";

const CommandSocketContext = createContext(undefined);

export function useCommandSocket(): CommandContextType {
  return useContext(CommandSocketContext);
}

interface SendAndResolve<T> {
  command: string;
  parameters: CommandParameters;
  resolve: (t: T) => void;
}

export function CommandSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const onConnectedSendAndResolves = useRef<SendAndResolve<any>[]>([]);
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
    ioClient.on("connect", ()=> {
      setConnected(true);
    });
    ioClient.on("disconnect", async (): Promise<void> => {
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

  useEffect(() => {
    if (connected === true) {
      onConnectedSendAndResolves.current.forEach(sendAndResolve => sendCommand(sendAndResolve.command, sendAndResolve.parameters).then(sendAndResolve.resolve));
      onConnectedSendAndResolves.current.length = 0;
    }
  }, [connected]);

  const sendCommand = useCallback(
    (command: string, parameters: CommandParameters) => {
      if (connected === false) {
        return Promise.reject(new Error("The socket is not connected"));
      }

      const id = "id-" + Date.now();
      const eventArguments = { id, command, parameters };
      console.debug(`Sending the command '${command}' with id '${id}'`);

      return new Promise((resolve, reject) => {
        callbacks.current[id] = { resolve, reject };
        socket.emit("command", eventArguments);
      });
    },
    [socket, connected],
  );

  const isAvailable = useCallback(
    (): boolean => {
      return connected === true;
    },
    [connected],
  );

  const sendCommandOnConnected = useCallback(
    (command: string, parameters: CommandParameters): Promise<any> => {
      if (connected === true) {
        return sendCommand(command, parameters);
      }
      else {
        return new Promise<any>(resolve => {
          onConnectedSendAndResolves.current = onConnectedSendAndResolves.current.concat({ command, parameters, resolve });
        });
      }
    },
    [socket, connected],
  );

  return (
    <CommandSocketContext.Provider value={{ sendCommand, isAvailable, sendCommandOnConnected }}>
      {children}
    </CommandSocketContext.Provider>
  );
}
