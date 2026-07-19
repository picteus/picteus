import { useCommandSocket } from "app/context";


export default function useOpenExplorer()
{
  const { sendCommand } = useCommandSocket();
  return (path: string) =>
  {
    return sendCommand("openExplorer", { path });
  };
}
