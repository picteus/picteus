import { useCommandSocket } from "app/context";


export default function useOpenBrowser(): (url: string) => Promise<void>
{
  const { sendCommandOnConnected } = useCommandSocket();

  return async (url: string): Promise<void> =>
  {
    void sendCommandOnConnected("openBrowser", { url });
  };
}
