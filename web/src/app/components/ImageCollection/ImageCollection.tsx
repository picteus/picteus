import React, { useEffect, useState } from "react";


import { ImageSummary } from "@picteus/ws-client";

import { ImageItemMode } from "types";
import { ImageService } from "app/services";
import { ImageMasonry } from "app/components";
import { notifyApiCallError } from "../../../utils";


type ImageCollectionType = { imageIds: string[] };

export default function ImageCollection({imageIds}: ImageCollectionType) {
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
  return (
    images && <ImageMasonry
      imageSize={100}
      data={images}
      loadMore={() => {
      }}
      imageItemMode={ImageItemMode.PASSIVE}
    />
  );
}
