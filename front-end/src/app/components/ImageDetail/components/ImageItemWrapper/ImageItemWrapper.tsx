import React, { ReactElement, useCallback } from "react";
import { Alert, Box, Loader, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useImage, useImageDetailModal } from "app/hooks";
import { ImageItem } from "app/components";

import style from "./ImageItemWrapper.module.scss";


type ImageItemWrapperType =
  {
    readonly imageId: string;
    readonly edge?: number;
    readonly viewMode: ViewMode;
  };

export default function ImageItemWrapper({ imageId, edge = 100, viewMode }: ImageItemWrapperType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: image, isError, isLoading } = useImage(imageId);
  const openImageDetailModal = useImageDetailModal();

  const handleOnClick = useCallback((image: ImageOrSummary): void =>
  {
    openImageDetailModal({
      image,
      viewMode
    });
  }, [ openImageDetailModal, viewMode ]);

  if (isError)
  {
    return <Box w={edge} h={edge}>
      <Alert variant="outline" color="red" title={<Text size="xs">{t("errors.imageNotAvailable")}</Text>}
             icon={<IconInfoCircle/>} classNames={{ root: style.root, wrapper: style.root }}
             style={{ width: edge, height: edge }}/>
    </Box>;
  }

  return isLoading || !image ? <Loader size={edge}/> :
    <ImageItem image={image} width={edge} height={edge} mode={ImageItemMode.PASSIVE} viewMode={viewMode}
               onClick={handleOnClick}/>;
}
