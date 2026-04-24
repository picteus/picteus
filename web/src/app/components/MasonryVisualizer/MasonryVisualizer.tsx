import { useEffect, useState } from "react";
import { Alert, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { Image, SearchImageResult } from "@picteus/ws-client";

import { DialogContent, FilterOrCollectionId } from "types";
import { ImageMasonry } from "app/components";
import { ImageService } from "app/services";


type MasonryVisualizerType = {
  content: DialogContent;
  filterOrCollectionId: FilterOrCollectionId;
};

export default function MasonryVisualizer({ content, filterOrCollectionId }: MasonryVisualizerType) {
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    async function load() {
      const result: SearchImageResult = await ImageService.searchImages(filterOrCollectionId);
      setImages(result.items);
    }

    void load();
  }, [filterOrCollectionId]);

  return (images.length > 0 && <Stack>
      <Text>{content.description}</Text>
      {content.details && <Alert color="blue" icon={<IconInfoCircle />}>{content.details}</Alert>}
      <ImageMasonry
        images={images}
        loadMore={() => {}}
      />
    </Stack>
  );
}
