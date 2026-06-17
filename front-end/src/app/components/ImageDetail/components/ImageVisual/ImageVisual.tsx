import React, { useEffect, useRef, useState } from "react";
import { ActionIcon, Alert, Box, Flex } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";
import { IconArrowLeft, IconArrowRight, IconCircleX } from "@tabler/icons-react";

import { useTranslation } from "react-i18next";

import { Image, ImageDimensions as PicteusImageDimensions, ImageResizeRender } from "@picteus/ws-client";


import { WithNavigationType } from "types";
import { ImageService } from "app/services";
import { OverlayIndicator } from "app/components";

import style from "./ImageVisual.module.scss";
import { useImageDateChanged } from "../../../../hooks";


type ImageVisualType = {
  image: Image;
  withNavigation: WithNavigationType;
};

export default function ImageVisual({ image, withNavigation }: ImageVisualType)
{
  const resizeRender: ImageResizeRender = "inbox";
  const [t] = useTranslation();
  const leftArrowRef = useRef<HTMLButtonElement>(null);
  const rightArrowRef = useRef<HTMLButtonElement>(null);
  const [imageWrapperRef, imageWrapperRectangle] = useResizeObserver();
  const imageRef = useRef<HTMLImageElement>();
  const [placeholder, setPlaceholder] = useState<boolean>(true);
  const [imageWrapperDimensions, setImageWrapperDimensions] = useState<PicteusImageDimensions | undefined>();
  const [imageExpectedDimensions, setImageExpectedDimensions] = useState<PicteusImageDimensions | undefined>();
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const [scalingRatio, setScalingRatio] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const hasImageDateChanged = useImageDateChanged(image);

  useEffect(() =>
  {
    const newImageWrapperDimensions = {
      width: Math.round(imageWrapperRectangle.width),
      height: Math.round(imageWrapperRectangle.height)
    };
    setImageWrapperDimensions(newImageWrapperDimensions);
    if (image !== undefined && (imageWrapperRectangle.width > 0 || imageWrapperRectangle.height > 0))
    {
      const newImageExpectedDimensions = ImageService.computeImageDimensions(image.dimensions, {
        width: imageWrapperRectangle.width,
        height: imageWrapperRectangle.height
      }, resizeRender);
      setImageExpectedDimensions(newImageExpectedDimensions);
      setScalingRatio(Math.round((newImageExpectedDimensions.width / image.dimensions.width) * 100).toString());
      const url = ImageService.getImageSrc(image.uri, newImageWrapperDimensions.width, newImageWrapperDimensions.height, resizeRender);
      const imageDate = image.fileDates?.modificationDate ?? image.modificationDate;
      setImageSrc((imageDate && hasImageDateChanged) ? `${url}&t=${imageDate}` : url);
    }
  }, [imageWrapperRectangle, hasImageDateChanged, image]);

  useEffect(() =>
  {
    if (withNavigation.hasPrevious === false)
    {
      if (withNavigation.hasNext === true && rightArrowRef.current !== null)
      {
        rightArrowRef.current.focus();
      }
    }
    else if (withNavigation.hasNext === false)
    {
      if (withNavigation.hasPrevious === true && leftArrowRef.current !== null)
      {
        leftArrowRef.current.focus();
      }
    }
  }, [withNavigation]);

  return (<Flex data-close="close" align="center" justify="space-between" gap="sm" className={style.imageContainer}>
    <ActionIcon
      ref={leftArrowRef}
      size={"xl"}
      ml={"sm"}
      style={withNavigation.hasPrevious ? {} : { visibility: "hidden" }}
      variant="default"
      onClick={withNavigation.onPrevious}
    >
      <IconArrowLeft/>
    </ActionIcon>
    <div ref={imageWrapperRef} className={style.imageWrapper}>
      {imageExpectedDimensions && imageWrapperDimensions && imageWrapperDimensions.width > 0 && imageWrapperDimensions.height > 0 &&
        <img
          ref={imageRef}
          className={`${style.image} ${placeholder === false ? style.loaded : style.unLoaded}`}
          onLoad={() =>
          {
            setPlaceholder(false);
            setError(undefined);
          }}
          onError={() => setError(t("errors.imageDetail"))}
          src={imageSrc}
          alt={image.name}
          width={imageExpectedDimensions.width}
          height={imageExpectedDimensions.height}
          style={{ width: imageExpectedDimensions.width, height: imageExpectedDimensions.height }}
        />}
      {placeholder && <Flex className={style.placeholder} align="center" justify="center">{error && (
        <Alert variant="light" color="red" title={t("errors.imageTitle")}
               icon={<IconCircleX/>}>{error}</Alert>)}</Flex>}
      {scalingRatio && <Box className={style.scalingRatio}><OverlayIndicator text={`${scalingRatio}%`}/></Box>}
    </div>
    <ActionIcon
      ref={rightArrowRef}
      style={withNavigation.hasNext ? {} : { visibility: "hidden" }}
      size={"xl"}
      mr={"sm"}
      variant="default"
      onClick={withNavigation.onNext}
    >
      <IconArrowRight/>
    </ActionIcon>
  </Flex>);
}
