import React, { createContext, useContext, useState } from "react";
import { ImageSummary } from "@picteus/ws-client";

type ImagesSelectedContextValueType = ImageSummary[];

const ImagesSelectedContext = createContext<
  | [
      ImagesSelectedContextValueType,
      React.Dispatch<React.SetStateAction<ImagesSelectedContextValueType>>,
    ]
  | undefined
>(undefined);

export function useImagesSelectedContext() {
  return useContext(ImagesSelectedContext);
}

export function ImagesSelectedProvider({ children }) {
  const [selectedImages, setSelectedImages] =
    useState<ImagesSelectedContextValueType>([]);

  return (
    <ImagesSelectedContext.Provider value={[selectedImages, setSelectedImages]}>
      {children}
    </ImagesSelectedContext.Provider>
  );
}
