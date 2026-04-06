import { useMemo } from "react";
import MasonryLayout, { MasonrySizing } from "react-fast-masonry";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { ImageItem } from "app/components";

import style from "./ImageMasonry.module.scss";


type ImageMasonryType = {
  imageSize?: number;
  data: ImageOrSummary [];
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
  const [, setImageVisualizerContext] = useImageVisualizerContext();

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
    data.length !== 0 && containerWidth > 0 && (
      <MasonryLayout
        sizes={sizes}
        items={data}
        renderItem={({ columnWidth }, index: number) => {
          return (
            <ImageItem
              key={data[index].id}
              width={columnWidth as number}
              mode={imageItemMode}
              onClick={() =>
                setImageVisualizerContext({
                  prevAndNextIds: data.map((image) => image.id),
                  imageSummary: data[index],
                })
              }
              image={data[index]}
              caption={(data[index] as ImageWithCaption).caption}
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
