import { useTranslation } from "react-i18next";

import { useCommandSocket } from "app/context";


export default function useFileOrDirectoryPicker(): (kind: "file" | "directory", defaultPath: string) => Promise<string>
{
  const [ t ] = useTranslation();
  const { sendCommand } = useCommandSocket();

  return async (kind: "file" | "directory", defaultPath: string): Promise<string> =>
  {
    return await sendCommand(kind === "file" ? "pickFile" : "pickDirectory", {
      title: t(`useFileOrDirectoryPicker.${kind}`),
      defaultPath
    });
  };
}
