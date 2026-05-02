import React, { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Overlay } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";
import MasonryLayout, { MasonrySizing } from "react-fast-masonry";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { useContainerDimensions, useEscapeKey, useImageNavigation } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageMasonry.module.scss";


type ImageMasonryType = {
  imageSize?: number;
  images: ImageOrSummary [];
  onSelectedImage?: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerRef: RefObject<HTMLElement>;
  scrollRootRef?: RefObject<HTMLElement>;
  displayDetailInContainer: boolean;
  imageItemMode?: ImageItemMode;
};

export default function ImageMasonry({
  imageSize = 300,
  images,
  onSelectedImage,
  loadMore,
  containerRef,
  scrollRootRef,
  displayDetailInContainer,
  imageItemMode,
}: ImageMasonryType) {
  const [hostRef, hostRefRectangle] = useResizeObserver();
  const { height: containerHeight } = useContainerDimensions(containerRef);
  const showImageVisualizer = useImageVisualizerContext();
  const navigation = useImageNavigation();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    navigation.setSelectedImage(image);
    if (onSelectedImage !== undefined) {
      onSelectedImage(image);
    }
  }, [onSelectedImage, navigation]);
  const portalRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));

  useEffect(() => {
    const root = scrollRootRef?.current;
    if (sentinelRef.current === null || root === undefined) {
      return;
    }
    const factor = 3;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root,
        threshold: 0,
        rootMargin: `0px 0px ${containerHeight * factor}px 0px`
      });
    observerRef.current.observe(sentinelRef.current);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [scrollRootRef, loadMore, images.length]);

  useEffect(() => {
    if (displayDetailInContainer === true) {
      navigation.setImages(images);
    }
  }, [images]);

  const handleOnClick = useCallback((image: ImageOrSummary) => {
    if (displayDetailInContainer === false) {
      showImageVisualizer({ selectedImage: image, images, viewMode: "masonry" });
    }
    else {
      setSelectedImageWrapper(image);
    }
  }, [images, setSelectedImageWrapper]);

  const handleOnClose = useCallback(() => {
    setSelectedImageWrapper((undefined));
  }, [setSelectedImageWrapper]);

  const sizes: [MasonrySizing, ...MasonrySizing[]] = useMemo<[MasonrySizing, ...MasonrySizing[]]>(() => {
    const gutter = 10;
    const approximateWidth = imageSize;
    const containerWidth = Math.round(hostRefRectangle.width);
    const columns = Math.floor(containerWidth / approximateWidth);
    const remainingSpace = containerWidth - (columns * approximateWidth) - ((columns - 1) * gutter);
    const columnWidth = approximateWidth + Math.floor(remainingSpace / columns);
    return [{ columns, gutter, columnWidth }];
  }, [hostRefRectangle, imageSize]);

  return (
    images.length > 0 && (
      <div ref={hostRef} className={style.host}>
        {hostRef && hostRefRectangle.width > 0 && <MasonryLayout
          sizes={sizes}
          items={images}
          renderItem={({ columnWidth }, index: number) =>
            (<ImageItem
              key={images[index].id}
              image={images[index]}
              width={columnWidth as number}
              mode={imageItemMode}
              overlay={"caption" in images[index] ? (images[index] as ImageWithCaption).caption : undefined}
              viewMode="masonry"
              onClick={handleOnClick}
            />)}
          loadMore={loadMore}
          pack={true}
          pageSize={images.length}
          className={style.masonry}
        />
        }
        <div ref={sentinelRef} className={style.sentinel} />
        {displayDetailInContainer === true && createPortal(
          navigation.selectedImage && <div ref={portalRef} className={style.visualizedImage}>
            <Overlay
              color="#000"
              backgroundOpacity={1}
              zIndex={0}
            >
              <ImageDetail
                image={navigation.selectedImage}
                withNavigation={navigation}
                viewMode="masonry"
                onClose={handleOnClose}
              />
            </Overlay>
          </div>,
          containerRef.current
        )}
      </div>
    )
  );
}
