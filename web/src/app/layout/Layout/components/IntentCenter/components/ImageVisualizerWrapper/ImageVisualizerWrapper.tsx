import React from "react";

import { ImageVisualizerContextValue } from "app/context";
import { useImageNavigation } from "app/hooks";
import { ImageVisualizer } from "app/components";


type ImageVisualizerWrapperType = {
  imageVisualizerContext: ImageVisualizerContextValue;
  onClose: () => void
};

export default function ImageVisualizerWrapper({
  imageVisualizerContext,
  onClose,
}: ImageVisualizerWrapperType) {
  const navigation = useImageNavigation(imageVisualizerContext);

  return (
    navigation.selectedImage !== undefined && <ImageVisualizer
      image={navigation.selectedImage}
      hasPrevious={navigation.hasPrevious}
      hasNext={navigation.hasNext}
      onPrevious={navigation.onPrevious}
      onNext={navigation.onNext}
      onClose={onClose}
    />
  );
}
