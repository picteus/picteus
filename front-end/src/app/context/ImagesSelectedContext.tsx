import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ImageSummary } from "@picteus/ws-client";

import { ImageOrSummary } from "types";
import { NotificationsService } from "utils";
import { ImageService, StorageService } from "app/services";


const ImagesSelectedContext = createContext<{
  selectedImages: ImageOrSummary[],
  toggleSelectedImage: (image: ImageSummary) => void,
  isSelectedImage: (image: ImageSummary) => boolean,
  clearSelectedImages: () => void
} | undefined>(undefined);

export function useImagesSelectedContext() {
  return useContext(ImagesSelectedContext);
}

export function ImagesSelectedProvider({ children }) {
  const [selectedImages, setSelectedImages] = useState<ImageOrSummary[]>([]);

  useEffect(() => {
    const imagesIds = StorageService.getSelectedImagesIds();
    if (imagesIds.length > 0) {
      ImageService.searchImages({
        filter: {
          origin: {
            kind: "images",
            ids: imagesIds
          }
        }
      }).then(images => setSelectedImages(images.items)).catch(NotificationsService.apiCallError);
    }
  }, []);

  useEffect(() => {
    StorageService.setSelectedImageIds(selectedImages.map(image => image.id));
  }, [selectedImages]);

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
