import React, { useEffect, useState } from "react";

import { ImageOrSummary } from "types";
import { useImageNavigation } from "app/hooks";
import { ImageVisualizer } from "app/components";


export default function ImageVisualizerWrapper({
  imageVisualizerContext,
  onClose,
}) {
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>(imageVisualizerContext.selectedImage);
  const navigation = useImageNavigation(selectedImage, setSelectedImage);
  useEffect(() => {
    navigation.setImages(imageVisualizerContext.images, imageVisualizerContext.image);
  }, [imageVisualizerContext]);

  return (
    <ImageVisualizer
      image={selectedImage}
      hasPrevious={navigation.hasPrevious}
      hasNext={navigation.hasNext}
      onPrevious={navigation.onPrevious}
      onNext={navigation.onNext}
      onClose={onClose}
    />
  );
}
