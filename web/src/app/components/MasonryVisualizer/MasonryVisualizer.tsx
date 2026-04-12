import { useEffect, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import { Alert, Stack, Text } from "@mantine/core";

import { Image } from "@picteus/ws-client";

import { DialogContent } from "types";
import { ImageMasonry } from "app/components";
import { ImageService } from "app/services";


type MasonryVisualizerType = {
  content: DialogContent;
  imageIds: Array<{ imageId: string }>;
  containerWidth: number;
};

export default function MasonryVisualizer({
  content,
  imageIds,
  containerWidth,
}: MasonryVisualizerType) {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
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

    void load();
  }, [imageIds]);

  return (images.length > 0 && <Stack>
      <Text>{content.description}</Text>
      {content.details && <Alert color="blue" icon={<IconInfoCircle />}>{content.details}</Alert>}
      <ImageMasonry
        containerWidth={containerWidth}
        data={images}
        loadMore={() => {}}
      />
    </Stack>
  );
}
