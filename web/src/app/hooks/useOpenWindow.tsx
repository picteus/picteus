import { useCommandSocket } from "app/context";

export default function useOpenWindow(url: string) {
  const { sendCommand } = useCommandSocket();
  return () => {
    return sendCommand("openWindow", {
      url,
    });
  };
}
