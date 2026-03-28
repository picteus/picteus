import { useCommandSocket } from "app/context";

export default function useOpenWindow() {
  const { sendCommandOnConnected } = useCommandSocket();
  return (id: string, content: ({ url: string } | { html: string }), automaticallyReopen: boolean) => {
    console.debug(`Opening the window with id '${id}'`);
    return sendCommandOnConnected("openWindow", { ...content, id, automaticallyReopen });
  };
}
