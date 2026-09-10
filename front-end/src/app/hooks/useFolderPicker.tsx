import { FolderTypes } from "types";
import { useFileOrDirectoryPicker } from "app/hooks";
import { StorageService } from "app/services";


export default function useFolderPicker(): (type: FolderTypes) => Promise<string>
{
  const pickFileOrDirectory = useFileOrDirectoryPicker();

  return async (type: FolderTypes): Promise<string> =>
  {
    const defaultPath = StorageService.getLastFolderLocation(type);
    const directoryPath = await pickFileOrDirectory("directory", defaultPath);
    if (directoryPath)
    {
      StorageService.setLastFolderLocation(type, directoryPath);
    }
    return directoryPath;
  };
}
