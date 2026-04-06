import { useEffect, useMemo, useRef, useState } from "react";
import { Grid } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";

import { ImageExplorerDataType, ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { ImageItem } from "app/components/ImageMasonry/components";


type ImageGalleryType = {
  imageSize?: number;
  data: ImageExplorerDataType;
  loadMore: () => void;
  containerWidth: number;
  imageItemMode?: ImageItemMode;
};

export default function ImageGallery({
  imageSize = 250,
  imageItemMode,
  data,
  loadMore,
  containerWidth,
}: ImageGalleryType) {
  const [localData, setLocalData] = useState<ImageOrSummary[]>([]);
  const isFetchingRef = useRef<boolean>(false);
  const [, setImageVisualizerContext] = useImageVisualizerContext();
  const { ref, entry } = useIntersection({ root: null, threshold: 0.1 });

  useEffect(() => {
    if (entry?.isIntersecting === true) {
      if (isFetchingRef.current === false) {
        isFetchingRef.current = true;
        loadMore();
      }
    }
  }, [entry?.isIntersecting, loadMore]);

  useEffect(() => {
    isFetchingRef.current = false;
    setLocalData((prevData) => {
      if (data.currentPage === 1) {
        return data.images;
      }
      return [...prevData, ...data.images];
    });
  }, [data]);

  const gutter = 10;
  const columnWidth = useMemo(() => {
    const approximateWidth = imageSize;
    const columns = Math.max(1, Math.floor(containerWidth / approximateWidth));
    const remainingSpace = containerWidth - columns * approximateWidth - gutter * (columns - 1) - 60;
    return approximateWidth + Math.floor(remainingSpace / columns);
  }, [containerWidth, imageSize]);

  return (
    localData?.length !== 0 && containerWidth > 0 && (
      <Grid gutter={gutter}>
        {localData.map((item) => (
          <Grid.Col span="content" key={item.id}>
            <ImageItem
              width={columnWidth}
              height={columnWidth}
              mode={imageItemMode}
              onClick={() =>
                setImageVisualizerContext({
                  prevAndNextIds: localData.map((image) => image.id),
                  imageSummary: item,
                })
              }
              image={item}
              caption={(item as ImageWithCaption).caption}
            />
          </Grid.Col>
        ))}
        <Grid.Col span={12}>
          <div ref={ref} style={{ width: "100%", height: 20 }} />
        </Grid.Col>
      </Grid>
    )
  );
}
