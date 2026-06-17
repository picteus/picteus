import React, { useCallback, useEffect, useRef, useState } from "react";
import { Flex } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary } from "types";
import { NotificationsService } from "utils";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImagesCollection.module.scss";


type ImageCollectionType = {
  imageIds: string[]
};

export default function ImagesCollection({ imageIds }: ImageCollectionType)
{
  const edge = 100;
  const containerRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<ImageSummary[]>([]);
  const [, addModal, removeModal] = useActionModalContext();

  useEffect(() =>
  {
    async function load()
    {
      try
      {
        const result = await ImageService.searchSummaries({ filter: { origin: { kind: "images", ids: imageIds } } });
        setImages(result.items);
      }
      catch (error)
      {
        NotificationsService.apiCallError(error, "An error occurred while retrieving the images");
      }
    }

    void load();
  }, [imageIds]);

  const handleOnClick = useCallback((image: ImageOrSummary): void =>
  {
    const id = addModal({
      component: (
        <ImageDetail
          image={image}
          images={images}
          viewMode="gallery"
          onClose={() =>
          {
            removeModal(id);
          }}
        />),
      isStackable: true,
      withCloseButton: false,
      fullScreen: true
    });
  }, [images]);

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
