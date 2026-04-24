import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Accordion, ActionIcon, Alert, Button, Flex, Group, Menu, Table, Text } from "@mantine/core";
import { getHotkeyHandler, useFocusTrap, useResizeObserver } from "@mantine/hooks";
import { Group as ResizableGroup, Layout, Panel, Separator } from "react-resizable-panels";
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconCircleX, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  ExtensionImageFeature,
  ExtensionImageTag,
  Image,
  ImageDimensions as PicteusImageDimensions,
  ImageMetadata,
  ImageResizeRender,
  Repository
} from "@picteus/ws-client";

import { capitalizeText } from "utils";
import { ChannelEnum, ImageOrSummary, WithNavigationType } from "types";
import { useEventSocket } from "app/context";
import { ImageService, RepositoriesService, StorageService } from "app/services";
import {
  CodeViewer,
  CopyText,
  ExternalLink,
  FormatedDate,
  ImageItemMenu,
  ImageTag,
  Markdown,
  TopPanel
} from "app/components";
import { ImageDimensions, ImageWeight, TableComponent } from "./components";

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
  const ref = useFocusTrap();
  const leftArrowRef = useRef<HTMLButtonElement>(null);
  const rightArrowRef = useRef<HTMLButtonElement>(null);
  const [imageData, setImageData] = useState<Image>("metadata" in image ? image as Image : undefined);
  const [imageTags, setImageTags] = useState<ExtensionImageTag[]>();
  const [imageFeatures, setImageFeatures] = useState<ExtensionImageFeature[]>();
  const [repository, setRepository] = useState<Repository>();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [imageWrapperRef, imageWrapperRectangle] = useResizeObserver();
  const [imageWrapperDimensions, setImageWrapperDimensions] = useState<PicteusImageDimensions | undefined>();
  const [imageExpectedDimensions, setImageExpectedDimensions] = useState<PicteusImageDimensions | undefined>();
  const [imageSrc, setImageSrc] = useState<string | undefined>();
  const imageRef = useRef<HTMLImageElement>();
  const [placeholder, setPlaceholder] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [panelSizes, setPanelSizes] = useState<number[]>(StorageService.getVisualizerPanelSizes());
  const resizeRender: ImageResizeRender = "inbox";

  useEffect(() => {
    setImageWrapperDimensions({width: Math.round(imageWrapperRectangle.width), height: Math.round(imageWrapperRectangle.height)});
    if (imageData !== undefined && (imageWrapperRectangle.width > 0 || imageWrapperRectangle.height > 0)) {
      setImageExpectedDimensions(ImageService.computeImageDimensions(imageData.dimensions, {
        width: imageWrapperRectangle.width,
        height: imageWrapperRectangle.height
      }, resizeRender));
      setImageSrc(ImageService.getImageSrc(imageData.uri, imageWrapperDimensions.width, imageWrapperDimensions.height, resizeRender));
    }
  }, [imageWrapperRectangle, imageData]);

  useEffect(() => {
    setPlaceholder(true);
    setError(undefined);
  }, [image]);

  useEffect(() => {
    if (withNavigation.hasPrevious === false) {
      if (withNavigation.hasNext === true && rightArrowRef.current !== null) {
        rightArrowRef.current.focus();
      }
    }
    else if (withNavigation.hasNext === false) {
      if (withNavigation.hasPrevious === true && leftArrowRef.current !== null) {
        leftArrowRef.current.focus();
      }
    }
  }, [withNavigation]);

  const loadImageData = useCallback((force: boolean): void => {
    async function load() {
      const imageData: Image = (force === false && "metadata" in image) ? image as Image : await ImageService.get({ id: image.id });
      setImageData(imageData);
      setImageTags(imageData.tags);
      setImageFeatures(imageData.features);
      setRepository(RepositoriesService.getRepositoryInformation(imageData.repositoryId));
    }

    void load();
  }, [image]);

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
        value: repository && <ExternalLink url={repository.url} type="link" />,
      },
      {
        label: t("field.repositoryId"),
        value: <CopyText text={imageData.repositoryId} />,
      },
      {
        label: t("field.createdOn"),
        value: <FormatedDate timestamp={imageData.fileDates.creationDate}/>,
      },
      {
        label: t("field.modifiedOn"),
        value: <FormatedDate timestamp={imageData.fileDates.modificationDate}/>,
      },
      ...(imageData.sourceUrl
        ? [
          {
            label: t("field.sourceUrl"),
            value: (
              <ExternalLink url={imageData.sourceUrl} type="link" />
            ),
          },
        ]
        : []),
      {
        label: t("field.location"),
        value: <ExternalLink url={imageData.url} type="link" />,
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

  function handleOnLayoutChanged(layout: Layout) {
    const size = Object.values(layout);
    StorageService.setVisualizerPanelSizes(size);
    setPanelSizes(size);
  }

  const handleOnKeyDown = getHotkeyHandler([
    ["ArrowLeft", withNavigation.onPrevious],
    ["ArrowRight", withNavigation.onNext],
  ]);

  function renderLeftPanel() {
    return <Flex data-close="close" align="center" justify="space-between" gap="sm" className={style.imageContainer}>
      <ActionIcon
        ref={leftArrowRef}
        size={"xl"}
        ml={"sm"}
        style={withNavigation.hasPrevious ? {} : { visibility: "hidden" }}
        variant="default"
        onClick={withNavigation.onPrevious}
      >
        <IconArrowLeft />
      </ActionIcon>
      <div ref={imageWrapperRef} className={style.imageWrapper}>
        {imageExpectedDimensions && imageWrapperDimensions && imageWrapperDimensions.width > 0 && imageWrapperDimensions.height > 0 && <img
          ref={imageRef}
          className={`${style.image} ${placeholder === false ? style.loaded : style.unLoaded}`}
          onLoad={() =>
          {
            setPlaceholder(false);
            setError(undefined);
          }}
          onError={() => setError(t("errors.imageDetail"))}
          src={imageSrc}
          alt={imageData.name}
          width={imageExpectedDimensions.width}
          height={imageExpectedDimensions.height}
          style={{ width: imageExpectedDimensions.width, height: imageExpectedDimensions.height }}
        />}
        {placeholder && <Flex className={style.placeholder} align="center" justify="center">{error && (
          <Alert variant="light" color="red" title={t("errors.imageTitle")}
                 icon={<IconCircleX />}>{error}</Alert>)}</Flex>}
      </div>
      <ActionIcon
        ref={rightArrowRef}
        style={withNavigation.hasNext ? {} : { visibility: "hidden" }}
        size={"xl"}
        mr={"sm"}
        variant="default"
        onClick={withNavigation.onNext}
      >
        <IconArrowRight />
      </ActionIcon>
    </Flex>;
  }

  function renderTags(imageTags: ExtensionImageTag[]) {
    return <Table layout="fixed">
      <Table.Tbody>
        <Table.Tr>
          <Table.Td>
            <Group gap="xs">
              {imageTags.map((imageTag, index) => (
                <ImageTag key={`tag-${index}`} imageTag={imageTag} />
              ))}
            </Group>
          </Table.Td>
        </Table.Tr>
      </Table.Tbody>
    </Table>;
  }

  function renderRightPanel() {
    return <div className={style.informationContainer}>
      <TopPanel
        info={<>
          <div className={style.titleBox}>
            {imageData && <div className={style.title}>
              <CopyText size="md" text={imageData.name} />
              <Text c="dimmed" size="sm">
                {imageData.format} — {<ImageWeight image={imageData} />} — {<ImageDimensions
                dimensions={imageData.dimensions} />}
              </Text>
            </div>}
          </div>
          <ActionIcon variant="default" onClick={onClose}>
            <IconX stroke={1.2} size={50} />
          </ActionIcon>
        </>}
        actions={<Menu
          withinPortal={false}
          position="bottom-end"
          trigger="hover"
          trapFocus={false}
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
          {imageData && <ImageItemMenu image={imageData} />}
        </Menu>
        }/>
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
            <Table layout="fixed">
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
              {renderTags(imageTags)}
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
    </div>;
  }

  return (
    <ResizableGroup elementRef={ref} orientation="horizontal" onLayoutChanged={handleOnLayoutChanged}
           onKeyDown={handleOnKeyDown}>
      <Panel id="left" defaultSize={`${panelSizes[0]}%`} minSize="40%" className={style.left}>
        {renderLeftPanel()}
      </Panel>
      <Separator className={style.paneSeparator}>
        <div className={style.paneSeparatorHandle} />
      </Separator>
      <Panel id="right" defaultSize={`${panelSizes[1]}%`} minSize="20%" className={style.right}>
        {renderRightPanel()}
      </Panel>
    </ResizableGroup>
  );
}
