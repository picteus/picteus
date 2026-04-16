import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Grid, Overlay } from "@mantine/core";

import { ImageItemMode, ImageOrSummary } from "types";
import { useEscapeKey, useImageNavigation } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageGallery.module.scss";


type ImageGalleryType = {
  imageSize?: number;
  images: ImageOrSummary [];
  onSelectedImage: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerWidth: number;
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
  containerWidth,
  containerHeight,
  containerRef,
  scrollRootRef,
  imageItemMode,
}: ImageGalleryType) {
  const [sentinel, setSentinel] = useState<HTMLHeadingElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<() => void>(loadMore);
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    setSelectedImage(image);
    onSelectedImage(image);
  }, [setSelectedImage, onSelectedImage]);
  const navigation = useImageNavigation(selectedImage, setSelectedImageWrapper);
  const portalRef = useRef<HTMLDivElement>(null);
  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));

  useEffect(() => {
    navigation.setImages(images, selectedImage);
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

  const gutter = 10;
  const columnWidth = useMemo(() => {
    const approximateWidth = imageSize;
    const columns = Math.max(1, Math.floor(containerWidth / approximateWidth));
    const remainingSpace = containerWidth - columns * approximateWidth - gutter * (columns - 1) - 60;
    return approximateWidth + Math.floor(remainingSpace / columns);
  }, [containerWidth, imageSize]);

  return (
    images.length !== 0 && containerWidth > 0 && (
      <>
        <Grid gap={gutter}>
          {images.map((item) => (
            <Grid.Col span="content" key={item.id}>
              <ImageItem
                image={item}
                width={columnWidth}
                height={columnWidth}
                mode={imageItemMode}
                onClick={() => setSelectedImageWrapper(item)}
              />
            </Grid.Col>
          ))}
          <Grid.Col span={12}>
            <div ref={sentinelRef} className={style.sentinel} />
          </Grid.Col>
        </Grid>
        {createPortal(
          selectedImage && <div ref={portalRef} className={style.visualizedImage}>
            <Overlay
              color="#000"
              backgroundOpacity={1}
              zIndex={0}
            >
              <ImageDetail
                image={selectedImage}
                onClose={() => setSelectedImageWrapper((undefined))}
                hasPrevious={navigation.hasPrevious}
                hasNext={navigation.hasNext}
                onPrevious={navigation.onPrevious}
                onNext={navigation.onNext}
              />
            </Overlay>
          </div>,
          containerRef.current
        )}</>
    )
  );
}
