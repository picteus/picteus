import React, { createContext, useCallback, useContext, useState } from "react";


import { ImageSummary } from "@picteus/ws-client";

type ImagesSelectedContextValueType = ImageSummary[];

const ImagesSelectedContext = createContext<{
  selectedImages: ImagesSelectedContextValueType,
  toggleSelectedImage: (image: ImageSummary) => void,
  isSelectedImage: (image: ImageSummary) => boolean,
  clearSelectedImages: () => void
} | undefined>(undefined);

export function useImagesSelectedContext() {
  return useContext(ImagesSelectedContext);
}

export function ImagesSelectedProvider({ children }) {
  const [selectedImages, setSelectedImages] = useState<ImagesSelectedContextValueType>([]);

  const toggleSelectedImage = useCallback((image: ImageSummary)=> {
    if (selectedImages.find((anImage) => anImage.id === image.id)) {
      setSelectedImages(selectedImages.filter((anImage) => anImage.id !== image.id));
    }
    else {
      setSelectedImages([...selectedImages, image]);
    }
  }, [selectedImages]);

  const isSelectedImage = useCallback((image: ImageSummary) => selectedImages.find((anImage) => anImage.id === image.id) !== undefined, [selectedImages]);

  const clearSelectedImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  return (
    <ImagesSelectedContext.Provider value={{ selectedImages, toggleSelectedImage, isSelectedImage, clearSelectedImages }}>
      {children}
    </ImagesSelectedContext.Provider>
  );
}
