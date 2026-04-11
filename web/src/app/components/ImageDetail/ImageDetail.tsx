import React, { ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Group, Layout, Panel, Separator } from "react-resizable-panels";
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconX } from "@tabler/icons-react";
import { Accordion, ActionIcon, Button, Divider, Flex, Menu, Table, Text } from "@mantine/core";

import { ExtensionImageFeature, ExtensionImageTag, Image, ImageMetadata, Repository } from "@picteus/ws-client";

import { capitalizeText, formatDate, formatDimensions, formatSize } from "utils";
import { ChannelEnum, ImageOrSummary } from "types";
import { useEventSocket } from "app/context";
import { ImageService, RepositoriesService, StorageService } from "app/services";
import { CodeViewer, CopyText, ExternalLink, ImageItemMenu, Markdown } from "app/components";
import { TableComponent } from "./components/index.ts";

import style from "./ImageDetail.module.scss";


type ImageDetailType = {
  image: ImageOrSummary;
  onClose: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function ImageDetail({
   image,
   onClose,
   hasPrev,
   hasNext,
   onPrev,
   onNext,
 }: ImageDetailType) {
  const [imageData, setImageData] = useState<Image>();
  const [imageTags, setImageTags] = useState<ExtensionImageTag[]>();
  const [imageFeatures, setImageFeatures] = useState<ExtensionImageFeature[]>();
  const [repository, setRepository] = useState<Repository>();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const imageRef = useRef();
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [t] = useTranslation();
  const [panelSizes, setPanelSizes] = useState<number[]>(
    StorageService.getVisualizerPanelSizes(),
  );

  async function loadImageData() {
    const imageData: Image = await ImageService.get({ id: image.id });
    setImageTags(imageData.tags);
    setImageFeatures(imageData.features);
    setImageData(imageData);
    setRepository(RepositoriesService.getRepositoryInformation(imageData.repositoryId));
  }

  useEffect(() => {
    if (event !== undefined) {
      const channel = event.rawData.channel;
      if (channel === ChannelEnum.IMAGE_UPDATED || channel === ChannelEnum.IMAGE_TAGS_UPDATED || channel === ChannelEnum.IMAGE_FEATURES_UPDATED)
      {
        if (imageData !== undefined && event.rawData.value?.id === imageData.id) {
          void loadImageData();
        }
      }
    }
  }, [event]);

  useEffect(() => {
    void loadImageData();
  }, [image]);

  const dimensions = useMemo(() => {
    return ImageService.getFittedDimensionsToScreen(
      image.dimensions,
      panelSizes,
    );
  }, [image, panelSizes]);

  useEffect(() => {
    if (imageRef?.current) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      imageRef.current.style.transform = "scale(" + imageZoom + ")";
    }
  }, [imageZoom, imageRef]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && hasPrev) {
        onPrev();
      } else if (event.key === "ArrowRight" && hasNext) {
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasPrev, hasNext, onPrev, onNext]);

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
      // @ts-expect-error
      imageRef.current.addEventListener("mousewheel", adjustZoomLevel);
    }
  }, [imageRef]);

  const informationData = useMemo(() => {
    return [
      {
        label: t("field.id"),
        value: <CopyText text={image.id} />,
      },
      ...(image.parentId
        ? [
          {
            label: t("field.parentId"),
            value: <CopyText text={image.parentId} />,
          },
        ]
        : []),
      {
        label: t("field.repository"),
        value: repository && <ExternalLink label={repository.url} url={repository.url} />,
      },
      {
        label: t("field.repositoryId"),
        value: <CopyText text={image.repositoryId} />,
      },
      {
        label: t("field.createdOn"),
        value: formatDate(image.fileDates.creationDate),
      },
      {
        label: t("field.modifiedOn"),
        value: formatDate(image.fileDates.modificationDate),
      },
      {
        label: t("field.dimensions"),
        value: formatDimensions(image.dimensions),
      },
      ...(image.sourceUrl
        ? [
          {
            label: t("field.sourceUrl"),
            value: (
              <ExternalLink
                label={image.sourceUrl}
                url={image.sourceUrl}
              />
            ),
          },
        ]
        : []),
      {
        label: t("field.location"),
        value: <ExternalLink label={image.url} url={image.url} />,
      },
    ];
  }, [image, repository]);

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
      <Panel id="left" defaultSize={`${panelSizes[0]}%`} minSize="40%">
        <div data-close="close" className={style.imageContainer}>
          <ActionIcon
            size={"xl"}
            ml={"xl"}
            style={hasPrev ? {} : { visibility: "hidden" }}
            variant="default"
            onClick={onPrev}
          >
            <IconArrowLeft />
          </ActionIcon>

          <img
            ref={imageRef}
            src={ImageService.getImageSrc(
              image.uri,
              dimensions.width,
              dimensions.height
            )}
            alt="Local picture"
          />
          <ActionIcon
            style={hasNext ? {} : { visibility: "hidden" }}
            size={"xl"}
            mr={"xl"}
            variant="default"
            onClick={onNext}
          >
            <IconArrowRight />
          </ActionIcon>
        </div>
      </Panel>
      <Separator className={style.paneSeparator}>
        <div className={style.paneSeparatorHandle} />
      </Separator>
      <Panel id="right" defaultSize={`${panelSizes[1]}%`} minSize="20%" style={{width: "200px"}}>
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
                <Table>
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
                  <Table width={"100%"} layout="fixed">
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
                  <Table width={"100%"} layout="fixed">
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
                <Table width={"100%"} layout="fixed">
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
