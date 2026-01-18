import { useEffect, useRef, useState } from "react";
import { Stack, Text } from "@mantine/core";
import { Image } from "@picteus/ws-client";
import { ImageMasonry } from "app/components";
import { useContainerDimensions } from "app/hooks";
import { ImageService } from "app/services";

type MasonryVisualizerType = {
  description: string;
  imageIds: Array<{ imageId: string }>;
};

export default function MasonryVisualizer({
  description,
  imageIds,
}: MasonryVisualizerType) {
  const containerRef = useRef();
  const containerWidth = useContainerDimensions(containerRef);
  const [images, setImages] = useState<Image[]>([]);

  async function load() {
    const _images: Image[] = [];
    for (const image of imageIds) {
      const _image = await ImageService.get({ id: image.imageId });
      if (_image) {
        _images.push(_image);
      }
    }
    setImages(_images);
  }

  useEffect(() => {
    void load();
  }, []);

  function renderContent() {
    if (containerRef?.current && images.length > 0) {
      return (
        <Stack>
          <Text>{description}</Text>
          <ImageMasonry
            keyPrefix="masonryVisualizerImages"
            containerWidth={containerWidth}
            data={{
              imageSummaries: images,
              currentPage: 1,
              total: images.length,
            }}
            loadMore={() => {}}
          />
        </Stack>
      );
    }
  }

  return <div ref={containerRef}>{renderContent()}</div>;
}
