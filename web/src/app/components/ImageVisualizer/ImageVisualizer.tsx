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

  function handleOnCloseFromOverlay(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const allowClose = !!target.getAttribute("data-close");
    if (allowClose) {
      onClose();
    }
  }

  return (
    <Overlay
      className={style.overlay}
      onClick={handleOnCloseFromOverlay}
      color="#000"
      backgroundOpacity={0.95}
    >
      <div className={style.container}>
        <ImageDetail image={image} onClose={onClose} hasNext={hasNext} hasPrevious={hasPrevious} onNext={onNext} onPrevious={onPrevious} />
      </div>
    </Overlay>
  );
}
