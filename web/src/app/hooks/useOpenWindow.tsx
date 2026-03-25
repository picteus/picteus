import { useCommandSocket } from "app/context";

export default function useOpenWindow() {
  const { sendCommand } = useCommandSocket();
  return (id: string, content: ({ url: string } | { html: string }), automaticallyReopen: boolean) => {
    return sendCommand("openWindow", { ...content, id, automaticallyReopen });
  };
}
