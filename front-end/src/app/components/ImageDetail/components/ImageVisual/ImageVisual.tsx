import React, { ReactNode, useEffect, useRef, useState } from "react";
import { ActionIcon, Alert, Box, Center, Divider, Flex, Group, Slider, Stack, Text } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";
import { IconArrowLeft, IconArrowRight, IconCircleX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image, ImageDimensions as PicteusImageDimensions, ImageResizeRender } from "@picteus/ws-client";

import { WithNavigationType } from "types";
import { ImageService } from "app/services";
import { ImageCommand, ImageSelectCheckbox, OverlayIndicator } from "app/components";
import { useImageCommands, useImageDateChanged } from "app/hooks";

import style from "./ImageVisual.module.scss";


type TopBarPropsType = {
  image: Image;
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

function TopBar({ image, zoom, onZoomChange }: TopBarPropsType): ReactNode
{
  const { getCommand } = useImageCommands({ image });
  const closestImagesCommand = getCommand("closestImages");
  const openCommand = getCommand("open");
  const downloadCommand = getCommand("download");
  const synchronizeCommand = getCommand("synchronize");
  const deleteCommand = getCommand("delete");

  return (
    <Group justify="space-between" align="center" pt="xs" pb="xs" pl="md" pr="xs">
      <Group gap={10} align="center" style={{ visibility: "hidden" }}>
        <Text size="xs" fw={500} c="dimmed" w={32} ta="right">
          {`${zoom}%`}
        </Text>
        <Slider
          size="xs"
          w={120}
          min={10}
          max={Math.max(200, zoom)}
          value={zoom}
          onChange={onZoomChange}
          label={(_value: number): string =>
          {
            return null;
          }}
        />
      </Group>
      <Group gap={4} align="center">
        <ImageCommand.ActionIcon
          image={image}
          command={closestImagesCommand}
          variant="subtle"
          color="gray"
          size="md"
        />
        <ImageCommand.ActionIcon
          image={image}
          command={openCommand}
          variant="subtle"
          color="gray"
          size="md"
        />
        <ImageCommand.ActionIcon
          image={image}
          command={downloadCommand}
          variant="subtle"
          color="gray"
          size="md"
        />
        <ImageCommand.ActionIcon
          image={image}
          command={synchronizeCommand}
          variant="subtle"
          color="gray"
          size="md"
        />
        <Divider orientation="vertical" h={18} my="auto"/>
        <ImageCommand.ActionIcon
          image={image}
          command={deleteCommand}
          variant="subtle"
          color="red"
          size="md"
        />
      </Group>
    </Group>
  );
}

type ImageVisualPropsType = {
  image: Image;
  withNavigation: WithNavigationType;
};

export default function ImageVisual({ image, withNavigation }: ImageVisualPropsType): ReactNode
{
  const resizeRender: ImageResizeRender = "inbox";
  const [ t ] = useTranslation();
  const leftArrowRef = useRef<HTMLButtonElement>(null);
  const rightArrowRef = useRef<HTMLButtonElement>(null);
  const [ imageWrapperRef, imageWrapperRectangle ] = useResizeObserver();
  const imageRef = useRef<HTMLImageElement>();
  const [ placeholder, setPlaceholder ] = useState<boolean>(true);
  const [ imageWrapperDimensions, setImageWrapperDimensions ] = useState<PicteusImageDimensions | undefined>();
  const [ imageExpectedDimensions, setImageExpectedDimensions ] = useState<PicteusImageDimensions | undefined>();
  const [ imageSrc, setImageSrc ] = useState<string | undefined>();
  const [ scalingRatio, setScalingRatio ] = useState<string | undefined>();
  const [ zoom, setZoom ] = useState<number>(77);
  const [ error, setError ] = useState<string | undefined>();
  const { hasChanged: hasImageDateChanged } = useImageDateChanged(image);

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
      const computedRatio = Math.round((newImageExpectedDimensions.width / image.dimensions.width) * 100);
      setScalingRatio(computedRatio.toString());
      setZoom(computedRatio);
      const url = ImageService.getImageSrc(image.uri, newImageWrapperDimensions.width, newImageWrapperDimensions.height, resizeRender);
      const imageDate = image.fileDates?.modificationDate ?? image.modificationDate;
      setImageSrc((imageDate && hasImageDateChanged) ? `${url}&t=${imageDate}` : url);
    }
  }, [ imageWrapperRectangle, hasImageDateChanged, image ]);

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
  }, [ withNavigation ]);

  return (
    <Stack
      h="100%"
      gap={0}
      bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))"
    >
      <TopBar
        image={image}
        zoom={zoom}
        onZoomChange={setZoom}
      />
      <Divider/>
      <Flex
        flex={1}
        mih={0}
        data-close="close"
        align="center"
        justify="space-between"
        gap="sm"
        py={15}
      >
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
        <Box ref={imageWrapperRef} flex={1} h="100%" pos="relative">
          {imageExpectedDimensions && imageWrapperDimensions && imageWrapperDimensions.width > 0 && imageWrapperDimensions.height > 0 && (
            <Center h="100%" w="100%">
              <Box
                pos="relative"
                w={imageExpectedDimensions.width}
                h={imageExpectedDimensions.height}
              >
                <img
                  ref={imageRef}
                  className={placeholder === false ? style.loaded : style.notLoaded}
                  onLoad={() =>
                  {
                    setPlaceholder(false);
                    setError(undefined);
                  }}
                  onError={() =>
                  {
                    return setError(t("errors.imageDetail"));
                  }}
                  src={imageSrc}
                  alt={image.name}
                  width={imageExpectedDimensions.width}
                  height={imageExpectedDimensions.height}
                  style={{ display: "block", width: "100%", height: "100%" }}
                />
                {placeholder === false && (
                  <Box pos="absolute" top={14} left={14}>
                    <ImageSelectCheckbox
                      image={image}
                      isCompact={false}
                      withTooltip={true}
                    />
                  </Box>
                )}
              </Box>
            </Center>
          )}
          {placeholder && (
            <Flex className={style.placeholder} align="center" justify="center">
              {error && (
                <Alert
                  variant="light"
                  color="red"
                  title={t("errors.imageTitle")}
                  icon={<IconCircleX/>}
                >
                  {error}
                </Alert>
              )}
            </Flex>
          )}
          {scalingRatio && (
            <Box pos="absolute" top={10} right={10}>
              <OverlayIndicator text={`${scalingRatio}%`}/>
            </Box>
          )}
        </Box>
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
      </Flex>
    </Stack>
  );
}
