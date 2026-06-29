import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

import { CommandContextType, CommandParameters, CommandSocketEventType, JsonType } from "types";


const CommandSocketContext = createContext(undefined);

export function useCommandSocket(): CommandContextType
{
  return useContext(CommandSocketContext);
}

interface SendAndResolve<T>
{
  command: string;

  parameters: CommandParameters;

  resolve: (value: T) => void;
}

export function CommandSocketProvider({ children }: { children: ReactNode })
{
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const onConnectedSendAndResolves = useRef<SendAndResolve<JsonType>[]>([]);
  const callbacks = useRef({});

  useEffect(() =>
  {
    const options: Partial<ManagerOptions & SocketOptions> =
      {
        autoConnect: true,
        reconnection: true,
        transports: ["websocket"]
      };
    const urlSearchParams = new URLSearchParams(window.location.search);
    const commandsSocketBaseUrl = urlSearchParams.get("commandsSocketBaseUrl");
    const commandsSocketSecret = urlSearchParams.get("commandsSocketSecret");
    console.debug(`Connecting to the command server socket at '${commandsSocketBaseUrl}'`);
    const socket = io(commandsSocketBaseUrl, options);
    socket.on("connect", () =>
    {
      console.debug(`The command socket client with id '${socket.id}' is connected`);
      setConnected(true);
      socket.emit("initialize", { secret: commandsSocketSecret });
    });
    socket.on("connect_error", (error): void =>
    {
      console.warn(`A connection issue occurred with the command socket client with id '${socket.id}'`, error);
    });
    socket.on("disconnect", (reason: Socket.DisconnectReason) =>
    {
      console.warn(`The command socket client is disconnected with reason '${reason}'`);
      setConnected(false);
    });
    socket.on("result", (response: CommandSocketEventType) =>
    {
      const { id, error, value } = response;
      if (callbacks.current[id])
      {
        if (error)
        {
          callbacks.current[id].reject(new Error(error));
        }
        else
        {
          callbacks.current[id].resolve(value);
        }
        delete callbacks.current[id];
      }
    });

    setSocket(socket);

    return () =>
    {
      socket.disconnect();
      console.debug("Disconnected the command socket");
    };
  }, []);

  useEffect(() =>
  {
    if (connected === true)
    {
      onConnectedSendAndResolves.current.forEach(sendAndResolve => sendCommand(sendAndResolve.command, sendAndResolve.parameters).then(sendAndResolve.resolve));
      onConnectedSendAndResolves.current.length = 0;
    }
  }, [connected]);

  const sendCommand = useCallback(
    (command: string, parameters: CommandParameters) =>
    {
      if (connected === false)
      {
        return Promise.reject(new Error("The socket is not connected"));
      }

      const id = "id-" + Date.now();
      const eventArguments = { id, command, parameters };
      console.debug(`Sending the command '${command}' with id '${id}'`);

      return new Promise((resolve, reject) =>
      {
        callbacks.current[id] = { resolve, reject };
        socket.emit("command", eventArguments);
      });
    },
    [socket, connected]
  );

  const isAvailable = useCallback(
    (): boolean =>
    {
      return connected === true;
    },
    [connected]
  );

  const sendCommandOnConnected = useCallback(
    (command: string, parameters: CommandParameters): Promise<JsonType> =>
    {
      if (connected === true)
      {
        return sendCommand(command, parameters);
      }
      else
      {
        return new Promise<JsonType>(resolve =>
        {
          onConnectedSendAndResolves.current = onConnectedSendAndResolves.current.concat({
            command,
            parameters,
            resolve
          });
        });
      }
    },
    [socket, connected]
  );

  return (
    <CommandSocketContext.Provider value={{ sendCommand, isAvailable, sendCommandOnConnected }}>
      {children}
    </CommandSocketContext.Provider>
  );
}
