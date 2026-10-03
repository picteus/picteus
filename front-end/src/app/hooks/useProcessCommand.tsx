import { useCallback, useMemo } from "react";

import { ProcessCommandType } from "types";
import { useProcessCommands } from "app/hooks";
import { ProcessCommandTargetType } from "../components/ProcessCommand/types.ts";


type UseProcessCommandOptionsType = {
  command: ProcessCommandTargetType;
};

export type UseProcessCommandResultType = {
  command: ProcessCommandType | undefined;
  execute: () => Promise<void> | void;
  isLoading: boolean;
  isAvailable: boolean;
};

export default function useProcessCommand({ command }: UseProcessCommandOptionsType): UseProcessCommandResultType
{
  const { getCommand, isLoading } = useProcessCommands({});

  const resolvedCommand = useMemo<ProcessCommandType | undefined>(() =>
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
    if (typeof command === "object" && "execute" in command)
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
