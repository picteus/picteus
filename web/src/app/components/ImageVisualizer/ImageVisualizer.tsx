import React from "react";
import { Overlay } from "@mantine/core";

import { ImageOrSummary } from "types";
import { ImageDetail } from "app/components";

import style from "./ImageVisualizer.module.scss";


type ImageVisualizerType = {
  image: ImageOrSummary;
  onClose: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function ImageVisualizer({
  image,
  onClose,
  hasPrev,
  hasNext,
  onPrev,
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
        <ImageDetail image={image} onClose={onClose} hasNext={hasNext} hasPrevious={hasPrev} onNext={onNext} onPrevious={onPrev} />
      </div>
    </Overlay>
  );
}
