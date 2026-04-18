import React from "react";
import { Overlay } from "@mantine/core";

import { ImageOrSummary, WithNavigationType } from "types";
import { ImageDetail } from "app/components";

import style from "./ImageVisualizer.module.scss";


type ImageVisualizerType = {
  image: ImageOrSummary;
  onClose: () => void;
  withNavigation: WithNavigationType;
};

export default function ImageVisualizer({
  image,
  onClose,
  withNavigation,
}: ImageVisualizerType) {
  return (
    <Overlay
      className={style.overlay}
      color="#000"
      backgroundOpacity={1}
    >
      <div className={style.container}>
        <ImageDetail image={image} onClose={onClose} withNavigation={withNavigation} />
      </div>
    </Overlay>
  );
}
