import React, { createContext, useCallback, useContext } from "react";

import { ImageOrSummary } from "types";
import { ImageVisualizerWrapper } from "app/components";
import { useActionModalContext } from "./ActionModalContext.tsx";


export type ImageVisualizerContextValue = {
  selectedImage: ImageOrSummary | undefined;
  images: ImageOrSummary[];
};

const ImageVisualizerContext = createContext<((value: ImageVisualizerContextValue) => void) | undefined>(undefined);

export function useImageVisualizerContext() {
  return useContext(ImageVisualizerContext);
}

export function ImageVisualizerProvider({ children }) {
  const [, addModal] = useActionModalContext();

  const show = useCallback((imageVisualizer: ImageVisualizerContextValue): void => {
    addModal({
      component: (
        <ImageVisualizerWrapper
          imageVisualizerContext={imageVisualizer}
          onSuccess={() => {
          }}
        />
      ),
      withCloseButton: false,
      fullScreen: true
    });
  }, []);

  return (
    <ImageVisualizerContext.Provider value={show}>
      {children}
    </ImageVisualizerContext.Provider>
  );
}
