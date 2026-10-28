import React, { type ReactElement, useMemo } from "react";
import { Flex } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";

import { ImageOrSummary, ViewMode } from "types";
import { Common, ImageItemWrapper } from "app/components";


export type ImageItemsGalleryPropsType =
  {
    readonly idsOrImages: readonly (string | ImageOrSummary)[];
    readonly edge?: number;
    readonly viewMode: ViewMode;
  };

export default function ImageItemsGallery({
  idsOrImages,
  edge = Common.ImageThumbnailEdge,
  viewMode
}: ImageItemsGalleryPropsType): ReactElement | null
{
  const [ hostRef, hostRefRectangle ] = useResizeObserver();
  const gap = 10;

  const visibleCount = useMemo<number>(() =>
  {
    const containerWidth = Math.floor(hostRefRectangle.width);
    if (containerWidth <= 0)
    {
      return 0;
    }

    return Math.max(1, Math.floor((containerWidth + gap) / (edge + gap)));
  }, [ hostRefRectangle.width, edge, gap ]);

  const displayedItems = useMemo<readonly (string | ImageOrSummary)[]>(
    () => idsOrImages.slice(0, visibleCount),
    [ idsOrImages, visibleCount ]
  );

  if (idsOrImages.length === 0)
  {
    return null;
  }

  return (
    <Flex ref={hostRef} gap={gap} wrap="nowrap" w="100%" miw={0} maw="100%" mih={edge} align="center">
      {displayedItems.map(idOrImage => (
        <ImageItemWrapper
          key={typeof idOrImage === "string" ? idOrImage : idOrImage.id}
          idOrImage={idOrImage}
          edge={edge}
          viewMode={viewMode}
        />
      ))}
    </Flex>
  );
}

