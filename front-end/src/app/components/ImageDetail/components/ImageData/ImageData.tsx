import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, ActionIcon, Badge, Box, Flex, Group, Stack, Table, Text, Tooltip } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  booleanPlain,
  CodeLanguage,
  createUiContainer,
  divider,
  flowing,
  html,
  identifier,
  json,
  markdown,
  numberUnbounded,
  ratio,
  stringCode,
  stringLong,
  stringShort,
  StringShortRepresentation,
  stringUrl,
  table,
  tableColumn,
  TableColumnAlign,
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
  CopyText,
  ExtensionIcon,
  freeForm,
  ImageTag,
  Markdown,
  UiContainerView,
  UiElementViewProvider
} from "app/components";

import {
  ImageDataCard,
  ImageFeature,
  ImageFeatureCard,
  ImageFeatureContainerType,
  ImageItemWrapper,
  TableComponent
} from "../index.ts";

import { RepositoryDetail, RepositoryTop } from "../../../../screens/RepositoriesScreen/components";


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
  const sectionIds =
    {
      information: "information",
      tags: "tags",
      recipe: "recipe",
      features: "features",
      uiFeatures: "uiFeatures",
      inferredTechnicalFeature: "inferredTechnicalFeature",
      rawFeatures: "rawFeatures",
      metadata: "metadata"
    } as const;
  const [ accordionValue, setAccordionValue ] = useState<string[]>(StorageService.getImageDetailTraits([ sectionIds.information, sectionIds.tags, sectionIds.recipe, sectionIds.features ]));

  useEffect(() =>
  {
    StorageService.setImageDetailTraits(accordionValue);
  }, [ accordionValue ]);

  const informationCard = useMemo<ReactElement>(() =>
    {
      const rows: TableRow[] = [];
      const labelOptions = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };

      if (image.parentId)
      {
        rows.push(tableRow([
            stringShort(t("field.parent"), labelOptions),
            freeForm(<ImageItemWrapper imageId={image.parentId} edge={100} viewMode={viewMode}/>)
          ])
        );
      }

      if (repository)
      {
        rows.push(
          tableRow([
            stringShort(t("field.repository"), labelOptions),
            flowing([
              stringShort(repository.name),
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
            stringShort(t("field.repository"), labelOptions),
            identifier(image.repositoryId, { modifiers: { monospace: true, copyable: true } })
          ])
        );
      }

      rows.push(tableRow([
          stringShort(t("field.createdOn"), labelOptions),
          timestamp(image.fileDates.creationDate)
        ])
      );
      rows.push(tableRow([
          stringShort(t("field.modifiedOn"), labelOptions),
          timestamp(image.fileDates.modificationDate)
        ])
      );
      rows.push(tableRow([
          stringShort(t("field.importedOn"), labelOptions),
          timestamp(image.creationDate)
        ])
      );

      if (image.sourceUrl)
      {
        rows.push(
          tableRow([
            stringShort(t("field.sourceUrl"), labelOptions),
            stringUrl(image.sourceUrl, { modifiers: { copyable: true } })
          ])
        );
      }

      const uiContainer = createUiContainer({
        elements: [
          table(rows, {
            columns: [
              tableColumn({ align: TableColumnAlign.left }),
              tableColumn({ align: TableColumnAlign.left })
            ]
          })
        ]
      });

      return (<ImageDataCard header={(<Text fw={600} size="sm">
          {t("imageDetail.information")}
        </Text>
      )}>
        <UiContainerView uiContainer={uiContainer}/>
      </ImageDataCard>);
    },
    [ image, repository, viewMode ]
  );

  const tagsCard = useMemo<ReactElement | null>(() =>
    {
      if (!image.tags || image.tags.length === 0)
      {
        return null;
      }

      return (<ImageDataCard header={(<>
          <Text fw={600} size="sm">
            {t("imageDetail.tags")}
          </Text>
          <Badge size="xs" variant="light" color="gray">
            {image.tags.length}
          </Badge>
        </>
      )}>
        <Group gap="xs">
          {image.tags.map((imageTag, index) =>
            (<ImageTag key={`tag-${index}`} tag={imageTag} kind="badge"/>)
          )}
        </Group>
      </ImageDataCard>);
    },
    [ image.tags ]
  );

  const recipeFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.type === ImageFeatureType.Recipe), [ image ]
  );

  const sortedFeatureTypes: ImageFeatureType[] = useMemo<ImageFeatureType[]>(() => [ ImageFeatureType.Description, ImageFeatureType.Caption, ImageFeatureType.Comment, ImageFeatureType.Physics, ImageFeatureType.Annotation, ImageFeatureType.Identity, ImageFeatureType.Metadata, ImageFeatureType.Other ], []);

  function featureTypeComparison(type1: ImageFeatureType, type2: ImageFeatureType): number
  {
    return sortedFeatureTypes.indexOf(type1) - sortedFeatureTypes.indexOf(type2);
  }

  function createSchemaComplianceUiContainer(): UiContainer
  {
    return createUiContainer({
      elements: [
        stringShort(t("imageDetail.schemaComplianceError"), {
          modifiers: {
            intensity: TextIntensity.low
          }
        })
      ]
    });
  }

  function parseFeatureUiContainer(feature: ExtensionImageFeature): UiContainer
  {
    try
    {
      return UiContainer.parse(feature.value);
    }
    catch (error)
    {
      return createSchemaComplianceUiContainer();
    }
  }

  function inferNonUiElement(imageFeature: ExtensionImageFeature): UiElement
  {
    const value = imageFeature.value;
    const copyableOptions = { modifiers: { copyable: true } };
    let element: UiElement;
    switch (imageFeature.format)
    {
      case ImageFeatureFormat.Json:
      {
        const jsonContent = typeof value === "string" ? value : JSON.stringify(value, undefined, 2);
        element = json(jsonContent, copyableOptions);
        break;
      }
      case ImageFeatureFormat.Yaml:
        element = stringCode(String(value), { ...copyableOptions, language: CodeLanguage.yaml });
        break;
      case ImageFeatureFormat.Markdown:
        element = markdown(String(value), copyableOptions);
        break;
      case ImageFeatureFormat.Xml:
        element = xml(String(value), copyableOptions);
        break;
      case ImageFeatureFormat.Html:
        element = html(String(value));
        break;
      case ImageFeatureFormat.Binary:
        element = stringShort("<binary>", { modifiers: { monospace: true } });
        break;
      case ImageFeatureFormat.String:
        element = stringLong(String(value), copyableOptions);
        break;
      case ImageFeatureFormat.Integer:
      {
        const parsedInteger = typeof value === "number" ? value : parseInt(String(value), 10);
        element = numberUnbounded(Number.isNaN(parsedInteger) ? 0 : parsedInteger);
        break;
      }
      case ImageFeatureFormat.Float:
      {
        const parsedFloat = typeof value === "number" ? value : parseFloat(String(value));
        element = numberUnbounded(Number.isNaN(parsedFloat) ? 0 : parsedFloat);
        break;
      }
      case ImageFeatureFormat.Boolean:
      {
        const parsedBoolean = typeof value === "boolean" ? value : String(value) === "true";
        element = booleanPlain(parsedBoolean);
        break;
      }
      default:
        element = stringShort(String(value));
        break;
    }

    return element;
  }

  function computeRecipeCommonRows(generationRecipe: GenerationRecipe): TableRow[]
  {
    const rows: TableRow[] = [];
    const options = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
    if (generationRecipe.schemaVersion !== undefined && Math.random() > 1)
    {
      rows.push(tableRow([
          stringShort(t("field.schemaVersion"), options),
          numberUnbounded(generationRecipe.schemaVersion)
        ])
      );
    }

    if (generationRecipe.id)
    {
      rows.push(tableRow([
          stringShort(t("field.id"), options),
          identifier(generationRecipe.id, { modifiers: { monospace: true, copyable: true } })
        ])
      );
    }

    if (generationRecipe.url)
    {
      rows.push(tableRow([
          stringShort(t("field.url"), options),
          stringUrl(generationRecipe.url, { modifiers: { copyable: true } })
        ])
      );
    }

    if (generationRecipe.software)
    {
      rows.push(tableRow([ stringShort(t("field.software"), options), stringShort(generationRecipe.software, {
        modifiers: { monospace: true, copyable: true }
      }) ]));
    }

    if (generationRecipe.author)
    {
      rows.push(tableRow([ stringShort(t("field.author"), options), stringShort(generationRecipe.author, {
        modifiers: { copyable: true }
      }) ]));
    }

    if (generationRecipe.inceptionDate)
    {
      rows.push(tableRow([ stringShort(t("field.inceptionDate"), options), timestamp(generationRecipe.inceptionDate) ]));
    }

    if (generationRecipe.aspectRatio)
    {
      rows.push(tableRow([ stringShort(t("field.aspectRatio"), options), ratio(generationRecipe.aspectRatio) ]));
    }

    if (generationRecipe.modelTags?.length > 0)
    {
      rows.push(tableRow([ stringShort(t("field.modelTags"), options), flowing(generationRecipe.modelTags.map(modelTag => stringShort(modelTag, { representation: StringShortRepresentation.chip }))) ]));
    }

    if (generationRecipe.inputAssets?.length > 0)
    {
      rows.push(tableRow([
          stringShort(t("field.assetIds"), options),
          flowing(
            generationRecipe.inputAssets.map(asset => identifier(asset, {
              modifiers: {
                monospace: true,
                copyable: true
              }
            }))
          )
        ])
      );
    }

    return rows;
  }

  const nonRecipeAndNonUiFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.type !== ImageFeatureType.Recipe && imageFeature.format !== ImageFeatureFormat.Ui && imageFeature.format !== ImageFeatureFormat.Html && imageFeature.format !== ImageFeatureFormat.Markdown && !(imageFeature.format === ImageFeatureFormat.String && (imageFeature.type === ImageFeatureType.Caption || imageFeature.type === ImageFeatureType.Description || imageFeature.type === ImageFeatureType.Comment || imageFeature.type === ImageFeatureType.Physics || imageFeature.type === ImageFeatureType.Identity))).sort((feature1: ExtensionImageFeature, feature2: ExtensionImageFeature) => featureTypeComparison(feature1.type, feature2.type)), [ image ]
  );

  const inferredTechnicalFeatures = useMemo<ExtensionImageFeature[]>(() => nonRecipeAndNonUiFeatures.filter((imageFeature) => imageFeature.format !== ImageFeatureFormat.Json), [ nonRecipeAndNonUiFeatures ]
  );

  const uiFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.format === ImageFeatureFormat.Ui && imageFeature.type !== ImageFeatureType.Recipe), [ image ]
  );

  const uiLikeFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.format === ImageFeatureFormat.Html || imageFeature.format === ImageFeatureFormat.Markdown || (imageFeature.format === ImageFeatureFormat.String && (imageFeature.type === ImageFeatureType.Caption || imageFeature.type === ImageFeatureType.Description || imageFeature.type === ImageFeatureType.Comment))), [ image ]
  );

  const legacyTechnicalFeaturesCard = useMemo<ReactElement>(() =>
    {
      if (nonRecipeAndNonUiFeatures.length === 0)
      {
        return null;
      }
      return (<ImageDataCard header={<Text fw={600} size="sm">{t("imageDetail.rawFeatures")}</Text>}>
        <Table layout="fixed">
          <Table.Tbody>
            {[ ...nonRecipeAndNonUiFeatures ].map((imageFeature, index) =>
              (<TableComponent
                key={`feature-${index}`}
                label={
                  <Flex gap={10}>
                    <ExtensionIcon idOrExtension={imageFeature.id} size="sm"/>
                    {`${capitalizeText(imageFeature.type)} ${imageFeature.name === undefined ? "" : `(${imageFeature.name})`}`}
                  </Flex>
                }
                value={<ImageFeature feature={imageFeature} viewMode={viewMode}/>}
              />)
            )}
          </Table.Tbody>
        </Table>
      </ImageDataCard>);
    },
    [ nonRecipeAndNonUiFeatures, viewMode ]
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
                stringShort(t("field.prompt"), options),
                stringLong(prompt.text, { modifiers: { copyable: true } })
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
                  stringShort(t("field.instructions"), options),
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
                tableColumn({ align: TableColumnAlign.left }),
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
                hasHeader: false,
                withRowSeparators: true
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
      />);
    },
    [ recipeFeatures]
  );

  const uiFeatureCards = useMemo<ReactElement>(() =>
    {
      function computePerTypeFeatures(features: ExtensionImageFeature[]): Map<ImageFeatureType, ExtensionImageFeature[]>
      {
        return features.reduce<Map<ImageFeatureType, ExtensionImageFeature[]>>((map, feature) =>
        {
          let typeFeatures = map.get(feature.type);
          if (typeFeatures === undefined)
          {
            typeFeatures = [];
            map.set(feature.type, typeFeatures);
          }
          typeFeatures.push(feature);
          return map;
        }, new Map<ImageFeatureType, ExtensionImageFeature[]>());
      }

      const map = computePerTypeFeatures([ ...uiFeatures, ...uiLikeFeatures ]);
      const cards = [ ...map.keys() ].sort(featureTypeComparison).map((type) =>
      {
        const typeFeatures = map.get(type);
        const featureContainers: ImageFeatureContainerType[] = typeFeatures.map((feature) =>
          {
            return {
              extensionId: feature.id,
              type: feature.type,
              name: feature.name,
              uiContainer: feature.format === ImageFeatureFormat.Ui ? parseFeatureUiContainer(feature) : UiContainer.builder().add(inferNonUiElement(feature)).build()
            };
          }
        );

        return (<ImageFeatureCard
          key={`type-${type}`}
          title={t(`imageDetail.type.${type}`)}
          featureContainers={featureContainers}
        />);
      });

      return (<Flex direction="column" gap="md">{cards}</Flex>);
    },
    [ uiFeatures, uiLikeFeatures ]
  );

  const inferredTechnicalFeatureCards = useMemo<ReactElement>(() =>
    {
      function renderImageFeatureCards(imageFeatures: ExtensionImageFeature[]): ReactElement[]
      {
        // We group newFeatures by their type and extension ID
        const rawFeaturesByTypeMap = new Map<ImageFeatureType, Map<string, ExtensionImageFeature[]>>();
        for (const imageFeature of imageFeatures)
        {
          let perExtensionMap = rawFeaturesByTypeMap.get(imageFeature.type);
          if (!perExtensionMap)
          {
            perExtensionMap = new Map<string, ExtensionImageFeature[]>();
            rawFeaturesByTypeMap.set(imageFeature.type, perExtensionMap);
          }
          let featureList = perExtensionMap.get(imageFeature.id);
          if (!featureList)
          {
            featureList = [];
            perExtensionMap.set(imageFeature.id, featureList);
          }
          featureList.push(imageFeature);
        }

        // We sort the grouped feature types according to the defined display order
        const orderedFeatureTypes = Array.from(rawFeaturesByTypeMap.keys()).sort(featureTypeComparison);
        return orderedFeatureTypes.map((type) =>
          {
            const rawPerExtensionFeatures = rawFeaturesByTypeMap.get(type);
            const featureContainers: ImageFeatureContainerType[] = [];
            if (rawPerExtensionFeatures)
            {
              for (const [ extensionId, extensionImageFeatures ] of rawPerExtensionFeatures.entries())
              {
                const rows: TableRow[] = extensionImageFeatures.map((imageFeature) =>
                  {
                    return tableRow([
                      stringShort(imageFeature.name ?? "", {
                        modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low }
                      }),
                      inferNonUiElement(imageFeature)
                    ]);
                  }
                );
                featureContainers.push({
                  extensionId,
                  type: type,
                  name: undefined,
                  uiContainer: createUiContainer({
                    elements:
                      [
                        table(rows,
                          {
                            columns: [
                              tableColumn({ align: TableColumnAlign.left }),
                              tableColumn({ align: TableColumnAlign.left })
                            ],
                            withColumnSeparators: true
                          }
                        )
                      ]
                  })
                });
              }
            }

            return (<ImageFeatureCard
              key={type}
              title={t(`imageDetail.type.${type}`)}
              featureContainers={featureContainers}
            />);
          }
        );
      }

      return (<Flex direction="column" gap="md">{renderImageFeatureCards(inferredTechnicalFeatures)}</Flex>);
    },
    [ inferredTechnicalFeatures ]
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
            return stringShort("-", copyableOptions);
          }

          if (typeof propertyValue === "boolean")
          {
            return booleanPlain(propertyValue);
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

            return stringLong(propertyValue, copyableOptions);
          }

          if (typeof propertyValue === "object")
          {
            return json(JSON.stringify(propertyValue, undefined, 2), copyableOptions);
          }

          return stringShort(String(propertyValue), copyableOptions);
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
                  stringShort(propertyKey, labelOptions),
                  convertValueToUiElement(propertyValue)
                ])
              );

              element = table(rows, {
                columns: [
                  tableColumn({ align: TableColumnAlign.left }),
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
            element = stringLong(value, copyableOptions);
          }
        }

        return createUiContainer({
          elements: [ element ]
        });
      }

      // We exclude the empty metadata entities
      const validEntries = (Object.entries(metadata) as [ keyof PicteusImageMetadata, string | undefined ][])
        .filter((entry): entry is [ keyof PicteusImageMetadata, string ] =>
          entry[1] !== undefined && entry[1] !== "{}" && entry[1].trim().length > 0
        )
        .map(([ metadataKey, metadataValue ]) => ({
          key: metadataKey,
          uiContainer: inferMetadataUiContainer(metadataValue)
        }));

      if (validEntries.length === 0)
      {
        return null;
      }

      return (<ImageDataCard header={<>
        <Text fw={600} size="sm">
          {t("imageDetail.metadata")}
        </Text>
        {validEntries.length > 1 && (
          <Badge size="xs" variant="light" color="gray">
            {validEntries.length}
          </Badge>
        )}
      </>}>
        <Stack gap="md">
          {validEntries.map((entry, index) =>
            (<UiContainerView key={`meta-${index}`} uiContainer={entry.uiContainer}/>)
          )}
        </Stack>
      </ImageDataCard>);
    },
    [ image.metadata ]
  );

  const sections = useMemo(() => ([
    { id: sectionIds.information, node: informationCard },
    ...(tagsCard !== null ? [ {
      id: sectionIds.tags,
      node: tagsCard
    } ] : []),
    ...(recipeCard !== null ? [ {
      id: sectionIds.recipe,
      node: recipeCard
    } ] : []),
    { id: sectionIds.uiFeatures, node: uiFeatureCards },
    ...(inferredTechnicalFeatureCards !== null ? [ {
      id: sectionIds.inferredTechnicalFeature,
      node: inferredTechnicalFeatureCards
    } ] : []),
    ...(legacyTechnicalFeaturesCard !== null ? [ {
      id: sectionIds.rawFeatures,
      node: legacyTechnicalFeaturesCard
    } ] : []),
    ...(metadataCard !== null ? [ {
      id: sectionIds.metadata,
      node: metadataCard
    } ] : [])
  ]), [ informationCard, tagsCard, recipeCard, inferredTechnicalFeatureCards, legacyTechnicalFeaturesCard, metadataCard ]);

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
      <Accordion
        multiple
        value={accordionValue}
        onChange={setAccordionValue}
      >
        <Stack gap="md" ml="sm" mr="sm">
          {sections.map((section) => (<Box key={section.id}>{section.node}</Box>))}
        </Stack>
      </Accordion>
    </UiElementViewProvider>
  ), [ sections, accordionValue ]);
}
