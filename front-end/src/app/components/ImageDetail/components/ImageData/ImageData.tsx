import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, ActionIcon, Flex, Group, Table, Text, Tooltip } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

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
import { useActionModalContext } from "app/context";
import { useRepository } from "app/hooks";
import { StorageService } from "app/services";
import {
  CodeViewer,
  CopyText,
  ExtensionIcon,
  ExternalLink,
  FormatedDate,
  ImageTag,
  Markdown,
  UiElementViewProvider
} from "app/components";
import {
  booleanPlain,
  createUiContainer,
  html,
  identifier,
  json,
  markdown,
  multiSlot,
  numberUnbounded,
  ratio,
  slot,
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
  UiContainer,
  UiElement,
  xml
} from "@picteus/shared-core";
import { ImageFeature, ImageFeatureCard, ImageMetadata, TableComponent } from "../index.ts";
import { RepositoryDetail, RepositoryTop } from "../../../../screens/RepositoriesScreen/components";
import ImageItemWrapper from "../ImageItemWrapper/ImageItemWrapper.tsx";


type ImageDataType = {
  image: Image;
  viewMode: ViewMode;
};

export default function ImageData({ image, viewMode }: ImageDataType)
{
  const [ t ] = useTranslation();
  const { data: repository } = useRepository(image.repositoryId);
  const [ , addModal ] = useActionModalContext();
  const sectionIds = {
    information: "information",
    tags: "tags",
    recipe: "recipe",
    features: "features",
    newFeatures: "newFeatures",
    metadata: "metadata"
  };
  const [ accordionValue, setAccordionValue ] = useState<string[]>(StorageService.getImageDetailTraits([ sectionIds.information, sectionIds.tags, sectionIds.recipe, sectionIds.features ]));

  useEffect(() =>
  {
    StorageService.setImageDetailTraits(accordionValue);
  }, [ accordionValue ]);

  type LabelAndValue = { label: ReactNode, value: ReactNode };

  const information = useMemo<ReactElement []>(() =>
  {
    const labelAndValues: LabelAndValue [] = [
      ...(image.parentId
        ? [
          {
            label: t("field.parent"),
            value: <ImageItemWrapper imageId={image.parentId} edge={100} viewMode={viewMode}/>
          }
        ]
        : []),
      {
        label: t("field.repository"),
        value: repository
          ? (
            <Flex align="center" gap={10}>
              <Text size="sm">{repository.name}</Text>
              <Tooltip
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
              </Tooltip>
            </Flex>
          )
          : (
            <Text size="sm" c="dimmed">
              {image.repositoryId}
            </Text>
          )
      },
      {
        label: t("field.createdOn"),
        value: <FormatedDate timestamp={image.fileDates.creationDate}/>
      },
      {
        label: t("field.modifiedOn"),
        value: <FormatedDate timestamp={image.fileDates.modificationDate}/>
      },
      ...(image.sourceUrl
        ? [
          {
            label: t("field.sourceUrl"),
            value: <ExternalLink url={image.sourceUrl} type="link"/>
          }
        ]
        : [])
    ];
    return labelAndValues.map((information, index) => (
      <TableComponent
        key={`information-${index}`}
        label={information.label}
        value={information.value}
      />
    ));
  }, [ image, repository ]);

  const tags = useMemo<ReactElement>(() => (<TableComponent label="" value={<Group gap="xs">
      {image.tags.map((imageTag, index) => (
        <ImageTag key={`tag-${index}`} tag={imageTag} kind="badge"/>
      ))}
    </Group>}/>
  ), [ image ]);

  const sortedFeatureTypes: ImageFeatureType[] = Object.keys(ImageFeatureType) as ImageFeatureType [];

  const recipeFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.type === ImageFeatureType.Recipe), [ image ]
  );
  const nonRecipeAndNonUiFeatures = useMemo<ExtensionImageFeature[]>(() => image.features.filter((imageFeature) => imageFeature.type !== ImageFeatureType.Recipe && imageFeature.format !== ImageFeatureFormat.Ui).sort((feature1: ExtensionImageFeature, feature2: ExtensionImageFeature) =>
      {
        const index1 = sortedFeatureTypes.indexOf(feature1.type);
        const index2 = sortedFeatureTypes.indexOf(feature2.type);
        if (index1 !== index2)
        {
          return index1 - index2;
        }
        return 0;
      }
    ), [ image ]
  );

  const technicalFeatures = useMemo<ReactElement[]>(() =>
    {
      return [ ...recipeFeatures, ...nonRecipeAndNonUiFeatures ].map((imageFeature, index) =>
        {
          return (
            <TableComponent
              key={`feature-${index}`}
              label={
                <Flex gap={10}>
                  <ExtensionIcon idOrExtension={imageFeature.id} size="sm"/>
                  {`${capitalizeText(imageFeature.type)} ${imageFeature.name === undefined ? "" : `(${imageFeature.name})`}`}
                </Flex>
              }
              value={<ImageFeature feature={imageFeature} viewMode={viewMode}/>}
            />
          );
        }
      );
    },
    [ recipeFeatures, nonRecipeAndNonUiFeatures, viewMode ]
  );

  const recipe = useMemo<ReactElement | null>(() =>
    {
      if (Math.random() < 1)
      {
        return null;
      }
      const recipeFeatures = image.features.filter((imageFeature) => imageFeature.type === ImageFeatureType.Recipe);
      if (recipeFeatures.length === 0)
      {
        return null;
      }

      function convertRecipeToBlock(generationRecipe: GenerationRecipe): UiContainer
      {
        const rows: TableRow[] = [];

        const options = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
        if (generationRecipe.schemaVersion !== undefined)
        {
          rows.push(
            tableRow([
              stringShort(t("field.schemaVersion"), options),
              numberUnbounded(generationRecipe.schemaVersion)
            ])
          );
        }

        if (generationRecipe.id)
        {
          rows.push(
            tableRow([
              stringShort(t("field.id"), options),
              identifier(generationRecipe.id, { modifiers: { monospace: true, copyable: true } })
            ])
          );
        }

        if (generationRecipe.url)
        {
          rows.push(
            tableRow([
              stringShort(t("field.url"), options),
              stringUrl(generationRecipe.url, { modifiers: { copyable: true } })
            ])
          );
        }

        if (generationRecipe.software)
        {
          rows.push(
            tableRow([
              stringShort(t("field.software"), options),
              stringShort(generationRecipe.software)
            ])
          );
        }

        if (generationRecipe.aspectRatio !== undefined)
        {
          rows.push(
            tableRow([
              stringShort(t("field.aspectRatio"), options),
              ratio(String(generationRecipe.aspectRatio))
            ])
          );
        }

        if (generationRecipe.modelTags && generationRecipe.modelTags.length > 0)
        {
          if (generationRecipe.modelTags.length === 1)
          {
            rows.push(
              tableRow([
                stringShort(t("field.modelTags"), options),
                stringShort(generationRecipe.modelTags[0], { representation: StringShortRepresentation.chip })
              ])
            );
          }
          else
          {
            rows.push(
              tableRow([
                stringShort(t("field.modelTags"), options),
                multiSlot(
                  generationRecipe.modelTags.map(
                    (tag) =>
                    {
                      return slot(stringShort(tag, { representation: StringShortRepresentation.chip }));
                    }
                  )
                )
              ])
            );
          }
        }

        if (generationRecipe.inputAssets && generationRecipe.inputAssets.length > 0)
        {
          if (generationRecipe.inputAssets.length === 1)
          {
            rows.push(
              tableRow([
                stringShort(t("field.assetIds"), options),
                identifier(generationRecipe.inputAssets[0], { modifiers: { monospace: true, copyable: true } })
              ])
            );
          }
          else
          {
            rows.push(
              tableRow([
                stringShort(t("field.assetIds"), options),
                multiSlot(
                  generationRecipe.inputAssets.map(
                    (asset) =>
                    {
                      return slot(identifier(asset, { modifiers: { monospace: true, copyable: true } }));
                    }
                  )
                )
              ])
            );
          }
        }

        if (generationRecipe.prompt && typeof generationRecipe.prompt === "object")
        {
          const prompt = generationRecipe.prompt;
          if ("text" in prompt && prompt.text)
          {
            rows.push(
              tableRow([
                stringShort(t("field.prompt"), options),
                stringLong(prompt.text, { modifiers: { copyable: true } })
              ])
            );
          }
          else if ("value" in prompt && prompt.value)
          {
            const jsonContent = typeof prompt.value === "string" ? prompt.value : JSON.stringify(prompt.value, undefined, 2);
            rows.push(
              tableRow([
                stringShort(t("field.instructions"), options),
                json(jsonContent, { modifiers: { copyable: true } })
              ])
            );
          }
        }

        const tableElement = table(
          rows,
          {
            columns: [
              tableColumn({ align: TableColumnAlign.left, width: "30%" }),
              tableColumn({ align: TableColumnAlign.left, width: "70%" })
            ],
            hasHeader: false,
            withColumnSeparators: true
          }
        );

        return createUiContainer(
          {
            elements: [ tableElement ]
          }
        );
      }

      const recipeCards = recipeFeatures.map(
        (imageFeature, index) =>
        {
          const rawValue = imageFeature.value;
          const parsedValue = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
          const recipeObject = GenerationRecipeFromJSON(parsedValue);
          const block = convertRecipeToBlock(recipeObject);
          const perExtensionIdContainers = new Map<string, UiContainer[]>([ [ imageFeature.id, [ block ] ] ]);

          return (
            <ImageFeatureCard
              key={`recipe-card-${index}`}
              title={capitalizeText(imageFeature.id)}
              type={ImageFeatureType.Recipe}
              perExtensionIdContainers={perExtensionIdContainers}
              viewMode={viewMode}
            />
          );
        }
      );

      if (recipeCards.length === 0)
      {
        return null;
      }

      return (
        <Flex direction="column" gap="md">
          {recipeCards}
        </Flex>
      );
    },
    [ image, viewMode ]
  );

  const newFeatures = useMemo<ReactElement>(() =>
    {
      if (Math.random() < 1)
      {
        return null;
      }

      function inferElement(imageFeature: ExtensionImageFeature): UiElement
      {
        const value = imageFeature.value;

        if (imageFeature.format === "json")
        {
          try
          {
            const parsedValue = typeof value === "string" ? JSON.parse(value) : value;
            if (
              parsedValue &&
              typeof parsedValue === "object" &&
              "type" in parsedValue &&
              typeof (parsedValue as { type: unknown }).type === "string"
            )
            {
              return parsedValue as UiElement;
            }
          }
          catch
          {
            // We ignore JSON parse errors and fall back to formatting as json below.
          }
        }

        const copyableOptions = { modifiers: { copyable: true } };
        let element: UiElement;
        switch (imageFeature.format)
        {
          case "json":
          {
            const jsonContent = typeof value === "string" ? value : JSON.stringify(value, undefined, 2);
            element = json(jsonContent, copyableOptions);
            break;
          }
          case "markdown":
            element = markdown(String(value), copyableOptions);
            break;
          case "xml":
            element = xml(String(value), copyableOptions);
            break;
          case "html":
            element = html(String(value));
            break;
          case "binary":
            element = stringShort("<binary>", { modifiers: { monospace: true } });
            break;
          case "string":
            element = stringLong(String(value), copyableOptions);
            break;
          case "integer":
          {
            const parsedInteger = typeof value === "number" ? value : parseInt(String(value), 10);
            element = numberUnbounded(Number.isNaN(parsedInteger) ? 0 : parsedInteger);
            break;
          }
          case "float":
          {
            const parsedFloat = typeof value === "number" ? value : parseFloat(String(value));
            element = numberUnbounded(Number.isNaN(parsedFloat) ? 0 : parsedFloat);
            break;
          }
          case "boolean":
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
        const presentFeatureTypes = Array.from(rawFeaturesByTypeMap.keys()).sort(
          (type1: ImageFeatureType, type2: ImageFeatureType) =>
          {
            const index1 = sortedFeatureTypes.indexOf(type1);
            const index2 = sortedFeatureTypes.indexOf(type2);
            if (index1 !== index2)
            {
              return (index1 === -1 ? 999 : index1) - (index2 === -1 ? 999 : index2);
            }
            return 0;
          }
        );

        return presentFeatureTypes.map(
          (featureType) =>
          {
            const rawPerExtensionFeatures = rawFeaturesByTypeMap.get(featureType) ?? new Map<string, ExtensionImageFeature[]>();
            const perExtensionIdFeatures = new Map<string, UiContainer[]>();

            for (const [ extensionId, extensionImageFeatures ] of rawPerExtensionFeatures.entries())
            {
              const rows: TableRow[] = extensionImageFeatures.map(
                (imageFeature) =>
                {
                  const nameElement = stringShort(imageFeature.name ?? "", {
                    modifiers: {
                      weight: TextWeight.heavy,
                      intensity: TextIntensity.low
                    }
                  });
                  const valueElement = inferElement(imageFeature);
                  return tableRow([ nameElement, valueElement ]);
                }
              );

              const tableElement = table(
                rows,
                {
                  columns: [
                    tableColumn({ align: TableColumnAlign.left, width: "30%" }),
                    tableColumn({ align: TableColumnAlign.left, width: "70%" })
                  ],
                  withColumnSeparators: true
                }
              );

              const block = createUiContainer(
                {
                  elements: [ tableElement ]
                }
              );

              perExtensionIdFeatures.set(extensionId, [ block ]);
            }

            return (
              <ImageFeatureCard
                key={`feature-card-${featureType}`}
                title={capitalizeText(featureType)}
                type={featureType}
                perExtensionIdContainers={perExtensionIdFeatures}
                viewMode={viewMode}
              />
            );
          }
        );
      }

      const featureCards = renderImageFeatureCards(nonRecipeAndNonUiFeatures);

      return (
        <Flex direction="column" gap="md">
          {featureCards}
        </Flex>
      );
    },
    [ nonRecipeAndNonUiFeatures, viewMode ]
  );

  const metadata = useMemo(() =>
  {
    const metadata: PicteusImageMetadata = image.metadata;
    type KeyType = "all" | "exif" | "icc" | "iptc" | "xmp" | "tiffTagPhotoshop" | "others";
    const keys: KeyType[] = [ "all", "exif", "icc", "iptc", "xmp", "tiffTagPhotoshop", "others" ];
    // We exclude the empty metadata entities
    const labelAndValues: LabelAndValue [] = keys.map(key => ({
      key,
      value: metadata[key]
    })).filter(entry => entry.value !== undefined && entry.value !== "{}").map(entry => ({
      label: entry.key,
      value: <ImageMetadata metadata={metadata} entry={entry.key}/>
    }));
    return labelAndValues.map((labelAndValue, index) => (
      <TableComponent
        key={`metadata-${index}`}
        label={labelAndValue.label}
        value={labelAndValue.value}
      />
    ));
  }, [ image ]);

  function wrapWithTable(node: ReactNode): ReactNode
  {
    return <Table layout="fixed">
      <Table.Tbody>
        {node}
      </Table.Tbody>
    </Table>;
  }

  const sections = useMemo(() => ([
    { id: sectionIds.information, mnemonic: "imageDetail.information", node: wrapWithTable(information) },
    { id: sectionIds.tags, mnemonic: "imageDetail.tags", node: wrapWithTable(tags) },
    ...(recipe !== null ? [ { id: sectionIds.recipe, mnemonic: "imageDetail.recipe", node: recipe } ] : []),
    ...(newFeatures !== null ? [ {
      id: sectionIds.newFeatures,
      mnemonic: "imageDetail.newFeatures",
      node: newFeatures
    } ] : []),
    { id: sectionIds.features, mnemonic: "imageDetail.features", node: wrapWithTable(technicalFeatures) },
    { id: sectionIds.metadata, mnemonic: "imageDetail.metadata", node: wrapWithTable(metadata) }
  ]), [ information, tags, recipe, newFeatures, technicalFeatures, metadata ]);

  function wrapWithCopy(node: ReactNode, value: string, enabled?: boolean): ReactNode
  {
    return enabled === true ? <CopyText value={value}>{node}</CopyText> : node;
  }

  return useMemo<ReactElement>(() => (<Accordion
      multiple
      value={accordionValue}
      onChange={setAccordionValue}
    >
      <UiElementViewProvider
        renderers={{
          markdown: (element, _context) => (
            wrapWithCopy(<Markdown content={element.content}/>, element.content, element.modifiers?.copyable)
          ),
          xml: (element, _context) => (
            wrapWithCopy(<CodeViewer code={element.value} language="xml"/>, element.value, element.modifiers?.copyable)
          ),
          json: (element, _context) => (
            wrapWithCopy(<CodeViewer code={element.value} language="json"/>, element.value, element.modifiers?.copyable)
          )
        }}
      >
        {sections.map((section) => (<Accordion.Item key={section.id} value={section.id}>
            <Accordion.Control key={section.id}>
              <Text size="sm" fw={500}>
                {t(section.mnemonic)}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              {section.node}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </UiElementViewProvider>
    </Accordion>)
    , [ sections, accordionValue ]);
}
