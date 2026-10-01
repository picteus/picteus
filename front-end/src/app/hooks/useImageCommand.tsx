import { useCallback, useMemo } from "react";

import { ImageCommandType, ImageOrSummary, ViewMode } from "types";
import { useImageCommands } from "app/hooks";
import { ImageCommandTargetType } from "../components/ImageCommand/types";


type UseImageCommandOptionsType = {
  image: ImageOrSummary;
  command: ImageCommandTargetType;
  viewMode?: ViewMode;
};

export type UseImageCommandResultType = {
  command: ImageCommandType | undefined;
  execute: () => Promise<void> | void;
  isLoading: boolean;
  isAvailable: boolean;
};

export default function useImageCommand({
  image,
  command,
  viewMode
}: UseImageCommandOptionsType): UseImageCommandResultType
{
  const { getCommand, isLoading } = useImageCommands({ image, viewMode });

  const resolvedCommand = useMemo<ImageCommandType | undefined>(() =>
  {
    if (typeof command === "object" && "execute" in command)
    {
      return command;
    }
    return getCommand(command);
  }, [ command, getCommand ]);

  const execute = useCallback((): Promise<void> | void =>
  {
    if (resolvedCommand?.execute)
    {
      return resolvedCommand.execute();
    }
  }, [ resolvedCommand ]);

  const isCommandLoading = useMemo<boolean>(() =>
  {
    if (command !== undefined && typeof command === "object" && "execute" in command)
    {
      return command.isLoading ?? false;
    }
    return resolvedCommand?.isLoading ?? isLoading;
  }, [ command, resolvedCommand, isLoading ]);

  return {
    command: resolvedCommand,
    execute,
    isLoading: isCommandLoading,
    isAvailable: resolvedCommand?.isAvailable ?? false
  };
}
