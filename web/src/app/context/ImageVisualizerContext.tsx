import React, { createContext, useContext, useState } from "react";

import { ImageOrSummary } from "types";


export type ImageVisualizerContextValue = {
  imageSummary: ImageOrSummary | undefined;
  prevAndNextIds?: string[];
};

export type ImageVisualizerContextDispatcher = React.Dispatch<
  React.SetStateAction<ImageVisualizerContextValue>
>;

const ImageVisualizerContext = createContext<
  [ImageVisualizerContextValue, ImageVisualizerContextDispatcher] | undefined
>(undefined);

export function useImageVisualizerContext() {
  return useContext(ImageVisualizerContext);
}

export function ImageVisualizerProvider({ children }) {
  const [value, setValue] = useState<ImageVisualizerContextValue>({
    imageSummary: undefined,
    prevAndNextIds: undefined,
  });

  return (
    <ImageVisualizerContext.Provider value={[value, setValue]}>
      {children}
    </ImageVisualizerContext.Provider>
  );
}
