import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Grid, Overlay } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";

import { ImageItemMode, ImageOrSummary } from "types";
import { useEscapeKey, useImageNavigation } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageGallery.module.scss";


type ImageGalleryType = {
  imageSize?: number;
  images: ImageOrSummary [];
  onSelectedImage: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerHeight: number;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageGallery({
  imageSize = 250,
  images,
  onSelectedImage,
  loadMore,
  containerHeight,
  containerRef,
  scrollRootRef,
  imageItemMode,
}: ImageGalleryType) {
  const gutter = 10;
  const [hostRef, hostRefRectangle] = useResizeObserver();
  const [sentinel, setSentinel] = useState<HTMLHeadingElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<() => void>(loadMore);
  const navigation = useImageNavigation();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    navigation.setSelectedImage(image);
    onSelectedImage(image);
  }, [onSelectedImage, navigation]);
  const portalRef = useRef<HTMLDivElement>(null);
  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));

  useEffect(() => {
    navigation.setImages(images);
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
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting === true) {
          loadMoreRef.current();
        }
      },
      {
        root,
        threshold: 0,
        rootMargin: `0px 0px ${containerHeight * 5}px 0px`,
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

  const handleOnClick = useCallback((image: ImageOrSummary): void => {
    setSelectedImageWrapper(image);
  }, []);

  const { columns, columnWidth } = useMemo(() => {
    const approximateWidth = imageSize;
    const containerWidth = Math.round(hostRefRectangle.width);
    const columns = Math.max(1, Math.floor(containerWidth / approximateWidth));
    const remainingSpace = containerWidth - columns * approximateWidth - gutter * (columns - 1);
    return { columns, columnWidth: approximateWidth + Math.floor(remainingSpace / columns)};
  }, [imageSize, hostRefRectangle]);

  console.debug("ImageGallery");

  const renderedImages = useMemo(()=> images.map((item) => (
    <Grid.Col span={1} key={item.id}>
      <ImageItem
        image={item}
        width={columnWidth}
        height={columnWidth}
        mode={imageItemMode}
        onClick={handleOnClick}
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
        {createPortal(
          navigation.selectedImage && <div ref={portalRef} className={style.visualizedImage}>
            <Overlay
              color="#000"
              backgroundOpacity={1}
              zIndex={0}
            >
              <ImageDetail
                image={navigation.selectedImage}
                onClose={() => setSelectedImageWrapper((undefined))}
                hasPrevious={navigation.hasPrevious}
                hasNext={navigation.hasNext}
                onPrevious={navigation.onPrevious}
                onNext={navigation.onNext}
              />
            </Overlay>
          </div>,
          containerRef.current
        )}</div>
    )
  );
}
