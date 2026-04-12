import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Grid, Overlay } from "@mantine/core";

import { ImageItemMode, ImageOrSummary } from "types";
import { useImageNavigation, useKey } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageGallery.module.scss";

type ImageGalleryType = {
  imageSize?: number;
  data: ImageOrSummary [];
  onSelectedImage: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerWidth: number;
  containerHeight: number;
  containerRef: RefObject<HTMLDivElement>;
  scrollRootRef: RefObject<HTMLDivElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageGallery({
  imageSize = 250,
  data,
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
  }, [setSelectedImage]);
  const navigation = useImageNavigation(selectedImage, setSelectedImageWrapper);
  useKey("Escape", () => setSelectedImageWrapper(undefined));

  useEffect(() => {
    navigation.setImages(data, selectedImage);
  }, [data]);

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
  }, [data]);

  const gutter = 10;
  const columnWidth = useMemo(() => {
    const approximateWidth = imageSize;
    const columns = Math.max(1, Math.floor(containerWidth / approximateWidth));
    const remainingSpace = containerWidth - columns * approximateWidth - gutter * (columns - 1) - 60;
    return approximateWidth + Math.floor(remainingSpace / columns);
  }, [containerWidth, imageSize]);

  return (
    data.length !== 0 && containerWidth > 0 && (
      <>
        <Grid gutter={gutter}>
          {data.map((item) => (
            <Grid.Col span="content" key={item.id}>
              <ImageItem
                width={columnWidth}
                height={columnWidth}
                mode={imageItemMode}
                onClick={() => setSelectedImageWrapper(item)}
                image={item}
              />
            </Grid.Col>
          ))}
          <Grid.Col span={12}>
            <div ref={sentinelRef} className={style.sentinel} />
          </Grid.Col>
        </Grid>
        {createPortal(
          selectedImage && <div className={style.visualizedImage}>
            <Overlay
              color="#000"
              backgroundOpacity={1}
              zIndex={0}
            >
              <ImageDetail
                image={selectedImage}
                onClose={() => setSelectedImageWrapper((undefined))}
                hasPrevious={navigation.hasPrev}
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
