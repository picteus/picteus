import React from "react";
import { Image } from "@mantine/core";

import { ImageService } from "app/services";
import { ImageSummary } from "@picteus/ws-client";

type ImageThumbnailType = {
  summary?: ImageSummary;
  height: number;
};

export default function ImageThumbnail({ summary, height }: ImageThumbnailType) {
  return (<Image
    alt="Image thumbnail"
    h={height}
    fit="contain"
    src={summary === undefined ? "" : ImageService.getImageSrc(summary.url, undefined, height)}></Image>);
}
