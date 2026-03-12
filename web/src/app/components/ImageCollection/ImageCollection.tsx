import React, { useEffect, useRef, useState } from "react";


import { ImageSummary } from "@picteus/ws-client";

import { ImageItemMode } from "../../../types";
import { useContainerDimensions } from "../../hooks";
import { ImageMasonry } from "../index.ts";
import { ImageService } from "../../services";


type ImageCollectionType = { imageIds: string[] };

export default function ImageCollection({imageIds}: ImageCollectionType) {
  const [images, setImages] = useState<ImageSummary[]>();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerDimensions(containerRef);

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
      {containerRef?.current && images && <ImageMasonry
        containerWidth={containerWidth}
        imageSize={100}
        imageItemMode={ImageItemMode.PASSIVE}
        loadMore={() => {
        }}
        data={{
          images,
          currentPage: 1,
          total: images.length
        }}
      />
      }
    </div>);
}
