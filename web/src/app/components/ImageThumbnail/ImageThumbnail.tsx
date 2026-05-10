import React from "react";
import { Image } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageService } from "app/services";


type ImageThumbnailType = {
  image: ImageSummary;
  width?: number;
  height?: number;
};

export default function ImageThumbnail({ image, width, height }: ImageThumbnailType) {
  return (<Image
    alt={image.name}
    w={width}
    h={height}
    fit="contain"
    src={ImageService.getImageSrc(image.url, width, height)} />);
}
