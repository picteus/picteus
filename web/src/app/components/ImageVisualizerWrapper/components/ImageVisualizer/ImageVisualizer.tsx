import React from "react";
import { Overlay } from "@mantine/core";

import { ImageOrSummary, ViewMode, WithNavigationType } from "types";
import { ImageDetail } from "app/components";

import style from "./ImageVisualizer.module.scss";


type ImageVisualizerType = {
  image: ImageOrSummary;
  withNavigation: WithNavigationType;
  viewMode: ViewMode;
  onClose: () => void;
};

export default function ImageVisualizer({ image, viewMode, withNavigation, onClose }: ImageVisualizerType) {
  return (
    <Overlay
      className={style.overlay}
      color="#000"
      backgroundOpacity={1}
    >
      <div className={style.container}>
        <ImageDetail image={image} withNavigation={withNavigation} viewMode={viewMode} onClose={onClose} />
      </div>
    </Overlay>
  );
}
