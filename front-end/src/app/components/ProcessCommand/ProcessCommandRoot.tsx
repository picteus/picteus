import React, { createContext, ReactElement } from "react";

import { useProcessCommand } from "app/hooks";
import { ProcessCommandRootPropsType } from "./types.ts";
import { ProcessCommandType } from "../../../types";


export type ProcessCommandContextValueType = {
  command: ProcessCommandType | undefined;
  execute: () => Promise<void> | void;
  isLoading: boolean;
  isAvailable: boolean;
};

export const ProcessCommandContext = createContext<ProcessCommandContextValueType | null>(null);

export default function ProcessCommandRoot({
  command,
  children
}: ProcessCommandRootPropsType): ReactElement
{
  const result = useProcessCommand({ command });
  return (
    <ProcessCommandContext.Provider value={result}>
      {children}
    </ProcessCommandContext.Provider>
  );
}
