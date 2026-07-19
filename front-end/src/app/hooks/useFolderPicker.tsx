import { useTranslation } from "react-i18next";

import { useCommandSocket } from "app/context";
import { StorageService } from "app/services";
import { FolderTypes } from "types";


export default function useFolderPicker()
{
  const [ t ] = useTranslation();
  const { sendCommand } = useCommandSocket();

  return async (type: FolderTypes) =>
  {
    const defaultPath = StorageService.getLastFolderLocation(type);
    const directoryPath = await sendCommand("pickDirectory", {
      title: t("command.pickDirectory"),
      defaultPath
    });
    if (directoryPath)
    {
      StorageService.setLastFolderLocation(type, directoryPath);
    }
    return directoryPath;
  };
}
