import React, { ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { ActionIcon, Checkbox, Flex, Menu, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageDimensions } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary } from "types";
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

type ImageItemType = {
  image: ImageOrSummary;
  caption?: ReactNode;
  width: number;
  height?: number;
  mode?: ImageItemMode;
  onClick: (image: ImageOrSummary) => void;
};

export default function ImageItem({
  image,
  caption,
  width,
  height,
  onClick,
  mode = ImageItemMode.VIEW,
}: ImageItemType) {
  const [t] = useTranslation();
  const [menuOpened, setMenuOpened] = useState(false);
  const [selectedImages, setSelectedImages] = useImagesSelectedContext();
  const [imageExpectedDimensions, setImageExpectedDimensions] = useState<ImageDimensions | undefined>();
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const { imgRef, isLoaded, isError } = useImageRefStatus(imageSrc);

  useEffect(() => {
    const resizeRender = width === undefined || height === undefined ? "inbox" : "outbox";
    let newImageExpectedDimensions: ImageDimensions;
    if (resizeRender === "inbox") {
      const scalingRatio = Math.min(1, width !== undefined ? (image.dimensions.width / width) : (image.dimensions.height / height));
      const imageRatio = image.dimensions.width / image.dimensions.height;
      newImageExpectedDimensions = {
        width: Math.round(scalingRatio * (width !== undefined ? width : (height * imageRatio))),
        height: Math.round(scalingRatio * (height !== undefined ? height : (width / imageRatio)))
      };
    }
    else {
      newImageExpectedDimensions = ImageService.computeImageDimensions(image.dimensions, {
        width,
        height
      }, resizeRender);
    }
    setImageExpectedDimensions(newImageExpectedDimensions);
    setImageSrc(ImageService.getImageSrc(image.uri, width, height, resizeRender));
  }, [image, width, height]);

  const handleOnSelectImage = useCallback(()=> {
    if (selectedImages.find((anImage) => anImage.id === image.id)) {
      setSelectedImages(selectedImages.filter((anImage) => anImage.id !== image.id));
    }
    else {
      setSelectedImages([...selectedImages, image]);
    }
  }, [selectedImages]);

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

  const isSelected = useMemo(
    () =>
      selectedImages.find((value) => value.id === image.id) !==
      undefined,
    [selectedImages, image],
  );

  return (imageExpectedDimensions !== undefined && imageExpectedDimensions.width > 0 && imageExpectedDimensions.height > 0) && (
    <Flex
      align="center"
      justify="center"
      className={`${style.imageWrapper} ${isSelected ? style.hover : ""}`}
      onClick={handleOnClick}
      style={{
        width: `${width}px`,
        height: `${height !== undefined ? height : Math.round(width * (imageExpectedDimensions.height / imageExpectedDimensions.width))}px`
      }}
    >
      {caption && <div className={style.captionContainer}>{caption}</div>}
      <Flex
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
        {mode === ImageItemMode.VIEW && (
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
            <ImageItemMenu image={image} />
          </Menu>
        )}
      </Flex>
      <img
        ref={imgRef}
        className={`${style.image} ${isLoaded === true ? style.loaded : style.unLoaded}`}
        loading="lazy"
        src={imageSrc}
        alt={image.name}
        width={imageExpectedDimensions.width}
        height={imageExpectedDimensions.height}
        style={{width: imageExpectedDimensions.width, height: imageExpectedDimensions.height}}
      />
      {isLoaded === false && <Flex className={style.placeholder} align="center" justify="center">{isError === true && (
        <Text c="red">{t("errors.imageCondensed")}</Text>)}</Flex>}
    </Flex>
  );
}
