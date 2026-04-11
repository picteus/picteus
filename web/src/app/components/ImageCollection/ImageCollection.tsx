import React, { useEffect, useRef, useState } from "react";


import { ImageSummary } from "@picteus/ws-client";

import { ImageItemMode } from "types";
import { useContainerDimensions } from "app/hooks";
import { ImageService } from "app/services";
import { ImageMasonry } from "app/components";


type ImageCollectionType = { imageIds: string[] };

export default function ImageCollection({imageIds}: ImageCollectionType) {
  const [images, setImages] = useState<ImageSummary[]>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useContainerDimensions(containerRef);

  useEffect(() => {
    async function load() {
      // TODO: handle the exceptions!
      const result = await ImageService.searchSummaries({ filter: { origin: { kind: "images", ids: imageIds } } });
      setImages(result.items);
    }
    void load();
  }, [imageIds]);

  // TODO: find a way to limit the number of images displayed
  return (
    <div ref={containerRef}>
      {containerRef.current && images && <ImageMasonry
        imageSize={100}
        data={images}
        loadMore={() => {
        }}
        containerWidth={width}
        containerRef={containerRef}
        imageItemMode={ImageItemMode.PASSIVE}
      />
      }
    </div>);
}
