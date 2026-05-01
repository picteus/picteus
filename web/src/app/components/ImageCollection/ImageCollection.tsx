import React, { useEffect, useRef, useState } from "react";

import { ImageSummary } from "@picteus/ws-client";

import { ImageItemMode } from "types";
import { notifyApiCallError } from "utils";
import { ImageService } from "app/services";
import { ImageMasonry } from "app/components";

import style from "./ImageCollection.module.scss";


type ImageCollectionType = { imageIds: string[] };

export default function ImageCollection({imageIds}: ImageCollectionType) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageSummary[]>();

  useEffect(() => {
    async function load() {
      try
      {
        const result = await ImageService.searchSummaries({ filter: { origin: { kind: "images", ids: imageIds } } });
        setImages(result.items);
      }
      catch (error) {
        notifyApiCallError(error, "An error occurred while trying to retrieve the images");
      }
    }
    void load();
  }, [imageIds]);

  // TODO: find a way to limit the number of images displayed
  return (<div ref={containerRef} className={style.style}>
    {images && <ImageMasonry
      imageSize={100}
      images={images}
      loadMore={() => {
      }}
      containerRef={containerRef}
      displayDetailInContainer={false}
      imageItemMode={ImageItemMode.PASSIVE}
    />}
    </div>
  );
}
