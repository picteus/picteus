import React from "react";
import { Image } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageService } from "app/services";


type ImageThumbnailType = {
  summary: ImageSummary;
  height: number;
};

export default function ImageThumbnail({ summary, height }: ImageThumbnailType) {
  return (<Image
    alt={summary.name}
    h={height}
    fit="contain"
    src={ImageService.getImageSrc(summary.url, undefined, height)} />);
}
