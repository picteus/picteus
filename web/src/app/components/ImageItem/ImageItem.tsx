import React, { ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { ActionIcon, Checkbox, Flex, Menu, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageDimensions, ImageResizeRender } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useImagesSelectedContext } from "app/context";
import { ImageService } from "app/services";
import { ImageItemMenu } from "app/components";

import style from "./ImageItem.module.scss";


function useImageRefStatus(src: string): { imgRef: RefObject<HTMLImageElement>, isLoaded: boolean, isError: boolean } {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img === null || src === undefined) {
      return;
    }
    setIsLoaded(false);
    setIsError(false);
    if (img.complete === true && img.naturalWidth !== 0) {
      setIsLoaded(true);
      return;
    }
    const handleLoad = () => setIsLoaded(true);
    img.addEventListener("load", handleLoad);
    const handleError = () => setIsError(true);
    img.addEventListener("error", handleError);
    return () => {
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src]);
  return { imgRef, isLoaded, isError };
}

function computeResizeRender(width: number, height: number): ImageResizeRender {
  return width === undefined || height === undefined ? "inbox" : "outbox";
}

function computeImageSrc(image: ImageOrSummary, width: number, height: number, resizeRender: ImageResizeRender): string {
  return ImageService.getImageSrc(image.uri, width, height, resizeRender);
}

function computeExpectedDimensions(width: number, height: number, image: ImageOrSummary): {
  resizeRender: ImageResizeRender,
  expectedDimensions: ImageDimensions
} {
  const resizeRender = computeResizeRender(width, height);
  let expectedDimensions: ImageDimensions;
  if (resizeRender === "inbox") {
    const scalingRatio = Math.min(1, width !== undefined ? (image.dimensions.width / width) : (image.dimensions.height / height));
    const imageRatio = image.dimensions.width / image.dimensions.height;
    expectedDimensions = {
      width: Math.round(scalingRatio * (width !== undefined ? width : (height * imageRatio))),
      height: Math.round(scalingRatio * (height !== undefined ? height : (width / imageRatio)))
    };
  }
  else {
    expectedDimensions = ImageService.computeImageDimensions(image.dimensions, { width, height }, resizeRender);
  }
  return { resizeRender, expectedDimensions };
}

type ImageItemType = {
  image: ImageOrSummary;
  width: number;
  height?: number;
  mode?: ImageItemMode;
  overlay?: ReactNode;
  viewMode: ViewMode;
  onClick: (image: ImageOrSummary) => void;
};

export default function ImageItem({
  image,
  width,
  height,
  overlay,
  viewMode,
  mode = ImageItemMode.VIEW,
 onClick,
}: ImageItemType) {
  const [t] = useTranslation();
  const [menuOpened, setMenuOpened] = useState<boolean>(false);
  const { toggleSelectedImage, isSelectedImage } = useImagesSelectedContext();
  const [imageExpectedDimensions, setImageExpectedDimensions] = useState<ImageDimensions>(computeExpectedDimensions(width, height, image).expectedDimensions);
  const [imageSrc, setImageSrc] = useState<string>(computeImageSrc(image, width, height, computeResizeRender(width, height)));
  const { imgRef, isLoaded, isError } = useImageRefStatus(imageSrc);

  useEffect(() => {
    const {
      resizeRender,
      expectedDimensions: newImageExpectedDimensions
    } = computeExpectedDimensions(width, height, image);
    setImageExpectedDimensions(newImageExpectedDimensions);
    setImageSrc(computeImageSrc(image, width, height, resizeRender));
  }, [image, width, height]);

  const handleOnSelectImage = useCallback(() => toggleSelectedImage(image), [image, toggleSelectedImage]);

  const handleOnClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (mode === ImageItemMode.SELECT) {
      return handleOnSelectImage();
    }
    if (target.getAttribute("data-action")) {
      onClick(image);
    }
  }, [handleOnSelectImage]);

  const handleOnChangeMenuOpened = useCallback((opened: boolean) => {
    setMenuOpened(opened);
  }, []);

  const isSelected = useMemo(() => isSelectedImage(image), [image, isSelectedImage]);

  const containerStyle = useMemo(() => ({
    width: `${width}px`,
    height: `${height !== undefined ? height : Math.round(width * (imageExpectedDimensions.height / imageExpectedDimensions.width))}px`
  }), [width, height, imageExpectedDimensions]);

  const menu = useMemo(() => (mode === ImageItemMode.VIEW && (
    <Menu
      withinPortal={false}
      position="bottom-end"
      trigger="hover"
      openDelay={50}
      closeDelay={600}
      opened={menuOpened}
      onChange={handleOnChangeMenuOpened}
      shadow="md"
      width={260}
    >
      <Menu.Target>
        <ActionIcon variant="default">
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      {menuOpened && <ImageItemMenu image={image} viewMode={viewMode} />}
    </Menu>
  )), [image, menuOpened, handleOnChangeMenuOpened]);

  const actions = useMemo(() => (<Flex
    data-action={true}
    p="sm"
    align="start"
    justify="space-between"
    style={menuOpened ? { opacity: 1 } : {}}
    className={style.overlay}
  >
    {mode !== ImageItemMode.PASSIVE && <Checkbox
      checked={isSelected}
      size={width < 200 ? "sm" : "md"}
      onChange={handleOnSelectImage}
    />}
    {menu}
  </Flex>), [menuOpened, menu, isSelected, handleOnChangeMenuOpened, handleOnSelectImage]);

  const img = useMemo(() => (<img
    ref={imgRef}
    className={`${style.image} ${isLoaded === true ? style.loaded : style.unLoaded}`}
    loading="lazy"
    src={imageSrc}
    alt={image.name}
    width={imageExpectedDimensions.width}
    height={imageExpectedDimensions.height}
    style={imageExpectedDimensions}
  />), [imgRef, isLoaded, imageSrc, imageExpectedDimensions]);

  const overlayElement = useMemo(() => (overlay && <div className={style.captionContainer}>{overlay}</div>), [overlay]);

  const placeholder = useMemo(() => (isLoaded === false &&
    <Flex className={style.placeholder} align="center" justify="center">{isError === true && (
      <Text c="red">{t("errors.imageCondensed")}</Text>)}</Flex>), [isLoaded, isError]);

  const className = useMemo(() => `${style.imageWrapper} ${isSelected ? style.hover : ""}`, [isSelected]);

  return (<Flex
    align="center"
    justify="center"
    className={className}
    onClick={handleOnClick}
    style={containerStyle}
  >
    {actions}
    {img}
    {overlayElement}
    {placeholder}
  </Flex>);
}
