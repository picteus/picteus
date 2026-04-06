import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MasonryLayout, { MasonrySizing } from "react-fast-masonry";

import { ImageExplorerDataType, ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { ImageItem } from "app/components";
import style from "./ImageMasonry.module.scss";


type ImageMasonryType = {
  imageSize?: number;
  data: ImageExplorerDataType;
  loadMore: () => void;
  containerWidth: number;
  imageItemMode?: ImageItemMode;
};

export default function ImageMasonry({
  imageSize = 300,
  imageItemMode,
  data,
  loadMore,
  containerWidth,
}: ImageMasonryType) {
  const [localData, setLocalData] = useState<ImageOrSummary[]>([]);
  const isFetchingRef = useRef<boolean>(false);
  const [, setImageVisualizerContext] = useImageVisualizerContext();

  const loadMoreThrottled = useCallback(()=>{
    if (isFetchingRef.current === false) {
      isFetchingRef.current = true;
      loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    isFetchingRef.current = false;
    setLocalData((prevData) => {
      if (data.currentPage === 1) {
        return data.images;
      }
      return [...prevData, ...data.images];
    });
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
    localData.length !== 0 && containerWidth > 0 && (
      <MasonryLayout
        sizes={sizes}
        items={localData}
        renderItem={({ columnWidth }, index: number) => {
          return (
            <ImageItem
              key={localData[index].id}
              width={columnWidth as number}
              mode={imageItemMode}
              onClick={() =>
                setImageVisualizerContext({
                  prevAndNextIds: localData.map((image) => image.id),
                  imageSummary: localData[index],
                })
              }
              image={localData[index]}
              caption={(localData[index] as ImageWithCaption).caption}
            />
          );
        }}
        loadMore={loadMoreThrottled}
        pack={true}
        awaitMore={true}
        pageSize={20}
        className={style.masonry}
      />
    )
  );
}
