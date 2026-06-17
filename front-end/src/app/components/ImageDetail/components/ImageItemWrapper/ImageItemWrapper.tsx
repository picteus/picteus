import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Loader, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageItemWrapper.module.scss";


type ImageItemWrapperType = {
  imageId: string;
  edge: number;
  viewMode: ViewMode;
}

export default function ImageItemWrapper({ imageId, edge, viewMode }: ImageItemWrapperType)
{
  const [t] = useTranslation();
  const [image, setImage] = useState<Image>(undefined);
  const [error, setError] = useState<boolean>(false);
  const [, addModal, removeModal] = useActionModalContext();

  useEffect(() =>
  {
    ImageService.get({ id: imageId }).then((parentImage: Image) => setImage(parentImage)).catch(() => setError(true));
  }, [imageId]);

  const handleOnClick = useCallback((image: ImageOrSummary): void =>
  {
    const id = addModal({
      component: (
        <ImageDetail
          image={image}
          images={[image]}
          viewMode={viewMode}
          onClose={() =>
          {
            removeModal(id);
          }}
        />),
      isStackable: true,
      withCloseButton: false,
      fullScreen: true
    });
  }, [viewMode]);

  if (error)
  {
    return <Box w={edge} h={edge}>
      <Alert variant="outline" color="red" title={<Text size="xs">{t("errors.imageNotAvailable")}</Text>}
             icon={<IconInfoCircle/>} classNames={{ root: style.root, wrapper: style.root }}
             style={{ width: edge, height: edge }}/>
    </Box>;
  }

  return image === undefined ? <Loader size={edge}/> :
    <ImageItem image={image} width={edge} height={edge} mode={ImageItemMode.PASSIVE} viewMode={viewMode}
               onClick={handleOnClick}/>;
}
