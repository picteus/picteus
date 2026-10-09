import React, { type ReactElement, type ReactNode, useContext, useState } from "react";
import createHmrStableContext from "./createHmrStableContext.ts";


export interface TitleBarContextType
{
  readonly titleBarElement: HTMLElement | null;
  readonly setTitleBarElement: (element: HTMLElement | null) => void;
}

const TitleBarContext = createHmrStableContext<TitleBarContextType | undefined>(
  import.meta.hot,
  "titleBarContext",
  undefined
);

export function useTitleBarContext(): TitleBarContextType
{
  const context = useContext(TitleBarContext);
  if (context === undefined)
  {
    throw new Error("useTitleBarContext must be used within a TitleBarProvider");
  }
  return context;
}

export interface TitleBarProviderPropsType
{
  readonly children?: ReactNode;
}

export function TitleBarProvider({ children }: TitleBarProviderPropsType): ReactElement
{
  const [ titleBarElement, setTitleBarElement ] = useState<HTMLElement | null>(null);

  const value: TitleBarContextType = {
    titleBarElement,
    setTitleBarElement
  };

  return (
    <TitleBarContext.Provider value={value}>
      {children}
    </TitleBarContext.Provider>
  );
}
