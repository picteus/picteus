import { useCommandSocket } from "app/context/CommandSocketContext";


type OpenWindowType = (id: string, content: ({ url: string } | { html: string }),
                       automaticallyReopen: boolean) => Promise<string>;

export default function useOpenWindow(): OpenWindowType {
  const { sendCommandOnConnected } = useCommandSocket();
  return (id: string, content: ({ url: string } | { html: string }), automaticallyReopen: boolean): Promise<string> => {
    console.debug(`Opening the window with id '${id}'`);
    return sendCommandOnConnected("openWindow", { ...content, id, automaticallyReopen });
  };
}
