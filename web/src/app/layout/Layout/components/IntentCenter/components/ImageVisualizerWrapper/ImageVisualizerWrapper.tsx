import React, { useState } from "react";

import { ImageService } from "app/services";
import { ImageVisualizer } from "app/components";
import { ImageVisualizerContextValue } from "app/context";

export default function ImageVisualizerWrapper({
  imageVisualizerContext,
  onClose,
}) {
  const [state, setState] = useState<ImageVisualizerContextValue>(
    imageVisualizerContext,
  );

  async function handleOnNavigate(direction: number) {
    const prevAndNextIds = state.prevAndNextIds;
    if (prevAndNextIds) {
      const index = prevAndNextIds.findIndex(
        (id) => id === state.imageSummary?.id,
      );
      const newIndex = index + direction;
      if (newIndex >= 0 && newIndex < prevAndNextIds.length) {
        const imageSummary = await ImageService.get({
          id: prevAndNextIds[newIndex],
        });
        setState((prev) => ({
          ...prev,
          imageSummary,
        }));
      }
    }
  }

  function handlePrev() {
    void handleOnNavigate(-1);
  }

  function handleNext() {
    void handleOnNavigate(1);
  }

  function computeHas(direction) {
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

  return (
    <ImageVisualizer
      imageSummary={state.imageSummary}
      hasPrev={computeHas("prev")}
      hasNext={computeHas("next")}
      onPrev={handlePrev}
      onNext={handleNext}
      onClose={onClose}
    />
  );
}
