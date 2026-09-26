import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, ActionIcon, Badge, Box, Button, Divider, Flex, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAdjustmentsHorizontal,
  IconCamera,
  IconColorSwatch,
  IconEye,
  IconEyeOff,
  IconFileCode,
  IconFileDescription,
  IconInfoCircle,
  IconPhoto,
  IconTag
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  boolean,
  createUiContainer,
  divider,
  flowing,
  identifier,
  json,
  numberUnbounded,
  string,
  StringRepresentation,
  stringUrl,
  table,
  tableColumn,
  TableColumnAlign,
  TableColumnWidthMode,
  tableRow,
  TableRow,
  TextIntensity,
  TextWeight,
  timestamp,
  UiContainer,
  UiElement,
  xml
} from "@picteus/shared-core";

import {
  ExtensionImageFeature,
  GenerationRecipe,
  GenerationRecipeFromJSON,
  Image,
  ImageFeatureFormat,
  ImageFeatureType,
  ImageMetadata as PicteusImageMetadata
} from "@picteus/ws-client";


import { ViewMode } from "types";
import { capitalizeText } from "utils";
import { useOpenBrowser, useRepository } from "app/hooks";
import { useActionModalContext } from "app/context";
import { StorageService } from "app/services";
import {
  CodeViewer,
  Common,
  CopyText,
  freeForm,
  ImageTag,
  Markdown,
  UiContainerView,
  UiElementViewProvider
} from "app/components";

import { ImageDataCard, ImageFeatureCard, ImageFeatureContainerType, ImageItemWrapper } from "../index.ts";

import { RepositoryDetail, RepositoryTop } from "../../../../screens/RepositoriesScreen/components";
import {
  computeRecipeCommonRows,
  createSchemaComplianceUiContainer,
  featureTypeComparison,
  inferNonUiElement,
  isDisplayedInFeatureTypeCards,
  isDisplayedInRecipeCard,
  parseFeatureUiContainer,
  SORTED_FEATURE_TYPES
} from "./ImageDataComputer.ts";
import ImageFeatureSettings, { ImageDataDrawerSectionItemType } from "./ImageFeatureSettings.tsx";


type MetadataSourceConfigurationType =
  {
    readonly labelKey: string;
    readonly icon: ReactNode;
    readonly color: string;
  };

const METADATA_SOURCES_CONFIGURATION: Record<keyof PicteusImageMetadata, MetadataSourceConfigurationType> =
  {
    all:
      {
        labelKey: "imageDetail.metadataSources.all",
        icon: <IconInfoCircle size={Common.IconSmallSize}/>,
        color: "gray"
      },
    exif:
      {
        labelKey: "imageDetail.metadataSources.exif",
        icon: <IconCamera size={Common.IconSmallSize}/>,
        color: "blue"
      },
    iptc:
      {
        labelKey: "imageDetail.metadataSources.iptc",
        icon: <IconFileDescription size={Common.IconSmallSize}/>,
        color: "cyan"
      },
    xmp:
      {
        labelKey: "imageDetail.metadataSources.xmp",
        icon: <IconFileCode size={Common.IconSmallSize}/>,
        color: "violet"
      },
    icc:
      {
        labelKey: "imageDetail.metadataSources.icc",
        icon: <IconColorSwatch size={Common.IconSmallSize}/>,
        color: "teal"
      },
    tiffTagPhotoshop:
      {
        labelKey: "imageDetail.metadataSources.tiffTagPhotoshop",
        icon: <IconPhoto size={Common.IconSmallSize}/>,
        color: "indigo"
      },
    others:
      {
        labelKey: "imageDetail.metadataSources.others",
        icon: <IconTag size={Common.IconSmallSize}/>,
        color: "gray"
      }
  };

type ImageDataType = {
  image: Image;
  viewMode: ViewMode;
};

export default function ImageData({ image, viewMode }: ImageDataType)
{
  const [ t ] = useTranslation();
  const [ , addModal ] = useActionModalContext();
  const openBrowser = useOpenBrowser();
  const { data: repository } = useRepository(image.repositoryId);
  const builtInSectionIds =
    {
      information: "information",
      tags: "tags",
      recipe: "recipe",
      rawFeatures: "rawFeatures",
      metadata: "metadata"
    } as const;
  const [ accordionValue, setAccordionValue ] = useState<string[]>(StorageService.getImageDetailTraits([ builtInSectionIds.information, builtInSectionIds.tags, builtInSectionIds.recipe ]));

  const defaultOrder = useMemo<string[]>(() =>
      [
        builtInSectionIds.information,
        builtInSectionIds.tags,
        builtInSectionIds.recipe,
        ...SORTED_FEATURE_TYPES.map((type) => `feature:${type}`),
        builtInSectionIds.rawFeatures,
        builtInSectionIds.metadata
      ],
    [ SORTED_FEATURE_TYPES ]
  );

  const [ hiddenSectionIds, setHiddenSectionIds ] = useState<string[]>(
    () => StorageService.getImageDetailHiddenSections([])
  );
  const [ sectionsOrder, setSectionsOrder ] = useState<string[]>(
    () => StorageService.getImageDetailSectionsOrder(defaultOrder)
  );
  const [ isDrawerOpened, { open: openDrawer, close: closeDrawer } ] = useDisclosure(false);

  useEffect(() =>
  {
    StorageService.setImageDetailTraits(accordionValue);
  }, [ accordionValue ]);

  useEffect(() =>
  {
    StorageService.setImageDetailHiddenSections(hiddenSectionIds);
  }, [ hiddenSectionIds ]);

  useEffect(() =>
  {
    StorageService.setImageDetailSectionsOrder(sectionsOrder);
  }, [ sectionsOrder ]);

  function toggleSection(sectionId: string): void
  {
    setAccordionValue(
      (previous) =>
        previous.includes(sectionId)
          ? previous.filter((id) => id !== sectionId)
          : [ ...previous, sectionId ]
    );
  }

  function hideSection(sectionId: string): void
  {
    setHiddenSectionIds((previous) =>
      previous.includes(sectionId) ? previous : [ ...previous, sectionId ]
    );
  }

  function toggleSectionVisibility(sectionId: string): void
  {
    setHiddenSectionIds((previous) =>
      previous.includes(sectionId)
        ? previous.filter((id) => id !== sectionId)
        : [ ...previous, sectionId ]
    );
  }

  function restoreAllSections(): void
  {
    setHiddenSectionIds([]);
  }

  function resetDefaults(): void
  {
    setHiddenSectionIds([]);
    setSectionsOrder(defaultOrder);
  }

  const informationCard = useMemo<ReactElement>(() =>
    {
      const rows: TableRow[] = [];
      const labelOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };

      if (image.parentId)
      {
        rows.push(tableRow([
          string(t("field.parent"), labelOptions),
            freeForm(<ImageItemWrapper imageId={image.parentId} edge={100} viewMode={viewMode}/>)
          ])
        );
      }

      if (repository)
      {
        rows.push(
          tableRow([
            string(t("field.repository"), labelOptions),
            flowing([
              string(repository.name),
              freeForm(<Tooltip
                label={t("button.open")}
                position="right"
              >
                <ActionIcon
                  variant="default"
                  onClick={() =>
                  {
                    addModal({
                      title: <RepositoryTop repository={repository} onDeleted={() =>
                      {
                      }}/>,
                      size: "m",
                      component: <RepositoryDetail repository={repository}/>
                    });
                  }}
                >
                  <IconEye/>
                </ActionIcon>
              </Tooltip>)
            ])
          ])
        );
      }
      else if (image.repositoryId)
      {
        rows.push(
          tableRow([
            string(t("field.repository"), labelOptions),
            identifier(image.repositoryId, { modifiers: { monospace: true, copyable: true } })
          ])
        );
      }

      rows.push(tableRow([
        string(t("field.createdOn"), labelOptions),
          timestamp(image.fileDates.creationDate)
        ])
      );
      rows.push(tableRow([
        string(t("field.modifiedOn"), labelOptions),
          timestamp(image.fileDates.modificationDate)
        ])
      );
      rows.push(tableRow([
        string(t("field.importedOn"), labelOptions),
          timestamp(image.creationDate)
        ])
      );

      if (image.sourceUrl)
      {
        rows.push(
          tableRow([
            string(t("field.sourceUrl"), labelOptions),
            stringUrl(image.sourceUrl, { modifiers: { copyable: true } })
          ])
        );
      }

      const uiContainer = createUiContainer({
        elements: [
          table(rows, {
            columns: [
              tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
              tableColumn({ align: TableColumnAlign.left })
            ]
          })
        ]
      });

      return (<ImageDataCard
        header={(<Text fw={600} size="sm">
            {t("imageDetail.information")}
          </Text>
        )}
        isOpened={accordionValue.includes(builtInSectionIds.information)}
        onToggle={() =>
        {
          toggleSection(builtInSectionIds.information);
        }}
        onHide={() =>
        {
          hideSection(builtInSectionIds.information);
        }}
      >
        <UiContainerView uiContainer={uiContainer}/>
      </ImageDataCard>);
    },
    [ image, repository, viewMode, accordionValue ]
  );

  const tagsCard = useMemo<ReactElement | null>(() =>
    {
      if (!image.tags || image.tags.length === 0)
      {
        return null;
      }

      return (<ImageDataCard
        header={(<>
            <Text fw={600} size="sm">
              {t("imageDetail.tags")}
            </Text>
            <Badge size="xs" variant="light" color="gray">
              {image.tags.length}
            </Badge>
          </>
        )}
        isOpened={accordionValue.includes(builtInSectionIds.tags)}
        onToggle={() =>
        {
          toggleSection(builtInSectionIds.tags);
        }}
        onHide={() =>
        {
          hideSection(builtInSectionIds.tags);
        }}
      >
        <Group gap="xs">
          {image.tags.map((imageTag, index) =>
            (<ImageTag key={`tag-${index}`} tag={imageTag} kind="badge"/>)
          )}
        </Group>
      </ImageDataCard>);
    },
    [ image.tags, accordionValue ]
  );

  const recipeFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.type === ImageFeatureType.Recipe), [ image ]
  );

  const rawFeatures = useMemo<ExtensionImageFeature[]>(() =>
      image.features.filter((imageFeature) => !isDisplayedInRecipeCard(imageFeature) && !isDisplayedInFeatureTypeCards(imageFeature)).sort((feature1, feature2) => featureTypeComparison(feature1.type, feature2.type)),
    [ image.features, SORTED_FEATURE_TYPES ]
  );

  const recipeCard = useMemo<ReactElement | null>(() =>
    {
      if (recipeFeatures.length === 0)
      {
        return null;
      }

      function extractRecipe(feature: ExtensionImageFeature): GenerationRecipe | undefined
      {
        try
        {
          const parsed = typeof feature.value === "string" ? JSON.parse(feature.value) : feature.value;
          return GenerationRecipeFromJSON(parsed);
        }
        catch (error)
        {
          return undefined;
        }
      }

      function convertRecipeToContainer(generationRecipe: GenerationRecipe | undefined): UiContainer
      {
        if (generationRecipe === undefined)
        {
          return createSchemaComplianceUiContainer();
        }

        const rows = computeRecipeCommonRows(generationRecipe);
        if (generationRecipe.prompt && typeof generationRecipe.prompt === "object")
        {
          const options = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
          const prompt = generationRecipe.prompt;
          if ("text" in prompt && prompt.text)
          {
            rows.push(tableRow([
              string(t("field.prompt"), options),
              string(prompt.text, { modifiers: { copyable: true }, representation: StringRepresentation.multiline })
              ])
            );
          }
          else if ("value" in prompt && prompt.value)
          {
            if (Object.keys(prompt.value).length > 0)
            {
              // We ignore the instructions when empty
              rows.push(
                tableRow([
                  string(t("field.instructions"), options),
                  json(JSON.stringify(prompt.value, undefined, 2), { modifiers: { copyable: true } })
                ])
              );
            }
          }
        }

        return createUiContainer({
          elements: [ table(
            rows,
            {
              columns: [
                tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
                tableColumn({ align: TableColumnAlign.left })
              ]
            }
          ) ]
        });
      }

      function augmentUiContainer(feature: ExtensionImageFeature, container: UiContainer): UiContainer
      {
        const vectorialFeature = recipeFeatures.find((candidateFeature) => candidateFeature.id === feature.id && candidateFeature.format === ImageFeatureFormat.Json);
        if (vectorialFeature !== undefined)
        {
          const generationRecipe = extractRecipe(vectorialFeature);
          if (generationRecipe !== undefined)
          {
            const rows = computeRecipeCommonRows(generationRecipe);
            if (rows.length > 0)
            {
              container.elements.splice(0, 0, table(rows, {
                withRowSeparators: true,
                columns: [
                  tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
                  tableColumn({ align: TableColumnAlign.left }) ]
              }), divider());
            }
          }
        }
        return container;
      }

      // We group recipe features by extension identifier
      const featuresByExtensionMap = new Map<string, ExtensionImageFeature[]>();
      for (const feature of recipeFeatures)
      {
        let extensionFeatures = featuresByExtensionMap.get(feature.id);
        if (extensionFeatures === undefined)
        {
          extensionFeatures = [];
          featuresByExtensionMap.set(feature.id, extensionFeatures);
        }
        extensionFeatures.push(feature);
      }

      const featureContainers: ImageFeatureContainerType[] = [];
      for (const extensionFeatures of featuresByExtensionMap.values())
      {
        const uiFeatures = extensionFeatures.filter((feature) => feature.format === ImageFeatureFormat.Ui);
        if (uiFeatures.length > 0)
        {
          for (const feature of uiFeatures)
          {
            const container = augmentUiContainer(feature, parseFeatureUiContainer(feature));
            featureContainers.push(
              {
                extensionId: feature.id,
                type: feature.type,
                name: feature.name,
                uiContainer: container
              }
            );
          }
        }
        else
        {
          for (const feature of extensionFeatures)
          {
            const container = feature.format === ImageFeatureFormat.Json ? convertRecipeToContainer(extractRecipe(feature)) : UiContainer.builder().add(inferNonUiElement(feature)).build();
            featureContainers.push(
              {
                extensionId: feature.id,
                type: feature.type,
                name: feature.name,
                uiContainer: container
              }
            );
          }
        }
      }

      if (featureContainers.length === 0)
      {
        return null;
      }

      return (<ImageFeatureCard
        title={t("imageDetail.recipe")}
        featureContainers={featureContainers}
        isOpened={accordionValue.includes(builtInSectionIds.recipe)}
        onToggle={() =>
        {
          toggleSection(builtInSectionIds.recipe);
        }}
        onHide={() =>
        {
          hideSection(builtInSectionIds.recipe);
        }}
      />);
    },
    [ recipeFeatures, accordionValue ]
  );

  type FeatureTypeCardEntryType =
    {
      readonly type: ImageFeatureType;
      readonly card: ReactElement;
      readonly count: number;
    };

  const featureTypeCards = useMemo<FeatureTypeCardEntryType[]>(() =>
    {
      // We collect all distinct feature types that have UI or eligible non-UI features
      const distinctTypesSet = new Set<ImageFeatureType>();
      for (const feature of image.features)
      {
        if (isDisplayedInFeatureTypeCards(feature))
        {
          distinctTypesSet.add(feature.type);
        }
      }
      const orderedTypes = Array.from(distinctTypesSet).sort(featureTypeComparison);

      return orderedTypes.map((type) =>
        {
          const featuresForType = image.features.filter((feature) => feature.type === type && isDisplayedInFeatureTypeCards(feature));

          // We determine all distinct extension identifiers providing this feature type
          const extensionIds = Array.from(new Set(featuresForType.map((feature) => feature.id)));

          const featureContainers: ImageFeatureContainerType[] = [];
          for (const extensionId of extensionIds)
          {
            const extensionUiFeatures = featuresForType.filter((feature) => feature.id === extensionId && isDisplayedInFeatureTypeCards(feature));

            // First, we add all UI features for this extension
            for (const uiFeature of extensionUiFeatures)
            {
              featureContainers.push(
                {
                  extensionId,
                  type,
                  name: uiFeature.name,
                  uiContainer: uiFeature.format === ImageFeatureFormat.Ui
                    ? parseFeatureUiContainer(uiFeature)
                    : UiContainer.builder().add(inferNonUiElement(uiFeature)).build()
                }
              );
            }
          }

          const sectionId = `feature:${type}`;

          return {
            type,
            count: featureContainers.length,
            card: (
              <ImageFeatureCard
                key={`feature-type-${type}`}
                title={t(`imageDetail.type.${type}`)}
                featureContainers={featureContainers}
                isOpened={accordionValue.includes(sectionId)}
                onToggle={() =>
                {
                  toggleSection(sectionId);
                }}
                onHide={() =>
                {
                  hideSection(sectionId);
                }}
              />
            )
          };
        }
      );
    },
    [ image.features, SORTED_FEATURE_TYPES, accordionValue ]
  );

  const rawFeatureCard = useMemo<ReactElement | null>(() =>
    {
      if (rawFeatures.length === 0)
      {
        return null;
      }

      const rawFeatureContainers: ImageFeatureContainerType[] = rawFeatures.map(
        (rawFeature) =>
        {
          const featureName = rawFeature.name !== undefined
            ? `${capitalizeText(rawFeature.type)} (${rawFeature.name})`
            : capitalizeText(rawFeature.type);

          return {
            extensionId: rawFeature.id,
            type: rawFeature.type,
            name: featureName,
            uiContainer: rawFeature.format === ImageFeatureFormat.Ui
              ? parseFeatureUiContainer(rawFeature)
              : UiContainer.builder().add(inferNonUiElement(rawFeature)).build()
          };
        }
      );

      return (<ImageFeatureCard
        title={t("imageDetail.rawFeatures")}
        featureContainers={rawFeatureContainers}
        isOpened={accordionValue.includes(builtInSectionIds.rawFeatures)}
        onToggle={() =>
        {
          toggleSection(builtInSectionIds.rawFeatures);
        }}
        onHide={() =>
        {
          hideSection(builtInSectionIds.rawFeatures);
        }}
      />);
    },
    [ rawFeatures, accordionValue ]
  );

  const metadataCard = useMemo<ReactElement | null>(() =>
    {
      const metadata: PicteusImageMetadata = image.metadata;

      function inferMetadataUiContainer(value: string): UiContainer
      {
        const copyableOptions = { modifiers: { copyable: true } };
        const labelOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };

        function convertValueToUiElement(propertyValue: unknown): UiElement
        {
          if (propertyValue === null || propertyValue === undefined)
          {
            return string("-", copyableOptions);
          }

          if (typeof propertyValue === "boolean")
          {
            return boolean(propertyValue);
          }

          if (typeof propertyValue === "number")
          {
            return numberUnbounded(propertyValue, copyableOptions);
          }

          if (typeof propertyValue === "string")
          {
            const trimmedValue = propertyValue.trim();
            if (trimmedValue.startsWith("<") && trimmedValue.endsWith(">"))
            {
              return xml(propertyValue, copyableOptions);
            }

            if ((trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) || (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")))
            {
              try
              {
                const parsedNested = JSON.parse(trimmedValue);
                return json(JSON.stringify(parsedNested, undefined, 2), copyableOptions);
              }
              catch (error)
              {
                // We treat unparseable strings as standard text
              }
            }

            if (trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://"))
            {
              return stringUrl(trimmedValue, copyableOptions);
            }

            return string(propertyValue, { ...copyableOptions, representation: StringRepresentation.multiline });
          }

          if (typeof propertyValue === "object")
          {
            return json(JSON.stringify(propertyValue, undefined, 2), copyableOptions);
          }

          return string(String(propertyValue), copyableOptions);
        }

        let element: UiElement;

        try
        {
          const parsed = JSON.parse(value);
          if (typeof parsed === "object" && parsed !== null && Array.isArray(parsed) === false)
          {
            const entries = Object.entries(parsed as Record<string, unknown>);
            if (entries.length > 0)
            {
              const rows: TableRow[] = entries.map(([ propertyKey, propertyValue ]) =>
                tableRow([
                  string(propertyKey, labelOptions),
                  convertValueToUiElement(propertyValue)
                ])
              );

              element = table(rows, {
                columns: [
                  tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
                  tableColumn({ align: TableColumnAlign.left })
                ]
              });
            }
            else
            {
              element = json("{}", copyableOptions);
            }
          }
          else if (Array.isArray(parsed))
          {
            element = json(JSON.stringify(parsed, undefined, 2), copyableOptions);
          }
          else
          {
            element = convertValueToUiElement(parsed);
          }
        }
        catch (error)
        {
          const trimmedValue = value.trim();
          if (trimmedValue.startsWith("<") && trimmedValue.endsWith(">"))
          {
            element = xml(value, copyableOptions);
          }
          else
          {
            element = string(value, { ...copyableOptions, representation: StringRepresentation.multiline });
          }
        }

        return createUiContainer({
          elements: [ element ]
        });
      }

      type MetadataSourceEntryType =
        {
          readonly name?: string;
          readonly uiContainer: UiContainer;
        };

      type MetadataSourceGroupType =
        {
          readonly id: string;
          readonly label: string;
          readonly icon: ReactNode;
          readonly color: string;
          readonly entries: MetadataSourceEntryType[];
        };

      const sourceGroups: MetadataSourceGroupType[] = [];

      // We process the built-in image.metadata entries in canonical order
      if (metadata !== undefined && metadata !== null)
      {
        for (const [ metadataKey, sourceConfiguration ] of Object.entries(METADATA_SOURCES_CONFIGURATION))
        {
          const rawValue = metadata[metadataKey as keyof PicteusImageMetadata];
          if (rawValue !== undefined && rawValue !== "{}" && rawValue.trim().length > 0)
          {
            sourceGroups.push({
              id: metadataKey,
              label: t(sourceConfiguration.labelKey),
              icon: sourceConfiguration.icon,
              color: sourceConfiguration.color,
              entries: [ { uiContainer: inferMetadataUiContainer(rawValue) } ]
            });
          }
        }
      }

      const totalEntriesCount = sourceGroups.reduce((count, group) => count + group.entries.length, 0);
      if (totalEntriesCount === 0)
      {
        return null;
      }

      return (<ImageDataCard
        header={<>
          <Text fw={600} size="sm">
            {t("imageDetail.metadata")}
          </Text>
          {totalEntriesCount > 1 && (
            <Badge size="xs" variant="light" color="gray">
              {totalEntriesCount}
            </Badge>
          )}
        </>}
        isOpened={accordionValue.includes(builtInSectionIds.metadata)}
        onToggle={() =>
        {
          toggleSection(builtInSectionIds.metadata);
        }}
        onHide={() =>
        {
          hideSection(builtInSectionIds.metadata);
        }}
      >
        <Stack gap="md">
          {sourceGroups.map(
            (sourceGroup, sourceIndex) =>
            {
              return (
                <Box key={sourceGroup.id}>
                  {sourceIndex > 0 && <Divider mb="sm"/>}
                  <Flex align="center" gap="xs" mb="xs">
                    <Badge
                      size="sm"
                      variant="light"
                      color={sourceGroup.color}
                      leftSection={sourceGroup.icon}
                      radius="sm"
                    >
                      {sourceGroup.label}
                    </Badge>
                  </Flex>
                  <Stack gap="xs">
                    {sourceGroup.entries.map(
                      (entry, entryIndex) =>
                      {
                        return (
                          <Box key={`entry-${entryIndex}`}>
                            {entry.name && (
                              <Text size="xs" fw={600} c="dimmed" mb="xs">
                                {entry.name}
                              </Text>
                            )}
                            <UiContainerView uiContainer={entry.uiContainer}/>
                          </Box>
                        );
                      }
                    )}
                  </Stack>
                </Box>
              );
            }
          )}
        </Stack>
      </ImageDataCard>);
    },
    [ image.metadata, accordionValue ]
  );

  type SectionDefinitionType =
    {
      readonly id: string;
      readonly label: string;
      readonly node: ReactElement;
      readonly badge?: string | number;
    };

  const allAvailableSections = useMemo((): SectionDefinitionType[] => ([
    {
      id: builtInSectionIds.information,
      label: t("imageDetail.information"),
      node: informationCard
    },
    ...(tagsCard !== null ? [ {
      id: builtInSectionIds.tags,
      label: t("imageDetail.tags"),
      node: tagsCard,
      badge: image.tags?.length
    } ] : []),
    ...(recipeCard !== null ? [ {
      id: builtInSectionIds.recipe,
      label: t("imageDetail.recipe"),
      node: recipeCard
    } ] : []),
    ...featureTypeCards.map(({ type, card, count }) => ({
      id: `feature:${type}`,
      label: t(`imageDetail.type.${type}`),
      node: card,
      badge: count
    })),
    ...(rawFeatureCard !== null ? [ {
      id: builtInSectionIds.rawFeatures,
      label: t("imageDetail.rawFeatures"),
      node: rawFeatureCard
    } ] : []),
    ...(metadataCard !== null ? [ {
      id: builtInSectionIds.metadata,
      label: t("imageDetail.metadata"),
      node: metadataCard
    } ] : [])
  ]), [ informationCard, tagsCard, recipeCard, featureTypeCards, rawFeatureCard, metadataCard, image.tags, t ]);

  const effectiveSectionsOrder = useMemo<string[]>(() =>
    {
      const missingIds = allAvailableSections.map((section) => section.id).filter((id) => !sectionsOrder.includes(id));
      if (missingIds.length === 0)
      {
        return sectionsOrder;
      }
      return [ ...sectionsOrder, ...missingIds ];
    },
    [ allAvailableSections, sectionsOrder ]
  );

  const sortedAvailableSections = useMemo((): SectionDefinitionType[] =>
    {
      const orderMap = new Map<string, number>();
      effectiveSectionsOrder.forEach((id, index) => orderMap.set(id, index));
      return [ ...allAvailableSections ].sort((firstSection, secondSection) =>
      {
        const firstIndex = orderMap.get(firstSection.id) ?? Number.MAX_SAFE_INTEGER;
        const secondIndex = orderMap.get(secondSection.id) ?? Number.MAX_SAFE_INTEGER;
        return firstIndex - secondIndex;
      });
    },
    [ allAvailableSections, effectiveSectionsOrder ]
  );

  const visibleSections = useMemo((): SectionDefinitionType[] => sortedAvailableSections.filter((section) => !hiddenSectionIds.includes(section.id)),
    [ sortedAvailableSections, hiddenSectionIds ]
  );

  const drawerSections = useMemo((): ImageDataDrawerSectionItemType[] =>
    {
      return sortedAvailableSections.map((section) => ({
        id: section.id,
        label: section.label,
        isVisible: !hiddenSectionIds.includes(section.id),
        badge: section.badge
      }));
    },
    [ sortedAvailableSections, hiddenSectionIds ]
  );

  function handleReorder(reorderedSections: ImageDataDrawerSectionItemType[]): void
  {
    const reorderedIds = reorderedSections.map((section) => section.id);
    const remainingIds = effectiveSectionsOrder.filter((id) => !reorderedIds.includes(id));
    const newOrder = [ ...reorderedIds, ...remainingIds ];
    setSectionsOrder(newOrder);
  }

  function wrapWithCopy(node: ReactNode, value: string, enabled?: boolean): ReactNode
  {
    return enabled === true ? <CopyText value={value}>{node}</CopyText> : node;
  }

  return useMemo<ReactElement>(() => (
    <UiElementViewProvider onAnchorClick={(event: React.MouseEvent<HTMLAnchorElement>, url: string) =>
    {
      event.preventDefault();
      void openBrowser(url);
    }} renderers={{
      markdown: (element, _context) => (
        wrapWithCopy(<Markdown size="sm" titleOrderOffset={3}
                               content={element.content}/>, element.content, element.modifiers?.copyable)
      ),
      xml: (element, _context) => (
        wrapWithCopy(<CodeViewer code={element.value} size="sm"
                                 language="xml"/>, element.value, element.modifiers?.copyable)
      ),
      json: (element, _context) => (
        wrapWithCopy(<CodeViewer code={element.value} size="sm"
                                 language="json"/>, element.value, element.modifiers?.copyable)
      )
    }}>
      <Flex align="center" justify="flex-end" ml="sm" mr="sm" mb="xs">
        <Group gap="xs" mt="xs">
          {hiddenSectionIds.length > 0 && (<Button
            variant="light"
            color="orange"
            size="compact-xs"
            leftSection={<IconEyeOff size={Common.IconSmallSize}/>}
            onClick={openDrawer}
          >
            {t("imageDetail.settings.reset", { count: hiddenSectionIds.length })}
          </Button>)}
          <Tooltip
            label={t("imageDetail.settings.title")}
            position="left"
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={openDrawer}
            >
              <IconAdjustmentsHorizontal size={18}/>
            </ActionIcon>
          </Tooltip>
        </Group>
      </Flex>
      <Accordion
        multiple
        value={accordionValue}
        onChange={setAccordionValue}
      >
        <Stack gap="md" ml="sm" mr="sm" mb="sm">
          {visibleSections.map((section) => (<Box key={section.id}>{section.node}</Box>))}
        </Stack>
      </Accordion>
      <ImageFeatureSettings
        opened={isDrawerOpened}
        onClose={closeDrawer}
        sections={drawerSections}
        onToggleVisibility={toggleSectionVisibility}
        onReorder={handleReorder}
        onRestoreAll={restoreAllSections}
        onResetDefaults={resetDefaults}
      />
    </UiElementViewProvider>
  ), [ visibleSections, accordionValue, isDrawerOpened, drawerSections, hiddenSectionIds, openDrawer, closeDrawer, t ]);
}
