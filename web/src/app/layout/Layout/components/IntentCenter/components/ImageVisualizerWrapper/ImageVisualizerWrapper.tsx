import React, { useEffect, useState } from "react";

import { ImageOrSummary } from "types";
import { ImageVisualizerContextValue } from "app/context";
import { useImageNavigation } from "app/hooks";
import { ImageVisualizer } from "app/components";


export default function ImageVisualizerWrapper({
  imageVisualizerContext,
  onClose,
}) {
  const [state] = useState<ImageVisualizerContextValue>(imageVisualizerContext);
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>(state.imageSummary);
  const navigation = useImageNavigation(selectedImage, setSelectedImage);
  useEffect(() => {
    navigation.setImageIds(state.prevAndNextIds);
  }, [state]);

  return (
    <ImageVisualizer
      image={selectedImage}
      hasPrev={navigation.hasPrev}
      hasNext={navigation.hasNext}
      onPrev={navigation.onPrev}
      onNext={navigation.onNext}
      onClose={onClose}
    />
  );
}
