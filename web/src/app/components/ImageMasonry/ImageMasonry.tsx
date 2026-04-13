import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Overlay } from "@mantine/core";
import MasonryLayout, { MasonrySizing } from "react-fast-masonry";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { useEscapeKey, useImageNavigation } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageMasonry.module.scss";


type ImageMasonryType = {
  imageSize?: number;
  data: ImageOrSummary [];
  onSelectedImage?: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerWidth: number;
  containerRef?: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageMasonry({
  imageSize = 300,
  data,
  onSelectedImage,
  loadMore,
  containerWidth,
  containerRef,
  imageItemMode,
}: ImageMasonryType) {
  const [, setImageVisualizer] = useImageVisualizerContext();
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    setSelectedImage(image);
    if (onSelectedImage !== undefined) {
      onSelectedImage(image);
    }
  }, [setSelectedImage, onSelectedImage]);
  const navigation = useImageNavigation(selectedImage, setSelectedImageWrapper);
  const portalRef = useRef<HTMLDivElement>(null);
  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));

  useEffect(() => {
    if (containerRef !== undefined) {
      navigation.setImages(data, selectedImage);
    }
  }, [data]);

  const sizes: [MasonrySizing, ...MasonrySizing[]] = useMemo(() => {
    const gutter = 10;
    const approximateWidth = imageSize;
    const columns = Math.floor(containerWidth / approximateWidth);
    const remainingSpace =
      containerWidth - columns * approximateWidth - gutter * (columns - 1) - 60;
    const columnWidth = approximateWidth + Math.floor(remainingSpace / columns);
    return [{ columns, gutter, columnWidth: columnWidth }];
  }, [containerWidth]);

  return (
    data.length > 0 && containerWidth > 0 && (
      <>
        <MasonryLayout
          sizes={sizes}
          items={data}
          renderItem={({ columnWidth }, index: number) => {
            return (
              <ImageItem
                key={data[index].id}
                image={data[index]}
                caption={(data[index] as ImageWithCaption).caption}
                width={columnWidth as number}
                mode={imageItemMode}
                onClick={() => {
                  if (containerRef === undefined) {
                    setImageVisualizer({
                      selectedImage: data[index],
                      images: data
                    });
                  }
                  else {
                    setSelectedImageWrapper(data[index]);
                  }
                }}
              />
            );
          }}
          loadMore={loadMore}
          pack={true}
          awaitMore={true}
          pageSize={20}
          className={style.masonry}
        />
        {containerRef !== undefined && createPortal(
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
        )}
      </>
    )
  );
}
