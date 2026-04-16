import { useEffect, useState } from "react";

import { ImageOrSummary } from "types";
import { ImageVisualizerContextValue } from "app/context";
import { ImageService } from "app/services";


export default function useImageNavigation(selectedImage: ImageOrSummary, setSelected: (image: ImageOrSummary) => void) {
  const [state, setState] = useState<ImageVisualizerContextValue>({ selectedImage: undefined, images: [] });

  useEffect(() => {
    if (selectedImage !== state.selectedImage && state.selectedImage !== undefined) {
      setSelected(state.selectedImage);
    }
  }, [state]);

  useEffect(() => {
    setState((previousValue) => ({
      ...previousValue,
      selectedImage
    }));
  }, [selectedImage]);

  async function handleOnNavigate(direction: number): Promise<void> {
    if (state.selectedImage !== undefined) {
      const previousAndNextImages = state.images;
      const index = previousAndNextImages.findIndex(
        (image) => image.id === state.selectedImage?.id
      );
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < previousAndNextImages.length) {
        // We make a call to make sure that the data is up to date
        const image = await ImageService.get( {id: previousAndNextImages[newIndex].id} );
        setState((previousValue) => ({
          ...previousValue,
          selectedImage: image
        }));
      }
    }
  }

  function handlePrevious(): void {
    void handleOnNavigate(-1);
  }

  function handleNext(): void {
    void handleOnNavigate(1);
  }

  function computeHas(direction: string) {
    const prevAndNextIds = state.images;
    if (prevAndNextIds) {
      if (prevAndNextIds.length <= 1) {
        return false;
      }
      const index = prevAndNextIds.findIndex(
        (image) => image.id === state.selectedImage?.id,
      );
      if (direction === "prev") {
        return index > 0;
      } else if (direction === "next") {
        return index < prevAndNextIds.length - 1;
      }
    }
    return false;
  }

  return {
    setImages:(images: ImageOrSummary[], selectedImage: ImageOrSummary) => {
      setState({ selectedImage, images });
    },
    hasPrevious: computeHas("prev"),
    hasNext: computeHas("next"),
    onPrevious: handlePrevious,
    onNext: handleNext
  };
}
