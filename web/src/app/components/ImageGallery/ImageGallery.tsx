import { useEffect, useMemo } from "react";
import { Grid } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { ImageItem } from "app/components";


type ImageGalleryType = {
  imageSize?: number;
  data: ImageOrSummary [];
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
  const [, setImageVisualizerContext] = useImageVisualizerContext();
  const { ref, entry } = useIntersection({ root: null, threshold: 0.1 });

  useEffect(() => {
    if (entry?.isIntersecting === true)
    {
      loadMore();
    }
  }, [entry?.isIntersecting, loadMore]);

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
