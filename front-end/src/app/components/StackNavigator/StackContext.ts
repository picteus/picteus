import { createContext } from "react";

import { ActionModalValue } from "types";


// Kept in its own module on purpose: when StackNavigator.tsx is hot-reloaded by vite, it re-imports this
// unchanged module, so the context object identity stays stable and useStackNavigator() keeps matching the provider
export interface StackContextType
{
  push: (stackedComponent: ActionModalValue) => void;

  pop: () => void;

  popToIndex: (targetIndex: number) => void;

  popToRoot: () => void;

  set: (stackedComponents: ActionModalValue[]) => void;
}

export const StackContext = createContext<StackContextType | null>(null);
