import React from "react";

import { ImageVisualizerContextValue } from "app/context";
import { useImageNavigation } from "app/hooks";
import { ImageVisualizer } from "./components";


type ImageVisualizerWrapperType = {
  imageVisualizerContext: ImageVisualizerContextValue;
  onSuccess: () => void
};

export default function ImageVisualizerWrapper({
  imageVisualizerContext,
  onSuccess,
}: ImageVisualizerWrapperType) {
  const navigation = useImageNavigation(imageVisualizerContext);

  return (
    navigation.selectedImage !== undefined &&
    <ImageVisualizer image={navigation.selectedImage} withNavigation={navigation} viewMode={imageVisualizerContext.viewMode} onClose={onSuccess} />
  );
}
