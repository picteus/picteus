import React from "react";
import { NumberFormatter } from "@mantine/core";

import { ImageDimensions as PicteusImageDimensions } from "@picteus/ws-client";


type ImageDimensionsType = {
  dimensions: PicteusImageDimensions;
};

export default function ImageDimensions({ dimensions }: ImageDimensionsType) {
  return <>
    <NumberFormatter value={dimensions.width} thousandSeparator />
    {"x"}
    <NumberFormatter value={dimensions.height} thousandSeparator />
  </>;

}
