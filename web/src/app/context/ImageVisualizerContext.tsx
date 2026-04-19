import React, { createContext, useCallback, useContext } from "react";
import { randomId } from "@mantine/hooks";

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
  const [, addModal, removeModal] = useActionModalContext();

  const show = useCallback((imageVisualizer: ImageVisualizerContextValue): void => {
    const modalId = randomId();

    function handleOnCloseVisualizer() {
      removeModal(modalId);
    }

    addModal({
      id: modalId,
      component: (
        <ImageVisualizerWrapper
          imageVisualizerContext={imageVisualizer}
          onClose={handleOnCloseVisualizer}
        />
      ),
      withCloseButton: false,
      onBeforeClose: handleOnCloseVisualizer,
      fullScreen: true
    });
  }, []);

  return (
    <ImageVisualizerContext.Provider value={show}>
      {children}
    </ImageVisualizerContext.Provider>
  );
}
