import React, { createContext, useContext, useState } from "react";

import { ImageOrSummary } from "types";


export type ImageVisualizerContextValue = {
  selectedImage: ImageOrSummary | undefined;
  images: ImageOrSummary[];
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
    selectedImage: undefined,
    images: [],
  });

  return (
    <ImageVisualizerContext.Provider value={[value, setValue]}>
      {children}
    </ImageVisualizerContext.Provider>
  );
}
