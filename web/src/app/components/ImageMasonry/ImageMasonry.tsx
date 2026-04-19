import React, { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Overlay } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";
import MasonryLayout, { MasonrySizing } from "react-fast-masonry";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { useEscapeKey, useImageNavigation } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageMasonry.module.scss";


type ImageMasonryType = {
  imageSize?: number;
  images: ImageOrSummary [];
  onSelectedImage?: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerRef?: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageMasonry({
  imageSize = 300,
  images,
  onSelectedImage,
  loadMore,
  containerRef,
  imageItemMode,
}: ImageMasonryType) {
  const [hostRef, hostRefRectangle] = useResizeObserver();
  const showImageVisualizer = useImageVisualizerContext();
  const navigation = useImageNavigation();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    navigation.setSelectedImage(image);
    if (onSelectedImage !== undefined) {
      onSelectedImage(image);
    }
  }, [images, onSelectedImage, navigation]);
  const portalRef = useRef<HTMLDivElement>(null);
  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));

  useEffect(() => {
    if (containerRef !== undefined) {
      navigation.setImages(images);
    }
  }, [images]);

  const handleOnClick = useCallback((image: ImageOrSummary) => {
    if (containerRef === undefined) {
      showImageVisualizer({ selectedImage: image, images });
    }
    else {
      setSelectedImageWrapper(image);
    }
  }, [images]);

  const handleOnClose = useCallback(() => {
    setSelectedImageWrapper((undefined));
  }, []);

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
              caption={(images[index] as ImageWithCaption).caption}
              width={columnWidth as number}
              mode={imageItemMode}
              onClick={handleOnClick}
            />)}
          loadMore={loadMore}
          pack={true}
          awaitMore={true}
          pageSize={20}
          className={style.masonry}
        />
        }
        {containerRef !== undefined && createPortal(
          navigation.selectedImage && <div ref={portalRef} className={style.visualizedImage}>
            <Overlay
              color="#000"
              backgroundOpacity={1}
              zIndex={0}
            >
              <ImageDetail
                image={navigation.selectedImage}
                onClose={handleOnClose}
                withNavigation={navigation}
              />
            </Overlay>
          </div>,
          containerRef.current
        )}
      </div>
    )
  );
}
