import React, { useCallback, useEffect, useRef, useState } from "react";
import { Flex } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary } from "types";
import { notifyApiCallError } from "utils";
import { useImageVisualizerContext } from "app/context";
import { ImageService } from "app/services";
import { ImageItem } from "app/components";

import style from "./ImagesCollection.module.scss";


type ImageCollectionType = { imageIds: string[] };

export default function ImagesCollection({imageIds}: ImageCollectionType) {
  const edge = 100;
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageSummary[]>([]);
  const showImageVisualizer = useImageVisualizerContext();

  useEffect(() => {
    async function load() {
      try {
        const result = await ImageService.searchSummaries({ filter: { origin: { kind: "images", ids: imageIds } } });
        setImages(result.items);
      }
      catch (error) {
        notifyApiCallError(error, "An error occurred while retrieving the images");
      }
    }
    void load();
  }, [imageIds]);

  const handleOnClick = useCallback((image: ImageOrSummary): void => {
    showImageVisualizer({ selectedImage: image, images, viewMode: "gallery" });
  }, []);

  return (<div ref={containerRef} className={style.container}>
      <Flex className={style.content} align="center" gap={10}>
        {images.map((image) => (
          <ImageItem
            key={image.id}
            image={image}
            height={edge}
            width={edge}
            mode={ImageItemMode.PASSIVE}
            viewMode="gallery"
            onClick={handleOnClick}
          />
        ))}
      </Flex>
    </div>
  );
}
