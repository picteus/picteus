import { useCallback, useMemo, useState } from "react";

import { ImageOrSummary, WithNavigationType } from "types";
import { ImageVisualizerContextValue } from "app/context";
import { ImageService } from "app/services";


export default function useImageNavigation(initialValue?: ImageVisualizerContextValue): WithNavigationType & {
  setImages: (images: ImageOrSummary[]) => void,
  setSelectedImage: (selectedImage: ImageOrSummary) => void,
  selectedImage: ImageOrSummary | undefined
} {
  const [state, setState] = useState<ImageVisualizerContextValue>(initialValue ?? { selectedImage: undefined, images: [], viewMode: "masonry" });

  const setImages = useCallback((images: ImageOrSummary[]): void => {
    setState((previousValue) => {
      previousValue.images = images;
      return { ...previousValue };
    });
  }, []);

  const setSelectedImage = useCallback((selectedImage: ImageOrSummary): void => {
    setState((previousValue) => {
      previousValue.selectedImage = selectedImage;
      return { ...previousValue };
    });
  }, []);

  const computeHas = useCallback((direction: string) => {
    const previousAndNextImages = state.images;
    if (previousAndNextImages.length <= 1) {
      return false;
    }
    const index = previousAndNextImages.findIndex((image) => image.id === state.selectedImage?.id);
    if (direction === "previous") {
      return index > 0;
    }
    else if (direction === "next") {
      return index < previousAndNextImages.length - 1;
    }
  }, [state]);

  const hasPrevious = useMemo<boolean>(() => computeHas("previous"), [computeHas]);
  const hasNext = useMemo<boolean>(() => computeHas("next"), [computeHas]);

  const handleOnNavigate = useCallback((direction: number): void => {
    if (state.selectedImage !== undefined) {
      const previousAndNextImages = state.images;
      const index = previousAndNextImages.findIndex(
        (image) => image.id === state.selectedImage?.id
      );
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < previousAndNextImages.length) {
        // We make a call to make sure that the data is up to date
        ImageService.get({ id: previousAndNextImages[newIndex].id }).then(image => setState((previousValue) => {
          previousValue.selectedImage = image;
          return { ...previousValue };
        }));
      }
    }
  }, [state]);

  const onPrevious = useCallback(() => {
    void handleOnNavigate(-1);
  }, [handleOnNavigate]);

  const onNext = useCallback(() => {
    void handleOnNavigate(1);
  }, [handleOnNavigate]);

  return {
    setImages,
    setSelectedImage,
    selectedImage: state.selectedImage,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext
  };
}
