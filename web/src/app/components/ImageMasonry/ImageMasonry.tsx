import { useEffect, useMemo, useRef, useState } from "react";
import { ImageSummary } from "@picteus/ws-client";
import MasonryLayout, { MasonrySizing } from "react-fast-masonry";

import { ImageItemMode, ImageMasonryDataType, ImageSummaryWithCaption } from "types";
import { useImageVisualizerContext } from "app/context"; // Import context
import { ImageItem } from "./components";
import style from "./ImageMasonry.module.scss";

type ImageMasonryType = {
  keyPrefix?: string;
  imageSize?: number;
  data: ImageMasonryDataType;
  loadMore: () => void;
  containerWidth: number;
  imageItemMode?: ImageItemMode;
};

export default function ImageMasonry({
  keyPrefix = "gallery",
  imageSize = 300,
  imageItemMode,
  data,
  loadMore,
  containerWidth,
}: ImageMasonryType) {
  const [localData, setLocalData] = useState<
    ImageSummary[] | ImageSummaryWithCaption[]
  >([]);
  const queueRef = useRef<ImageSummary[][]>([]); // Queue for holding image summaries
  const [isProcessing, setIsProcessing] = useState(false); // To track if an update is being processed

  const [, setImageVisualizerContext] = useImageVisualizerContext();

  function processQueue() {
    if (queueRef.current.length === 0) {
      setIsProcessing(false);
      return;
    }
    setIsProcessing(true);
    const nextBatch = queueRef.current.shift();

    if (nextBatch) {
      setLocalData((prevData) => {
        if (data.currentPage === 1) {
          // Reset the data if it's the first page
          return nextBatch;
        }
        // Otherwise, append the new images
        return [...prevData, ...nextBatch];
      });

      setTimeout(() => processQueue(), 0);
    }
  }

  useEffect(() => {
    if (data.imageSummaries?.length) {
      queueRef.current.push(data.imageSummaries);

      if (!isProcessing) {
        processQueue();
      }
    }
  }, [data]);

  const sizes: [MasonrySizing, ...MasonrySizing[]] = useMemo(() => {
    if (containerWidth === 0) {
      containerWidth = window.innerWidth;
    }
    const gutter = 10;
    const approximateWidth = imageSize;
    const columns = Math.floor(containerWidth / approximateWidth);
    const remainingSpace =
      containerWidth - columns * approximateWidth - gutter * (columns - 1) - 60;
    const columnWidth = approximateWidth + Math.floor(remainingSpace / columns);
    return [{ columns, gutter, columnWidth: columnWidth }];
  }, [containerWidth]);

  return (
    localData?.length !== 0 && (
      <MasonryLayout
        sizes={sizes}
        items={localData}
        renderItem={({ columnWidth }, index: number) => {
          return (
            <ImageItem
              key={keyPrefix + localData[index].id}
              width={columnWidth as number}
              mode={imageItemMode}
              onClick={() =>
                setImageVisualizerContext({
                  prevAndNextIds: localData.map((image) => image.id),
                  imageSummary: localData[index],
                })
              }
              imageSummary={localData[index]}
              caption={(localData[index] as ImageSummaryWithCaption).caption}
            />
          );
        }}
        loadMore={loadMore}
        pack={true}
        awaitMore={true}
        pageSize={20}
        className={style.masonry}
      />
    )
  );
}
