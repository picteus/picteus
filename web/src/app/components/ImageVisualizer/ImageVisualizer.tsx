import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import Markdown from "react-markdown";
import { IconArrowLeft, IconArrowRight, IconChevronDown, IconX } from "@tabler/icons-react";
import {
  ExtensionImageFeature,
  ExtensionImageTag,
  Image,
  ImageMetadata,
  ImageSummary,
  Repository
} from "@picteus/ws-client";
import { Accordion, ActionIcon, Button, Divider, Flex, Menu, Overlay, Table, Text } from "@mantine/core";
import { ImageService, RepositoriesService, StorageService } from "app/services";
import { CodeViewer, CopyText, ExternalLink } from "app/components";
import { capitalizeText, formatDate, formatSize } from "utils";
import style from "./ImageVisualizer.module.scss";
import { TableComponent } from "./components";
import { ImageItemMenu } from "../ImageMasonry/components/ImageItem/components";


export default function ImageVisualizer({
  imageSummary,
  onClose,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  imageSummary: ImageSummary;
  onClose: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [imageData, setImageData] = useState<Image>();
  const [imageTags, setImageTags] = useState<ExtensionImageTag[]>();
  const [imageFeatures, setImageFeatures] = useState<ExtensionImageFeature[]>();
  const imageRef = useRef();
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [t] = useTranslation();
  const [panelSizes, setPanelSizes] = useState<number[]>(
    StorageService.getVisualizerPanelSizes(),
  );

  function handleOnCloseFromOverlay(event: React.MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const allowClose = !!target.getAttribute("data-close");
    if (allowClose) {
      onClose();
    }
  }

  async function loadImageData() {
    const imageData: Image = await ImageService.get({ id: imageSummary.id });
    setImageTags(imageData.tags);
    setImageFeatures(imageData.features);
    setImageData(imageData);
  }

  useEffect(() => {
    void loadImageData();
  }, [imageSummary]);

  const dimensions = useMemo(() => {
    return ImageService.getFittedDimensionsToScreen(
      imageSummary.dimensions,
      panelSizes,
    );
  }, [imageSummary, panelSizes]);

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

  const repository: Repository = RepositoriesService.getRepositoryInformation(
    imageSummary.repositoryId,
  );

  const informationData = useMemo(() => {
    return [
      {
        label: t("field.id"),
        value: <CopyText text={imageSummary.id} />,
      },
      ...(imageSummary.parentId
        ? [
            {
              label: t("field.parentId"),
              value: <CopyText text={imageSummary.parentId} />,
            },
          ]
        : []),
      {
        label: t("field.repository"),
        value: <ExternalLink label={repository.url} url={repository.url} />,
      },
      {
        label: t("field.repositoryId"),
        value: <CopyText text={imageSummary.repositoryId} />,
      },
      {
        label: t("field.createdOn"),
        value: formatDate(imageSummary.fileDates.creationDate),
      },
      {
        label: t("field.modifiedOn"),
        value: formatDate(imageSummary.fileDates.modificationDate),
      },
      {
        label: t("field.dimensions"),
        value: `${imageSummary.dimensions.width}x${imageSummary.dimensions.height}`,
      },
      ...(imageSummary.sourceUrl
        ? [
            {
              label: t("field.sourceUrl"),
              value: (
                <ExternalLink
                  label={imageSummary.sourceUrl}
                  url={imageSummary.sourceUrl}
                />
              ),
            },
          ]
        : []),
      {
        label: t("field.location"),
        value: <ExternalLink label={imageSummary.url} url={imageSummary.url} />,
      },
    ];
  }, [imageSummary]);

  const imageMetadata = useMemo(() => {
    if (!imageData) {
      return undefined;
    }
    const metadata: ImageMetadata = imageData.metadata;
    // We exclude the empty metadata entities
    return Object.entries(metadata).filter(([_key, value]) => value !== undefined && value !== "{}").map(([key, value]) => {
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

  function handleOnPanelSizeChange(size: number[]) {
    StorageService.setVisualizerPanelSizes(size);
    setPanelSizes(size);
  }

  return (
    <Overlay
      className={style.overlay}
      onClick={handleOnCloseFromOverlay}
      color="#000"
      backgroundOpacity={0.95}
    >
      <div className={style.container}>
        <PanelGroup direction="horizontal" onLayout={handleOnPanelSizeChange}>
          <Panel defaultSize={panelSizes[0]} minSize={40}>
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
                  imageSummary.uri,
                  dimensions.width,
                  dimensions.height,
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
          <PanelResizeHandle className={style.paneSeparator}>
            <div className={style.paneSeparatorHandle} />
          </PanelResizeHandle>
          <Panel defaultSize={panelSizes[1]} minSize={20}>
            <div className={style.informationContainer}>
              <div className={style.header}>
                <div className={style.titleContainer}>
                  <div className={style.titleBox}>
                    <div className={style.title}>
                      <CopyText size="md" text={imageSummary.name} />
                      <Text c="dimmed" size="sm">
                        {imageSummary.format} —{" "}
                        {formatSize(imageSummary.sizeInBytes)}
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
                    <ImageItemMenu imageSummary={imageSummary} />
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
                  "generator",
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
                                value: imageTag.value,
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
                            const tableValue = imageFeature.format === "json" ?
                              <CodeViewer code={imageFeature.value} /> : (imageFeature.format === "markdown" ?
                                // We need to handle the specific case the linebreak "<br>", because the library does not handle it properly by default
                                <Markdown>{(value as string).replace(/<br>/ig, "\n \n")}</Markdown> : (typeof value === "string" ? capitalizeText(value) : (typeof value === "number" ? value.toString() : (typeof value === "boolean" ? value.toString() : value))));
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
        </PanelGroup>
      </div>
    </Overlay>
  );
}
