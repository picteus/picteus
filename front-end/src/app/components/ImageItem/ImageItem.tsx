import React, { ReactElement, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { ActionIcon, Checkbox, Flex, MantineStyleProp, Menu, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageDimensions, ImageResizeRender } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useImagesSelectedContext } from "app/context";
import { useImageDateChanged } from "app/hooks";
import { ImageService } from "app/services";
import { ImageItemMenu } from "app/components";

import style from "./ImageItem.module.scss";


function useImageRefStatus(src: string): {
  isLoaded: boolean;
  hasError: boolean;
  handleLoad: () => void;
  handleError: () => void;
}
{
  const [ isLoaded, setIsLoaded ] = useState<boolean>(false);
  const [ hasError, setHasError ] = useState<boolean>(false);

  useEffect(() =>
  {
    setIsLoaded(false);
    setHasError(false);
  }, [ src ]);

  const handleLoad = useCallback((): void =>
  {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback((): void =>
  {
    setIsLoaded(false);
    setHasError(true);
  }, []);

  return {
    isLoaded,
    hasError,
    handleLoad,
    handleError
  };
}

function computeResizeRender(width?: number, height?: number): ImageResizeRender
{
  return width === undefined || height === undefined ? "inbox" : "outbox";
}

function computeImageSrc(
  image: ImageOrSummary,
  width: number,
  height: number | undefined,
  resizeRender: ImageResizeRender,
  hasImageDateChanged: boolean
): string
{
  const url = ImageService.getImageSrc(image.uri, width, height, resizeRender);
  const imageDate = image.fileDates?.modificationDate ?? image.modificationDate;
  return (imageDate && hasImageDateChanged) ? `${url}&t=${imageDate}` : url;
}

function computeExpectedDimensions(
  width: number,
  height: number | undefined,
  image: ImageOrSummary
): {
  resizeRender: ImageResizeRender;
  expectedDimensions: ImageDimensions;
}
{
  const resizeRender = computeResizeRender(width, height);
  const imageWidth = image.dimensions.width;
  const imageHeight = image.dimensions.height;
  let expectedDimensions: ImageDimensions;

  if (resizeRender === "inbox")
  {
    const scalingRatio = Math.min(1, width !== undefined ? (imageWidth / width) : (imageHeight / (height ?? 1)));
    const imageRatio = imageWidth / imageHeight;
    expectedDimensions = {
      width: Math.round(scalingRatio * (width !== undefined ? width : ((height ?? 1) * imageRatio))),
      height: Math.round(scalingRatio * (height !== undefined ? height : (width / imageRatio)))
    };
  }
  else
  {
    expectedDimensions = ImageService.computeImageDimensions(
      { width: imageWidth, height: imageHeight },
      { width, height: height ?? width },
      resizeRender
    );
  }

  return {
    resizeRender,
    expectedDimensions
  };
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

function ImageItem({
  image,
  width,
  height,
  mode = ImageItemMode.VIEW,
  overlay,
  viewMode,
  onClick
}: ImageItemType)
{
  const [ t ] = useTranslation();
  const [ menuOpened, setMenuOpened ] = useState<boolean>(false);
  const { toggleSelectedImage, isSelectedImage } = useImagesSelectedContext();
  const hasImageDateChanged = useImageDateChanged(image);

  const {
    resizeRender,
    expectedDimensions: imageExpectedDimensions
  } = useMemo(() => computeExpectedDimensions(width, height, image), [ width, height, image ]);

  const imageSrc = useMemo<string>(() => computeImageSrc(image, width, height, resizeRender, hasImageDateChanged), [ image, width, height, resizeRender, hasImageDateChanged ]);

  const { isLoaded, hasError, handleLoad, handleError } = useImageRefStatus(imageSrc);

  const handleOnSelectImage = useCallback((): void =>
  {
    toggleSelectedImage(image);
  }, [ image, toggleSelectedImage ]);

  function handleOnClick(event: React.MouseEvent<HTMLElement>): void
  {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (mode === ImageItemMode.SELECT)
    {
      handleOnSelectImage();
    }
    else
    {
      // We ignore clicks originating from interactive controls like buttons and checkboxes
      if (target.closest("button, input") !== null)
      {
        return;
      }
      if (target.closest("[data-action]") !== null)
      {
        onClick(image);
      }
    }
  }

  const isSelected = useMemo<boolean>(() => isSelectedImage(image), [ image, isSelectedImage ]);

  const containerStyle = useMemo<MantineStyleProp>(() =>
  {
    const calculatedHeight = height !== undefined
      ? height
      : Math.round(width * (imageExpectedDimensions.height / Math.max(1, imageExpectedDimensions.width)));
    return {
      width: `${width}px`,
      height: `${calculatedHeight}px`
    };
  }, [ width, height, imageExpectedDimensions ]);

  const menu = useMemo<ReactElement | null>(() =>
  {
    if (mode !== ImageItemMode.VIEW)
    {
      return null;
    }
    else
    {
      return (<Menu
        withinPortal={false}
        position="bottom-end"
        trigger="hover"
        openDelay={50}
        closeDelay={600}
        opened={menuOpened}
        onChange={setMenuOpened}
        shadow="md"
        width={260}
      >
        <Menu.Target>
          <ActionIcon variant="default">
            <IconDots/>
          </ActionIcon>
        </Menu.Target>
        {menuOpened && <ImageItemMenu image={image} viewMode={viewMode}/>}
      </Menu>);
    }
  }, [ mode, menuOpened, image, viewMode ]);

  const actions = useMemo<ReactElement>(() =>
  {
    return (<Flex
      data-action={true}
      p="sm"
      align="start"
      justify="space-between"
      style={menuOpened ? { opacity: 1 } : {}}
      className={style.overlay}
    >
      {mode !== ImageItemMode.PASSIVE && (
        <Checkbox
          checked={isSelected}
          size={width < 200 ? "sm" : "md"}
          onChange={handleOnSelectImage}
        />
      )}
      {menu}
    </Flex>);
  }, [ menuOpened, mode, isSelected, width, handleOnSelectImage, menu ]);

  const className = useMemo<string>(() => `${style.imageWrapper} ${isSelected ? style.hover : ""}`, [ isSelected ]);

  return (<Flex
    align="center"
    justify="center"
    className={className}
    onClick={handleOnClick}
    style={containerStyle}
  >
    {actions}
    <img
      className={`${style.image} ${isLoaded === true ? style.loaded : style.notLoaded}`}
      loading="lazy"
      src={imageSrc}
      alt={image.name}
      width={imageExpectedDimensions.width}
      height={imageExpectedDimensions.height}
      style={imageExpectedDimensions}
      onLoad={handleLoad}
      onError={handleError}
    />
    {overlay && mode !== ImageItemMode.SELECT && (<div className={style.captionContainer}>{overlay}</div>)}
    {isLoaded === false && (<Flex
      className={`${style.placeholder}${hasError === true ? (` ${style.error}`) : ""}`}
      align="center"
      justify="center"
    >
      {hasError === true && (<Text c="red">{t("errors.imageCondensed")}</Text>)}
    </Flex>)}
  </Flex>);
}

export default React.memo(ImageItem);
