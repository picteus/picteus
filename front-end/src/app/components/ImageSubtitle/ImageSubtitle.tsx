import React, { ReactElement } from "react";

import { ImageOrSummary } from "types";
import DotSeparated from "../DotSeparated/DotSeparated.tsx";
import ImageDimensions from "../ImageDetail/components/ImageDimensions/ImageDimensions.tsx";
import ImageRatio from "../ImageDetail/components/ImageRatio/ImageRatio.tsx";
import ImageWeight from "../ImageDetail/components/ImageWeight/ImageWeight.tsx";


interface ImageSubtitlePropsType
{
  readonly image: ImageOrSummary;
  readonly withFormat?: boolean;
  readonly withWeight?: boolean;
  readonly withRatio?: boolean;
}

export default function ImageSubtitle({
  image,
  withFormat,
  withWeight,
  withRatio
}: ImageSubtitlePropsType): ReactElement
{
  const dimensions = withRatio === true ? (
    <span>
      <ImageDimensions dimensions={image.dimensions}/> (<ImageRatio dimensions={image.dimensions}/>)
    </span>
  ) : (
    <ImageDimensions dimensions={image.dimensions}/>
  );

  return (
    <DotSeparated inline>
      {dimensions}
      {withFormat && image.format}
      {withWeight && <ImageWeight image={image}/>}
    </DotSeparated>
  );
}
