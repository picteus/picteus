import { type ReactElement } from "react";
import { NumberFormatter } from "@mantine/core";

import { ImageOrSummary } from "types";
import { computeBinaryWeight } from "utils";


type ImageWeightType = {
  image: ImageOrSummary;
};

export default function ImageWeight({ image }: ImageWeightType): ReactElement
{
  const { value, unit } = computeBinaryWeight(image.sizeInBytes);
  return <NumberFormatter value={value} decimalScale={2} suffix={` ${unit}`} thousandSeparator/>;
}
