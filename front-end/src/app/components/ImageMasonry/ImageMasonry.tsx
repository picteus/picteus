import React, { ReactElement, RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { useResizeObserver } from "@mantine/hooks";
import { FastMasonry as MasonryLayout, MasonrySizing } from "react-fast-masonry";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useActionModalContext } from "app/context";
import { useContainerDimensions } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageMasonry.module.scss";


type ImageMasonryType = {
  imageSize?: number;
  images: ImageOrSummary[];
  loadMore: () => void;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef?: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageMasonry({
  imageSize = 300,
  images,
  loadMore,
  containerRef,
  scrollRootRef,
  imageItemMode
}: ImageMasonryType)
{
  const [ hostRef, hostRefRectangle ] = useResizeObserver();
  const { height: containerHeight } = useContainerDimensions(containerRef);
  const [ , addModal, removeModal ] = useActionModalContext();

  const imagesRef = useRef<ImageOrSummary[]>(images);
  imagesRef.current = images;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleOnClick = useCallback((image: ImageOrSummary): void =>
  {
    const id = addModal({
      component: (
        <ImageDetail
          image={image}
          images={imagesRef.current}
          viewMode="masonry"
          onClose={() =>
          {
            removeModal(id);
          }}
        />
      ),
      isStackable: true,
      withCloseButton: false,
      fullScreen: true
    });
  }, [ addModal, removeModal ]);

  useEffect(() =>
  {
    const root = scrollRootRef?.current;
    if (sentinelRef.current === null || root === undefined || containerHeight === undefined)
    {
      return;
    }
    const factor = 3;
    observerRef.current = new IntersectionObserver(
      (entries) =>
      {
        if (entries[0].isIntersecting)
        {
          loadMore();
        }
      },
      {
        root,
        threshold: 0,
        rootMargin: `0px 0px ${containerHeight * factor}px 0px`
      }
    );
    observerRef.current.observe(sentinelRef.current);
    return () =>
    {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [ scrollRootRef, loadMore, images.length, containerHeight ]);

  const roundedContainerWidth = Math.round(hostRefRectangle.width);

  const sizes: [MasonrySizing, ...MasonrySizing[]] = useMemo<[MasonrySizing, ...MasonrySizing[]]>(() =>
  {
    const gutter = 10;
    const approximateWidth = imageSize;
    const columns = Math.max(1, Math.floor(roundedContainerWidth / approximateWidth));
    const remainingSpace = roundedContainerWidth - (columns * approximateWidth) - ((columns - 1) * gutter);
    const columnWidth = approximateWidth + Math.floor(remainingSpace / columns);
    return [{ columns, gutter, columnWidth }];
  }, [ roundedContainerWidth, imageSize ]);

  const renderItem = useCallback(({ columnWidth }: MasonrySizing, index: number): ReactElement =>
  {
    const image = images[index];
    return (
      <ImageItem
        key={image.id}
        image={image}
        width={columnWidth as number}
        mode={imageItemMode}
        overlay={"caption" in image ? (image as ImageWithCaption).caption : undefined}
        viewMode="masonry"
        onClick={handleOnClick}
      />
    );
  }, [ images, imageItemMode, handleOnClick ]);

  if (images.length === 0)
  {
    return null;
  }

  return (
    <div ref={hostRef} className={style.host}>
      {roundedContainerWidth > 0 && (
        <MasonryLayout
          sizes={sizes}
          items={images}
          renderItem={renderItem}
          loadMore={loadMore}
          pack={true}
          pageSize={images.length}
          className={style.masonry}
        />
      )}
      <div ref={sentinelRef} className={style.sentinel}/>
    </div>
  );
}
