import React, { ReactElement, useCallback } from "react";
import { Alert, Box, Loader, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useActionModalContext } from "app/context";
import { useImage } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

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
  const [ , addModal, removeModal ] = useActionModalContext();

  const handleOnClick = useCallback((image: ImageOrSummary): void =>
  {
    const id = addModal({
      component: (
        <ImageDetail
          image={image}
          images={[ image ]}
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
  }, [ addModal, removeModal, viewMode ]);

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
