import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useActionModalContext } from "app/context";
import { useContainerDimensions } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageGallery.module.scss";


type ImageGalleryType = {
  imageSize?: number;
  images: ImageOrSummary [];
  loadMore: () => void;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageGallery({
  imageSize = 250,
  images,
  loadMore,
  containerRef,
  scrollRootRef,
  imageItemMode,
}: ImageGalleryType) {
  const gutter = 10;
  const [hostRef, hostRefRectangle] = useResizeObserver();
  const { height: containerHeight } = useContainerDimensions(containerRef);
  const [sentinel, setSentinel] = useState<HTMLHeadingElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<() => void>(loadMore);
  const [, addModal, removeModal] = useActionModalContext();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    if (image !== undefined) {
      const id = addModal({
        component: (
          <ImageDetail
            image={image}
            images={images}
            viewMode="gallery"
            onClose={() => {
              removeModal(id);
            }}
          />),
        isStackable: true,
        withCloseButton: false,
        fullScreen: true
      });
    }
  }, [images]);

  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  const sentinelRef = useCallback((node: HTMLHeadingElement | null) => {
    if (node !== null) {
      setSentinel(node);
    }
  }, []);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (sentinel === null || root === null) {
      return;
    }
    const factor = 5;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting === true) {
          loadMoreRef.current();
        }
      },
      {
        root,
        threshold: 0,
        rootMargin: `0px 0px ${containerHeight * factor}px 0px`,
      }
    );
    observerRef.current.observe(sentinel);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [containerHeight, scrollRootRef, sentinel]);

  useEffect(() => {
    const observer = observerRef.current;
    if (sentinel === null || observer === null) {
      return;
    }
    observer.unobserve(sentinel);
    observer.observe(sentinel);
  }, [images]);

  const { columns, columnWidth } = useMemo(() => {
    const approximateWidth = imageSize;
    const containerWidth = Math.round(hostRefRectangle.width);
    const columns = Math.max(1, Math.floor(containerWidth / approximateWidth));
    const remainingSpace = containerWidth - columns * approximateWidth - gutter * (columns - 1);
    return { columns, columnWidth: approximateWidth + Math.floor(remainingSpace / columns)};
  }, [imageSize, hostRefRectangle]);

  const renderedImages = useMemo(()=> images.map((image) => (
    <Grid.Col span={1} key={image.id}>
      <ImageItem
        image={image}
        width={columnWidth}
        height={columnWidth}
        mode={imageItemMode}
        overlay={"caption" in image ? (image as ImageWithCaption).caption : undefined}
        viewMode="gallery"
        onClick={setSelectedImageWrapper}
      />
    </Grid.Col>
  )), [images, columnWidth]);

  const renderedGrid = useMemo(() => (
    <Grid columns={columns} gap={gutter}>
      {renderedImages}
      <Grid.Col span={columns}>
        <div ref={sentinelRef} className={style.sentinel} />
      </Grid.Col>
    </Grid>
  ), [renderedImages, columns]);

  return (
    images.length !== 0 && columns > 0 && (
      <div ref={hostRef} className={style.host}>
        {renderedGrid}
      </div>
    )
  );
}
