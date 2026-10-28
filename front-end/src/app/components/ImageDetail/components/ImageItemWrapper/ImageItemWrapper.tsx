import React, { type ReactElement, useCallback } from "react";
import { Alert, Box, Loader, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useImage, useImageDetailModal } from "app/hooks";
import { ImageItem } from "app/components";

import style from "./ImageItemWrapper.module.scss";


export type ImageItemWrapperPropsType =
  {
    readonly idOrImage: string | ImageOrSummary;
    readonly edge?: number;
    readonly viewMode: ViewMode;
  };

export default function ImageItemWrapper({
  idOrImage,
  edge = 100,
  viewMode
}: ImageItemWrapperPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const isImageId = typeof idOrImage === "string";
  const {
    data: fetchedImage,
    isError,
    isLoading
  } = useImage(isImageId ? idOrImage : undefined, { enabled: isImageId });
  const openImageDetailModal = useImageDetailModal();
  const image = isImageId ? fetchedImage : idOrImage;

  const handleOnClick = useCallback((selectedImage: ImageOrSummary): void =>
  {
    openImageDetailModal({
      image: selectedImage,
      viewMode
    });
  }, [ openImageDetailModal, viewMode ]);

  if (isImageId && isError)
  {
    return (
      <Box w={edge} h={edge}>
        <Alert
          variant="outline"
          color="red"
          title={<Text size="xs">{t("errors.imageNotAvailable")}</Text>}
          icon={<IconInfoCircle/>}
          classNames={{ root: style.root, wrapper: style.root }}
          style={{ width: edge, height: edge }}
        />
      </Box>
    );
  }

  return (isImageId && isLoading) || !image
    ? <Loader size={edge}/>
    : <ImageItem image={image} width={edge} height={edge} mode={ImageItemMode.PASSIVE} viewMode={viewMode} onClick={handleOnClick}/>;
}
