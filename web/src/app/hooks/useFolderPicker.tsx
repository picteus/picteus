import { useCommandSocket } from "app/context";
import { StorageService } from "app/services";
import { FolderTypes } from "types";

export default function useFolderPicker() {
  const { sendCommand } = useCommandSocket();

  return () => {
    const defaultPath = StorageService.getLastFolderLocation(
      FolderTypes.REPOSITORY,
    );
    return sendCommand("pickDirectory", {
      title: "Please, select a directory",
      defaultPath,
    });
  };
}
