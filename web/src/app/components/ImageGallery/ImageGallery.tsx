import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "@mantine/core";

import { ImageItemMode, ImageOrSummary } from "types";
import { useImageVisualizerContext } from "app/context";
import { ImageItem } from "app/components";


type ImageGalleryType = {
  imageSize?: number;
  data: ImageOrSummary [];
  loadMore: () => void;
  containerWidth: number;
  containerHeight: number;
  imageItemMode?: ImageItemMode;
  scrollRootRef: RefObject<HTMLDivElement>;
};

export default function ImageGallery({
  imageSize = 250,
  imageItemMode,
  data,
  loadMore,
  containerWidth,
  containerHeight,
  scrollRootRef,
}: ImageGalleryType) {
  const [, setImageVisualizerContext] = useImageVisualizerContext();
  const [sentinel, setSentinel] = useState<HTMLHeadingElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<() => void>(loadMore);

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
      <Grid gutter={gutter}>
        {data.map((item) => (
          <Grid.Col span="content" key={item.id}>
            <ImageItem
              width={columnWidth}
              height={columnWidth}
              mode={imageItemMode}
              onClick={() =>
                setImageVisualizerContext({
                  prevAndNextIds: data.map((image) => image.id),
                  imageSummary: item,
                })
              }
              image={item}
            />
          </Grid.Col>
        ))}
        <Grid.Col span={12}>
          <div ref={sentinelRef} style={{ width: "100%", height: 1 }} />
        </Grid.Col>
      </Grid>
    )
  );
}
