import { useEffect, useState } from "react";

import { ImageOrSummary } from "types";
import { ImageVisualizerContextValue } from "app/context";
import { ImageService } from "app/services";


export default function useImageNavigation(selectedImage: ImageOrSummary, setSelected: (image: ImageOrSummary) => void) {
  const [state, setState] = useState<ImageVisualizerContextValue>({ imageSummary: undefined, prevAndNextIds: undefined });

  useEffect(() => {
    if (selectedImage !== state.imageSummary && state.imageSummary !== undefined) {
      setSelected(state.imageSummary);
    }
  }, [state]);

  async function handleOnNavigate(direction: number): Promise<void> {
    const prevAndNextIds = state.prevAndNextIds;
    if (prevAndNextIds) {
      const index = prevAndNextIds.findIndex(
        (id) => id === state.imageSummary?.id,
      );
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < prevAndNextIds.length) {
        const imageSummary = await ImageService.get({ id: prevAndNextIds[newIndex] });
        setState((previousValue) => ({
          ...previousValue,
          imageSummary,
        }));
      }
    }
  }

  function handlePrev(): void {
    void handleOnNavigate(-1);
  }

  function handleNext(): void {
    void handleOnNavigate(1);
  }

  function computeHas(direction: string) {
    const prevAndNextIds = state.prevAndNextIds;
    if (prevAndNextIds) {
      const index = prevAndNextIds.findIndex(
        (id) => id === state.imageSummary?.id,
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
    setImageIds:(imageIds: string[]) => {
      setState((previousValue) => ({ ...previousValue, prevAndNextIds: imageIds }));
    },
    hasPrev: computeHas("prev"),
    hasNext: computeHas("next"),
    onPrev: handlePrev,
    onNext: handleNext
  };
}
