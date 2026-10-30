import React, { ReactElement } from "react";
import { NumberFormatter } from "@mantine/core";

import { ImageDimensions as PicteusImageDimensions } from "@picteus/ws-client";


export type ImageDimensionsPropsType = {
  dimensions: PicteusImageDimensions;
};

export default function ImageDimensions({ dimensions }: ImageDimensionsPropsType): ReactElement
{
  return (
    <>
      <NumberFormatter value={dimensions.width} thousandSeparator/>
      {" \u00D7 "}
      <NumberFormatter value={dimensions.height} thousandSeparator/>
    </>
  );
}
