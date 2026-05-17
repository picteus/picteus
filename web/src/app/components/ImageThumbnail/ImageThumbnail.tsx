import React from "react";
import { Image } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageService } from "app/services";

import variables from "assets/style/variablesExport.module.scss";


type ImageThumbnailType = {
  imageOrUrl: ImageSummary | string;
  width?: number;
  height?: number;
};

export default function ImageThumbnail({ imageOrUrl, width, height }: ImageThumbnailType) {
  return (<Image
    alt={typeof imageOrUrl === "string" ? "Thumbnail" : imageOrUrl.name}
    w={width}
    h={height}
    fit="contain"
    radius={variables.imageRadius}
    src={ImageService.getImageSrc(typeof imageOrUrl === "string" ? imageOrUrl : imageOrUrl.url, width, height)} />);
}
