import React from "react";
import { NumberFormatter } from "@mantine/core";

import { ImageOrSummary } from "types";


type ImageWeightType = {
  image: ImageOrSummary;
};

export default function ImageWeight({ image }: ImageWeightType) {
  const bytes = image.sizeInBytes;
  let value: number;
  let unit: string;
  if (bytes < 1024) {
    value = bytes;
    unit = "B";
  }
  else if (bytes < 1024 * 1024) {
    value = bytes / 1024;
    unit = "kB";
  } else
  {
    value = bytes / (1024 * 1024);
    unit = "MB";
  }
  return <NumberFormatter value={value} decimalScale={2} suffix={` ${unit}`} thousandSeparator />;

}
