import { useTranslation } from "react-i18next";

import { useCommandSocket } from "app/context";


export default function useFileOrDirectoryPicker(): (kind: "file" | "directory", nature: "open" | "save", defaultPath: string) => Promise<string>
{
  const [ t ] = useTranslation();
  const { sendCommand } = useCommandSocket();

  return async (kind: "file" | "directory", nature: "open" | "save", defaultPath: string): Promise<string> =>
  {
    return await sendCommand(kind === "file" ? "pickFile" : "pickDirectory", {
      title: nature === "save" ? undefined : t(`useFileOrDirectoryPicker.${kind}`),
      nature,
      defaultPath
    });
  };
}
