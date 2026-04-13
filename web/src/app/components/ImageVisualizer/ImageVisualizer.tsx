import React from "react";
import { Overlay } from "@mantine/core";

import { ImageOrSummary } from "types";
import { ImageDetail } from "app/components";

import style from "./ImageVisualizer.module.scss";


type ImageVisualizerType = {
  image: ImageOrSummary;
  onClose: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function ImageVisualizer({
  image,
  onClose,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext
}: ImageVisualizerType) {
  return (
    <Overlay
      className={style.overlay}
      color="#000"
      backgroundOpacity={1}
    >
      <div className={style.container}>
        <ImageDetail image={image} onClose={onClose} hasNext={hasNext} hasPrevious={hasPrevious}
                     onNext={onNext} onPrevious={onPrevious} />
      </div>
    </Overlay>
  );
}
