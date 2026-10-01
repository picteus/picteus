import React, { createContext, ReactNode } from "react";

import { ImageCommandType } from "types";
import { useImageCommand } from "app/hooks";
import { ImageCommandRootPropsType } from "./types.ts";


export type ImageCommandContextValueType = {
  command: ImageCommandType | undefined;
  execute: () => Promise<void> | void;
  isLoading: boolean;
  isAvailable: boolean;
};

export const ImageCommandContext = createContext<ImageCommandContextValueType | null>(null);

export default function ImageCommandRoot({
  image,
  command,
  viewMode,
  children
}: ImageCommandRootPropsType): ReactNode
{
  const result = useImageCommand({ image, command, viewMode });
  return (
    <ImageCommandContext.Provider value={result}>
      {children}
    </ImageCommandContext.Provider>
  );
}
