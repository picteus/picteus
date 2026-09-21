import React, { ReactElement, ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  imageRef: RefObject<HTMLImageElement | null>;
  isLoaded: boolean;
  hasError: boolean;
  handleLoad: () => void;
  handleError: () => void;
}
{
  const [ isLoaded, setIsLoaded ] = useState<boolean>(false);
  const [ hasError, setHasError ] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() =>
  {
    const imageElement = imageRef.current;
    if (imageElement === null)
    {
      return;
    }

    // We check whether the image bitmap has already been loaded from the browser cache. Indeed, in many browsers, when an image is cached, the browser decodes it immediately and may not fire a native "load" event upon element creation or "src" update (or fires it before React binds the synthetic event listener). The "complete" property indicates whether the browser has finished attempting to load the image. We also verify that "naturalWidth !== 0" because the browser marks broken or failed images as "complete = true" with a zero intrinsic width.
    if (imageElement.complete === true && imageElement.naturalWidth !== 0)
    {
      setIsLoaded(true);
      setHasError(false);
    }
    else
    {
      setIsLoaded(false);
      setHasError(false);
    }
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
    imageRef,
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
  imageUri: string,
  width: number,
  height: number | undefined,
  resizeRender: ImageResizeRender,
  imageModificationDate?: number
): string
{
  const url = ImageService.getImageSrc(imageUri, width, height, resizeRender);
  return imageModificationDate !== undefined ? `${url}&t=${imageModificationDate}` : url;
}

function computeExpectedDimensions(
  width: number,
  height: number | undefined,
  imageWidth: number,
  imageHeight: number
): {
  resizeRender: ImageResizeRender;
  expectedDimensions: ImageDimensions;
}
{
  const resizeRender = computeResizeRender(width, height);
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

export default function ImageItem({
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
  const { latestDate: latestImageDate } = useImageDateChanged(image);

  const imageWidth = useMemo<number>(() => image.dimensions.width, [ image.dimensions ]);
  const imageHeight = useMemo<number>(() => image.dimensions.height, [ image.dimensions ]);
  const {
    resizeRender,
    expectedDimensions: imageExpectedDimensions
  } = useMemo(() => computeExpectedDimensions(width, height, imageWidth, imageHeight), [ width, height, imageWidth, imageHeight ]);

  const imageSrc = useMemo<string>(() => computeImageSrc(image.uri, width, height, resizeRender, latestImageDate), [ image.uri, width, height, resizeRender, latestImageDate ]);

  const { imageRef, isLoaded, hasError, handleLoad, handleError } = useImageRefStatus(imageSrc);

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

  const containerClassName = useMemo<string>(() => `${style.imageWrapper} ${isSelected ? style.hover : ""}`, [ isSelected ]);
  const imgClassName = useMemo<string>(() => `${style.image} ${isLoaded === true ? style.loaded : style.notLoaded}`, [ isLoaded ]);

  const overlayElement = useMemo<ReactElement>(() => overlay && mode !== ImageItemMode.SELECT && (
    <div className={style.captionContainer}>{overlay}</div>), [ overlay, mode ]);

  const loadingOrErrorElement = useMemo<ReactElement>(() => (isLoaded === false && (<Flex
    className={`${style.placeholder}${hasError === true ? (` ${style.error}`) : ""}`}
    align="center"
    justify="center"
  >
    {hasError === true && (<Text c="red">{t("errors.imageCondensed")}</Text>)}
  </Flex>)), [ isLoaded, hasError ]);

  return (<Flex
    align="center"
    justify="center"
    className={containerClassName}
    onClick={handleOnClick}
    style={containerStyle}
  >
    {actions}
    <img
      ref={imageRef}
      className={imgClassName}
      loading="lazy"
      src={imageSrc}
      alt={image.name}
      width={imageExpectedDimensions.width}
      height={imageExpectedDimensions.height}
      style={imageExpectedDimensions}
      onLoad={handleLoad}
      onError={handleError}
    />
    {overlayElement}
    {loadingOrErrorElement}
  </Flex>);
}
