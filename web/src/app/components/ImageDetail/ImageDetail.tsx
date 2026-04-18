import React, { ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Group, Layout, Panel, Separator } from "react-resizable-panels";
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconCircleX, IconX } from "@tabler/icons-react";
import { Accordion, ActionIcon, Alert, Button, Divider, Flex, Menu, Table, Text } from "@mantine/core";
import { useResizeObserver } from "@mantine/hooks";

import {
  ExtensionImageFeature,
  ExtensionImageTag,
  Image,
  ImageDimensions,
  ImageMetadata,
  ImageResizeRender,
  Repository
} from "@picteus/ws-client";

import { capitalizeText, formatDate, formatDimensions, formatSize } from "utils";
import { ChannelEnum, ImageOrSummary, WithNavigationType } from "types";
import { useEventSocket } from "app/context";
import { ImageService, RepositoriesService, StorageService } from "app/services";
import { CodeViewer, CopyText, ExternalLink, ImageItemMenu, Markdown } from "app/components";
import { TableComponent } from "./components/index.ts";

import style from "./ImageDetail.module.scss";


type ImageDetailType = {
  image: ImageOrSummary;
  onClose: () => void;
  withNavigation: WithNavigationType;
};

export default function ImageDetail({
   image,
   onClose,
   withNavigation,
 }: ImageDetailType) {
  const [t] = useTranslation();
  const [imageData, setImageData] = useState<Image>("metadata" in image ? image as Image : undefined);
  const [imageTags, setImageTags] = useState<ExtensionImageTag[]>();
  const [imageFeatures, setImageFeatures] = useState<ExtensionImageFeature[]>();
  const [repository, setRepository] = useState<Repository>();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [imageWrapperRef, imageWrapperRectangle] = useResizeObserver();
  const [imageWrapperDimensions, setImageWrapperDimensions] = useState<ImageDimensions | undefined>();
  const [imageExpectedDimensions, setImageExpectedDimensions] = useState<ImageDimensions | undefined>();
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const imageRef = useRef<HTMLImageElement>();
  const [placeholder, setPlaceholder] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [panelSizes, setPanelSizes] = useState<number[]>(StorageService.getVisualizerPanelSizes());
  const resizeRender: ImageResizeRender = "inbox";
  useEffect(() => {
    setImageWrapperDimensions({width: Math.round(imageWrapperRectangle.width), height: Math.round(imageWrapperRectangle.height)});
    if (imageWrapperRectangle.width> 0 || imageWrapperRectangle.height > 0) {
      setImageExpectedDimensions(ImageService.computeImageDimensions(image.dimensions, {
        width: imageWrapperRectangle.width,
        height: imageWrapperRectangle.height
      }, resizeRender));
      setImageSrc(ImageService.getImageSrc(image.uri, imageWrapperDimensions.width, imageWrapperDimensions.height, resizeRender));
    }
  }, [imageWrapperRectangle, image]);
  useEffect(() => {
    setPlaceholder(true);
    setError(undefined);
  }, [image]);

  async function loadImageData(force: boolean) {
    const imageData: Image = (force === false && "metadata" in image) ? image as Image : await ImageService.get({ id: image.id });
    setImageData(imageData);
    setImageTags(imageData.tags);
    setImageFeatures(imageData.features);
    setRepository(RepositoriesService.getRepositoryInformation(imageData.repositoryId));
  }

  useEffect(() => {
    if (event !== undefined) {
      const channel = event.rawData.channel;
      if (channel === ChannelEnum.IMAGE_UPDATED || channel === ChannelEnum.IMAGE_TAGS_UPDATED || channel === ChannelEnum.IMAGE_FEATURES_UPDATED) {
        if (imageData !== undefined && event.rawData.value.id === imageData.id) {
          void loadImageData(true);
        }
      }
    }
  }, [event]);

  useEffect(() => {
    void loadImageData(false);
  }, [image]);

  useEffect(() => {
    if (imageRef?.current) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      imageRef.current.style.transform = "scale(" + imageZoom + ")";
    }
  }, [imageZoom, imageRef]);

  useEffect(() => {
    let zoom = 1;
    function adjustZoomLevel(event) {
      const direction = event.deltaY > 0 ? -1 : 1;

      const newZoom = zoom + direction * 0.08;

      if (newZoom < 1) {
        return;
      }
      zoom = newZoom;
      setImageZoom(newZoom);
    }
    if (imageRef?.current) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      imageRef.current.addEventListener("mousewheel", adjustZoomLevel);
    }
  }, [imageRef]);

  const informationData = useMemo(() => {
    if (imageData === undefined) {
      return [];
    }
    return [
      {
        label: t("field.id"),
        value: <CopyText text={imageData.id} />,
      },
      ...(imageData.parentId
        ? [
          {
            label: t("field.parentId"),
            value: <CopyText text={imageData.parentId} />,
          },
        ]
        : []),
      {
        label: t("field.repository"),
        value: repository && <ExternalLink label={repository.url} url={repository.url} />,
      },
      {
        label: t("field.repositoryId"),
        value: <CopyText text={imageData.repositoryId} />,
      },
      {
        label: t("field.createdOn"),
        value: formatDate(imageData.fileDates.creationDate),
      },
      {
        label: t("field.modifiedOn"),
        value: formatDate(imageData.fileDates.modificationDate),
      },
      {
        label: t("field.dimensions"),
        value: formatDimensions(imageData.dimensions),
      },
      ...(image.sourceUrl
        ? [
          {
            label: t("field.sourceUrl"),
            value: (
              <ExternalLink
                label={imageData.sourceUrl}
                url={imageData.sourceUrl}
              />
            ),
          },
        ]
        : []),
      {
        label: t("field.location"),
        value: <ExternalLink label={imageData.url} url={imageData.url} />,
      },
    ];
  }, [imageData, repository]);

  const imageMetadata = useMemo(() => {
    if (!imageData) {
      return undefined;
    }
    const metadata: ImageMetadata = imageData.metadata;
    // We exclude the empty metadata entities
    return Object.entries(metadata).filter(([, value]) => value !== undefined && value !== "{}").map(([key, value]) => {
      try {
        JSON.parse(value);
        value = <CodeViewer code={value} />;
      } catch (error) {
        // Ignore the error because we just want to display the value if it is not parseable.
      }
      return {
        label: key,
        value: value,
      };
    });
  }, [imageData]);

  function onLayoutChanged(layout: Layout) {
    const size = Object.values(layout);
    StorageService.setVisualizerPanelSizes(size);
    setPanelSizes(size);
  }

  return (
    <Group orientation="horizontal" onLayoutChanged={onLayoutChanged}>
      <Panel id="left" defaultSize={`${panelSizes[0]}%`} minSize="40%" className={style.left}>
        <Flex data-close="close" align="center" justify="space-between" gap="sm" className={style.imageContainer}>
          <ActionIcon
            size={"xl"}
            ml={"sm"}
            style={withNavigation.hasPrevious ? {} : { visibility: "hidden" }}
            variant="default"
            onClick={withNavigation.onPrevious}
          >
            <IconArrowLeft />
          </ActionIcon>
          <div ref={imageWrapperRef} className={style.imageWrapper}>
            {imageWrapperDimensions && imageWrapperDimensions.width > 0 && imageWrapperDimensions.height > 0 && <img
              ref={imageRef}
              className={`${style.image} ${placeholder === false ? style.loaded : style.unLoaded}`}
              onLoad={() => {
                setPlaceholder(false);
                setError(undefined);
              }}
              onError={() => setError(t("errors.imageDetail"))}
              src={imageSrc}
              alt={image.name}
              width={imageExpectedDimensions.width}
              height={imageExpectedDimensions.height}
              style={{width: imageExpectedDimensions.width, height: imageExpectedDimensions.height}}
            />}
            {placeholder && <Flex className={style.placeholder} align="center" justify="center">{error && (
              <Alert variant="light" color="red" title={t("errors.imageTitle")}
                     icon={<IconCircleX />}>{error}</Alert>)}</Flex>}
          </div>
          <ActionIcon
            style={withNavigation.hasNext ? {} : { visibility: "hidden" }}
            size={"xl"}
            mr={"sm"}
            variant="default"
            onClick={withNavigation.onNext}
          >
            <IconArrowRight />
          </ActionIcon>
        </Flex>
      </Panel >
      <Separator className={style.paneSeparator}>
        <div className={style.paneSeparatorHandle} />
      </Separator>
      <Panel id="right" defaultSize={`${panelSizes[1]}%`} minSize="20%" className={style.right}>
        <div className={style.informationContainer}>
          <div className={style.header}>
            <div className={style.titleContainer}>
              <div className={style.titleBox}>
                <div className={style.title}>
                  <CopyText size="md" text={image.name} />
                  <Text c="dimmed" size="sm">
                    {image.format} —{" "}
                    {formatSize(image.sizeInBytes)}
                  </Text>
                </div>
              </div>
              <ActionIcon variant="default" onClick={onClose}>
                <IconX stroke={1.2} size={50} />
              </ActionIcon>
            </div>
            <Flex px="md">
              <Menu
                withinPortal={false}
                position="bottom-end"
                trigger="hover"
                openDelay={80}
                closeDelay={400}
                shadow="md"
                width={200}
              >
                <Menu.Target>
                  <Button
                    variant="default"
                    rightSection={
                      <IconChevronDown stroke={1.2} size={16} />
                    }
                  >
                    {t("menu.imageCommands")}
                  </Button>
                </Menu.Target>
                <ImageItemMenu image={image} />
              </Menu>
            </Flex>
            <Divider my="md" />
          </div>
          <Accordion
            multiple
            defaultValue={[
              "information",
              "tags",
              "features",
              "metadata",
              "generator"
            ]}
          >
            <Accordion.Item value="information">
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  {t("menu.information")}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Table layout="fixed" >
                  <Table.Tbody>
                    {informationData.map((information, index) => (
                      <TableComponent
                        key={`information-${index}`}
                        data={information}
                      />
                    ))}
                  </Table.Tbody>
                </Table>
              </Accordion.Panel>
            </Accordion.Item>
            {imageTags && (
              <Accordion.Item value="tags">
                <Accordion.Control>
                  <Text size="sm" fw={500}>
                    {t("menu.tags")}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Table layout="fixed">
                    <Table.Tbody>
                      {imageTags?.map((imageTag, index) => (
                        <TableComponent
                          key={`tag-${index}`}
                          data={{
                            label: capitalizeText(imageTag.id),
                            value: imageTag.value
                          }}
                        />
                      ))}
                    </Table.Tbody>
                  </Table>
                </Accordion.Panel>
              </Accordion.Item>
            )}
            {imageFeatures && (
              <Accordion.Item value="features">
                <Accordion.Control>
                  <Text size="sm" fw={500}>
                    {t("menu.features")}
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Table layout="fixed">
                    <Table.Tbody>
                      {imageFeatures?.map((imageFeature, index) =>
                      {
                        const value = imageFeature.value;
                        let tableValue: string | ReactNode;
                        switch (imageFeature.format)
                        {
                          default:
                            tableValue = "Unexpected";
                            break;
                          case "json":
                            tableValue = <CodeViewer code={imageFeature.value} />;
                            break;
                          case "markdown":
                            // We need to handle the specific case the linebreak "<br>", because the library does not handle it properly by default
                            tableValue = <Markdown content={value as string} />;
                            break;
                          case "xml":
                            tableValue = value as string;
                            break;
                          case "html":
                            tableValue = value as string;
                            break;
                          case "binary":
                            tableValue = "";
                            break;
                          case "string":
                            tableValue = capitalizeText(value as string);
                            break;
                          case "integer":
                            tableValue = value.toString();
                            break;
                          case "float":
                            tableValue = value.toString();
                            break;
                          case "boolean":
                            tableValue = value.toString();
                            break;
                        }
                        return (
                          <TableComponent
                            key={`feature-${index}`}
                            data={{
                              label: `${capitalizeText(imageFeature.type)} (${imageFeature.id}${imageFeature.name === undefined ? "" : (`:${imageFeature.name}`)})`,
                              value: tableValue
                            }}
                          />
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Accordion.Panel>
              </Accordion.Item>
            )}
            <Accordion.Item value="metadata">
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  {t("menu.metadata")}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Table layout="fixed">
                  <Table.Tbody>
                    {imageMetadata?.map((metadata, index) => (
                      <TableComponent
                        key={`metadata-${index}`}
                        data={metadata}
                      />
                    ))}
                  </Table.Tbody>
                </Table>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </Panel>
    </Group>
  );
}
