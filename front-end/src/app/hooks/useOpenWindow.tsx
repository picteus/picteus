import { IntentInlineContent, IntentUrlContent } from "@picteus/shared-core";

import { useCommandSocket } from "app/context/CommandSocketContext";


type OpenWindowType = (id: string, content: IntentUrlContent | IntentInlineContent, automaticallyReopen: boolean) => Promise<string>;

export default function useOpenWindow(): OpenWindowType
{
  const { sendCommandOnConnected } = useCommandSocket();
  return (id: string, content: IntentUrlContent | IntentInlineContent, automaticallyReopen: boolean): Promise<string> =>
  {
    console.debug(`Opening the window with id '${id}'`);
    return sendCommandOnConnected("openWindow", {
      ...content,
      id,
      isTransient: "inline" in content,
      automaticallyReopen
    });
  };
}
