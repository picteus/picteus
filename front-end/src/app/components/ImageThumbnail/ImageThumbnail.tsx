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

export default function ImageThumbnail({ imageOrUrl, width, height }: ImageThumbnailType)
{
  return (<Image
    alt={typeof imageOrUrl === "string" ? "Thumbnail" : imageOrUrl.name}
    w={width}
    h={height}
    fit="contain"
    radius={variables.imageRadius}
    src={ImageService.getImageSrc(typeof imageOrUrl === "string" ? imageOrUrl : imageOrUrl.url, width, height)}
    // The fallback URL is taken from https://tabler.io/icons?icon=alert-octagon
    fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23868e96' stroke-width='1' stroke-linecap='round' stroke-linejoin='round' class='icon icon-tabler icons-tabler-outline icon-tabler-alert-octagon'%3E%3Cpath stroke='none' d='M0 0h24v24H0z' fill='none' /%3E%3Cpath d='M12.802 2.165l5.575 2.389c.48 .206 .863 .589 1.07 1.07l2.388 5.574c.22 .512 .22 1.092 0 1.604l-2.389 5.575c-.206 .48 -.589 .863 -1.07 1.07l-5.574 2.388c-.512 .22 -1.092 .22 -1.604 0l-5.575 -2.389a2.036 2.036 0 0 1 -1.07 -1.07l-2.388 -5.574a2.036 2.036 0 0 1 0 -1.604l2.389 -5.575c.206 -.48 .589 -.863 1.07 -1.07l5.574 -2.388a2.036 2.036 0 0 1 1.604 0' /%3E%3Cpath d='M12 8v4' /%3E%3Cpath d='M12 16h.01' /%3E%3C/svg%3E"
  />);
}
