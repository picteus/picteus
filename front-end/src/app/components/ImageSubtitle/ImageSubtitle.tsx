import React, { Fragment, ReactElement, ReactNode } from "react";

import { ImageOrSummary } from "types";
import { Common } from "app/components";
import { ImageDimensions, ImageWeight } from "app/components/ImageDetail/components";


export interface ImageSubtitlePropsType
{
  readonly image: ImageOrSummary;
  readonly withFormat?: boolean;
  readonly withWeight?: boolean;
}

export default function ImageSubtitle({
  image,
  withFormat,
  withWeight
}: ImageSubtitlePropsType): ReactElement
{
  const elements: ReactNode[] = [];
  elements.push(
    <ImageDimensions
      key="dimensions"
      dimensions={image.dimensions}
    />
  );
  if (withFormat)
  {
    elements.push(<Fragment key="format">{image.format}</Fragment>);
  }
  if (withWeight)
  {
    elements.push(<ImageWeight key="weight" image={image}/>);
  }

  return (
    <>
      {elements.map((element, index) => (
        <Fragment key={index}>
          {index > 0 && Common.DotSeparator}
          {element}
        </Fragment>
      ))}
    </>
  );
}
