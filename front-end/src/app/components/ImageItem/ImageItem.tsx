import React, { ReactElement, ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { ActionIcon, Flex, MantineStyleProp, Menu, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageDimensions, ImageResizeRender } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary, ViewMode } from "types";
import { useImageDateChanged } from "app/hooks";
import { ImageService } from "app/services";
import { ImageItemMenu, ImageSelectCheckbox, useImageSelection } from "app/components";

import style from "./ImageItem.module.scss";


const OPACITY_ONE_STYLE = { opacity: 1 } as const;
const MAX_LOADED_CACHE_SIZE = 1_000;
const loadedImagesCache = new Set<string>();

function markImageAsLoaded(src: string): void
{
  if (loadedImagesCache.size >= MAX_LOADED_CACHE_SIZE)
  {
    loadedImagesCache.clear();
  }
  loadedImagesCache.add(src);
}

function useImageRefStatus(src: string): {
  imageRef: RefObject<HTMLImageElement | null>;
  isLoaded: boolean;
  hasError: boolean;
  handleLoad: () => void;
  handleError: () => void;
}
{
  const [ isLoaded, setIsLoaded ] = useState<boolean>(() => loadedImagesCache.has(src));
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
      markImageAsLoaded(src);
      setIsLoaded(true);
      setHasError(false);
    }
    else if (loadedImagesCache.has(src) === false)
    {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [ src ]);

  const handleLoad = useCallback((): void =>
  {
    markImageAsLoaded(src);
    setIsLoaded(true);
    setHasError(false);
  }, [ src ]);

  const handleError = useCallback((): void =>
  {
    loadedImagesCache.delete(src);
    setIsLoaded(false);
    setHasError(true);
  }, [ src ]);

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

function ImageItem({
  image,
  width,
  height,
  mode = ImageItemMode.VIEW,
  overlay,
  viewMode,
  onClick
}: ImageItemType): ReactElement
{
  const [ t ] = useTranslation();
  const [ menuOpened, setMenuOpened ] = useState<boolean>(false);
  const { isSelected, toggleSelectedImage } = useImageSelection(image);
  const { latestDate: latestImageDate } = useImageDateChanged(image);

  const imageWidth = image.dimensions.width;
  const imageHeight = image.dimensions.height;
  const {
    resizeRender,
    expectedDimensions: imageExpectedDimensions
  } = useMemo(() => computeExpectedDimensions(width, height, imageWidth, imageHeight), [ width, height, imageWidth, imageHeight ]);

  const imageSrc = useMemo<string>(() =>
  {
    return computeImageSrc(image.uri, width, height, resizeRender, latestImageDate);
  }, [ image.uri, width, height, resizeRender, latestImageDate ]);

  const { imageRef, isLoaded, hasError, handleLoad, handleError } = useImageRefStatus(imageSrc);

  // We keep stable refs for handlers so callbacks have a permanent reference across renders
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const toggleSelectedImageRef = useRef(toggleSelectedImage);
  toggleSelectedImageRef.current = toggleSelectedImage;

  const imageRefForClick = useRef(image);
  imageRefForClick.current = image;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLElement>): void =>
  {
    event.stopPropagation();
    if (modeRef.current === ImageItemMode.SELECT)
    {
      toggleSelectedImageRef.current();
    }
    else
    {
      onClickRef.current(imageRefForClick.current);
    }
  }, []);

  const handleRootClick = useCallback((event: React.MouseEvent<HTMLElement>): void =>
  {
    event.stopPropagation();
    if (modeRef.current === ImageItemMode.SELECT)
    {
      toggleSelectedImageRef.current();
    }
  }, []);

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
      return (
        <Menu
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
            <ActionIcon
              variant="default"
              onClick={(event: React.MouseEvent<HTMLButtonElement>): void =>
              {
                event.stopPropagation();
              }}
            >
              <IconDots/>
            </ActionIcon>
          </Menu.Target>
          {menuOpened && <ImageItemMenu image={image} viewMode={viewMode}/>}
        </Menu>
      );
    }
  }, [ mode, menuOpened, image, viewMode ]);

  const actions = useMemo<ReactElement>(() =>
  {
    return (
      <Flex
        p="sm"
        align="start"
        justify="space-between"
        style={menuOpened ? OPACITY_ONE_STYLE : undefined}
        className={style.overlay}
        onClick={handleOverlayClick}
      >
        {mode !== ImageItemMode.PASSIVE && (
          <ImageSelectCheckbox
            image={image}
            isCompact={width < 200}
            checked={isSelected}
          />
        )}
        {menu}
      </Flex>
    );
  }, [ menuOpened, mode, image, width, menu, handleOverlayClick, isSelected ]);

  const containerClassName = `${style.imageWrapper}${isSelected ? ` ${style.hover}` : ""}`;
  const imgClassName = `${style.image} ${isLoaded === true ? style.loaded : style.notLoaded}`;

  const overlayElement = useMemo<ReactElement | null>(() =>
  {
    if (!overlay || mode === ImageItemMode.SELECT)
    {
      return null;
    }
    return (
      <div
        className={style.captionContainer}
        onClick={(event: React.MouseEvent<HTMLDivElement>): void =>
        {
          event.stopPropagation();
        }}
      >
        {overlay}
      </div>
    );
  }, [ overlay, mode ]);

  const loadingOrErrorElement = useMemo<ReactElement | null>(() =>
  {
    if (isLoaded === true)
    {
      return null;
    }
    return (
      <Flex
        className={`${style.placeholder}${hasError === true ? ` ${style.error}` : ""}`}
        align="center"
        justify="center"
      >
        {hasError === true && <Text c="red">{t("errors.imageCondensed")}</Text>}
      </Flex>
    );
  }, [ isLoaded, hasError, t ]);

  return (
    <Flex
      align="center"
      justify="center"
      className={containerClassName}
      onClick={handleRootClick}
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
    </Flex>
  );
}

export default React.memo(ImageItem);
