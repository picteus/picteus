import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Image } from "@picteus/ws-client";

import { ImageOrSummary, ViewMode, WithNavigationType } from "types";
import { ImageService } from "app/services";


type ImageVisualizerContextValue = {
  selectedImage: ImageOrSummary | undefined;
  images: ImageOrSummary[];
  viewMode: ViewMode;
};

export default function useImageNavigation(initialValue?: ImageVisualizerContextValue): WithNavigationType & {
  setImages: (images: ImageOrSummary[]) => void,
  containsImage: (imageId: string) => boolean,
  setSelectedImage: (selectedImage: ImageOrSummary) => void,
  selectedImage: ImageOrSummary | undefined
  updateImage: (image: Image) => void,
  removeImage: (imageId: string) => number
}
{
  const [state, setState] = useState<ImageVisualizerContextValue>(initialValue ?? {
    selectedImage: undefined,
    images: [],
    viewMode: "masonry"
  });
  const stateRef = useRef<ImageVisualizerContextValue>(state);

  useEffect(() =>
  {
    stateRef.current = state;
  }, [state]);

  const setImages = useCallback((images: ImageOrSummary[]): void =>
  {
    setState((previousState) => ({ ...previousState, images }));
  }, []);

  const containsImage = useCallback((imageId: string) =>
  {
    return stateRef.current.images.find(image => image.id === imageId) !== undefined || stateRef.current.selectedImage?.id === imageId;
  }, []);

  const setSelectedImage = useCallback((selectedImage: ImageOrSummary): void =>
  {
    setState((previousState) => ({ ...previousState, selectedImage }));
  }, []);

  const updateImage = useCallback((image: Image) =>
  {
    setState((previousState) =>
    {
      const images = previousState.images;
      const index = images.findIndex(anImage => anImage.id === image.id);
      if (index !== -1)
      {
        images.splice(index, 1, image);
      }
      const selectedImage = previousState.selectedImage?.id === image.id ? image : previousState.selectedImage;
      return { ...previousState, images, selectedImage };
    });
  }, []);

  const removeImage = useCallback((imageId: string) =>
  {
    const initialIndex = stateRef.current.images.findIndex(anImage => anImage.id === imageId);
    const newLength = initialIndex !== -1 ? stateRef.current.images.length - 1 : stateRef.current.images.length;

    setState((previousState) =>
    {
      const images = previousState.images;
      const index = images.findIndex(anImage => anImage.id === imageId);
      if (index !== -1)
      {
        images.splice(index, 1);
      }
      const selectedImage = previousState.selectedImage?.id === imageId ? (index >= 1 ? images[index - 1] : (images.length === 0 ? undefined : images[index])) : previousState.selectedImage;
      return { ...previousState, images, selectedImage };
    });

    return newLength;
  }, []);

  const computeHas = useCallback((direction: string) =>
  {
    const previousAndNextImages = state.images;
    if (previousAndNextImages.length <= 1)
    {
      return false;
    }
    const index = previousAndNextImages.findIndex((image) => image.id === state.selectedImage?.id);
    if (direction === "previous")
    {
      return index > 0;
    }
    else if (direction === "next")
    {
      return index < previousAndNextImages.length - 1;
    }
  }, [state]);

  const hasPrevious = useMemo<boolean>(() => computeHas("previous"), [computeHas]);

  const hasNext = useMemo<boolean>(() => computeHas("next"), [computeHas]);

  const handleOnNavigate = useCallback((direction: number): void =>
  {
    if (state.selectedImage !== undefined)
    {
      const previousAndNextImages = state.images;
      const index = previousAndNextImages.findIndex(
        (image) => image.id === state.selectedImage?.id
      );
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < previousAndNextImages.length)
      {
        // We make a call to make sure that the data is up to date
        ImageService.get({ id: previousAndNextImages[newIndex].id }).then(image => setState((previousValue) =>
        {
          previousValue.selectedImage = image;
          return { ...previousValue };
        }));
      }
    }
  }, [state]);

  const onPrevious = useCallback(() =>
  {
    void handleOnNavigate(-1);
  }, [handleOnNavigate]);

  const onNext = useCallback(() =>
  {
    void handleOnNavigate(1);
  }, [handleOnNavigate]);

  return {
    setImages,
    containsImage,
    setSelectedImage,
    selectedImage: state.selectedImage,
    updateImage,
    removeImage,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext
  };
}
