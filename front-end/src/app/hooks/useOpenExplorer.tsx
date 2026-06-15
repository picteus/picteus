import { useCommandSocket } from "app/context";

export default function useOpenExplorer(path: string) {
  const { sendCommand } = useCommandSocket();
  return () => {
    return sendCommand("openExplorer", {
      path,
    });
  };
}
