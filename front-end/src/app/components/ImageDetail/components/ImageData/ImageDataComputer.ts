import i18n, { TFunction } from "i18next";

import {
  boolean,
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
  string,
  stringCode,
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
  ImageFeatureFormat,
  ImageFeatureType,
  ImageMetadata as PicteusImageMetadata
} from "@picteus/ws-client";

import { capitalizeText } from "../../../../../utils";


export const SORTED_FEATURE_TYPES: readonly ImageFeatureType[] =
  [
    ImageFeatureType.Description,
    ImageFeatureType.Caption,
    ImageFeatureType.Comment,
    ImageFeatureType.Physics,
    ImageFeatureType.Annotation,
    ImageFeatureType.Identity,
    ImageFeatureType.Metadata,
    ImageFeatureType.Other
  ] as const;

export const METADATA_SOURCES_KEYS: readonly (keyof PicteusImageMetadata)[] =
  [
    "all",
    "exif",
    "iptc",
    "xmp",
    "icc",
    "tiffTagPhotoshop",
    "others"
  ] as const;

export function isMetadataValuePresent(value: string | undefined): boolean
{
  return value !== undefined && value !== "{}" && value.trim().length > 0;
}

export function getPresentMetadataKeys(metadata: PicteusImageMetadata | undefined | null): (keyof PicteusImageMetadata)[]
{
  if (metadata === undefined || metadata === null)
  {
    return [];
  }

  return METADATA_SOURCES_KEYS.filter((metadataKey) =>
  {
    const rawValue = metadata[metadataKey];
    return isMetadataValuePresent(rawValue);
  });
}

export function featureTypeComparison(type1: ImageFeatureType, type2: ImageFeatureType): number
{
  const index1 = SORTED_FEATURE_TYPES.indexOf(type1);
  const index2 = SORTED_FEATURE_TYPES.indexOf(type2);
  if (index1 !== -1 && index2 !== -1)
  {
    return index1 - index2;
  }
  if (index1 !== -1)
  {
    return -1;
  }
  if (index2 !== -1)
  {
    return 1;
  }
  return type1.localeCompare(type2);
}

export function createSchemaComplianceUiContainer(t: TFunction = i18n.t): UiContainer
{
  return createUiContainer({
    elements: [
      string(t("imageDetail.schemaComplianceError"), {
        modifiers: {
          intensity: TextIntensity.low
        }
      })
    ]
  });
}

export function parseFeatureUiContainer(feature: ExtensionImageFeature, t: TFunction = i18n.t): UiContainer
{
  try
  {
    return UiContainer.parse(feature.value);
  }
  catch (error)
  {
    return createSchemaComplianceUiContainer(t);
  }
}

export function inferNonUiElement(imageFeature: ExtensionImageFeature): UiElement
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
      element = string("<binary>", { modifiers: { monospace: true } });
      break;
    case ImageFeatureFormat.String:
      element = string(String(value), { ...copyableOptions, representation: StringRepresentation.multiline });
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
      element = boolean(parsedBoolean);
      break;
    }
    default:
      element = string(String(value));
      break;
  }

  return element;
}

export function computeRecipeCommonRows(generationRecipe: GenerationRecipe, t: TFunction = i18n.t): TableRow[]
{
  const rows: TableRow[] = [];
  const options = { modifiers: { weight: TextWeight.heavy, intensity: TextIntensity.low } };
  if (generationRecipe.schemaVersion !== undefined && Math.random() > 1)
  {
    rows.push(tableRow([
      string(t("field.schemaVersion"), options),
        numberUnbounded(generationRecipe.schemaVersion)
      ])
    );
  }

  if (generationRecipe.id)
  {
    rows.push(tableRow([
      string(t("field.id"), options),
        identifier(generationRecipe.id, { modifiers: { monospace: true, copyable: true } })
      ])
    );
  }

  if (generationRecipe.url)
  {
    rows.push(tableRow([
      string(t("field.url"), options),
        stringUrl(generationRecipe.url, { modifiers: { copyable: true } })
      ])
    );
  }

  if (generationRecipe.software)
  {
    rows.push(tableRow([ string(t("field.software"), options), string(generationRecipe.software, {
      modifiers: { monospace: true, copyable: true }
    }) ]));
  }

  if (generationRecipe.author)
  {
    rows.push(tableRow([ string(t("field.author"), options), string(generationRecipe.author, {
      modifiers: { copyable: true }
    }) ]));
  }

  if (generationRecipe.inceptionDate)
  {
    rows.push(tableRow([ string(t("field.inceptionDate"), options), timestamp(generationRecipe.inceptionDate) ]));
  }

  if (generationRecipe.aspectRatio)
  {
    rows.push(tableRow([ string(t("field.aspectRatio"), options), ratio(generationRecipe.aspectRatio) ]));
  }

  if (generationRecipe.modelTags && generationRecipe.modelTags.length > 0)
  {
    rows.push(tableRow([ string(t("field.modelTags"), options), flowing(generationRecipe.modelTags.map((modelTag) => string(modelTag, { representation: StringRepresentation.chip }))) ]));
  }

  if (generationRecipe.inputAssets && generationRecipe.inputAssets.length > 0)
  {
    rows.push(tableRow([
      string(t("field.assetIds"), options),
        flowing(
          generationRecipe.inputAssets.map((asset) => identifier(asset, {
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

export function isDisplayedInRecipeCard(feature: ExtensionImageFeature): boolean
{
  return feature.type === ImageFeatureType.Recipe;
}

export function isDisplayedInFeatureTypeCards(feature: ExtensionImageFeature): boolean
{
  if (feature.type === ImageFeatureType.Recipe || feature.type === ImageFeatureType.Metadata)
  {
    return false;
  }
  if (feature.format === ImageFeatureFormat.Ui || feature.format === ImageFeatureFormat.Html || feature.format === ImageFeatureFormat.Markdown)
  {
    return true;
  }
  if (feature.format === ImageFeatureFormat.String)
  {
    return (
      feature.type === ImageFeatureType.Caption ||
      feature.type === ImageFeatureType.Description ||
      feature.type === ImageFeatureType.Comment ||
      feature.type === ImageFeatureType.Identity
    );
  }
  return false;
}

export function extractRecipe(feature: ExtensionImageFeature): GenerationRecipe | undefined
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

export function convertRecipeToContainer(generationRecipe: GenerationRecipe | undefined, t: TFunction = i18n.t): UiContainer
{
  if (generationRecipe === undefined)
  {
    return createSchemaComplianceUiContainer(t);
  }

  const rows = computeRecipeCommonRows(generationRecipe, t);
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

export function augmentRecipeUiContainer(
  feature: ExtensionImageFeature,
  container: UiContainer,
  recipeFeatures: readonly ExtensionImageFeature[],
  t: TFunction = i18n.t
): UiContainer
{
  const vectorialFeature = recipeFeatures.find((candidateFeature) => candidateFeature.id === feature.id && candidateFeature.format === ImageFeatureFormat.Json);
  if (vectorialFeature !== undefined)
  {
    const generationRecipe = extractRecipe(vectorialFeature);
    if (generationRecipe !== undefined)
    {
      const rows = computeRecipeCommonRows(generationRecipe, t);
      if (rows.length > 0)
      {
        container.elements.splice(0, 0, table(rows, {
          withRowSeparators: true,
          columns: [
            tableColumn({ align: TableColumnAlign.left, width: 25, widthMode: TableColumnWidthMode.maximum }),
            tableColumn({ align: TableColumnAlign.left })
          ]
        }), divider());
      }
    }
  }
  return container;
}

export type ImageFeatureContainerType =
  {
    readonly extensionId: string;
    readonly type: ImageFeatureType;
    readonly name?: string;
    readonly uiContainer: UiContainer;
  };

export function computeRecipeFeatureContainers(recipeFeatures: readonly ExtensionImageFeature[], t: TFunction = i18n.t): ImageFeatureContainerType[]
{
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
        const container = augmentRecipeUiContainer(feature, parseFeatureUiContainer(feature, t), recipeFeatures, t);
        featureContainers.push({
          extensionId: feature.id,
          type: feature.type,
          name: feature.name,
          uiContainer: container
        });
      }
    }
    else
    {
      for (const feature of extensionFeatures)
      {
        const container = feature.format === ImageFeatureFormat.Json
          ? convertRecipeToContainer(extractRecipe(feature), t)
          : UiContainer.builder().add(inferNonUiElement(feature)).build();
        featureContainers.push({
          extensionId: feature.id,
          type: feature.type,
          name: feature.name,
          uiContainer: container
        });
      }
    }
  }

  return featureContainers;
}

export function getAvailableFeatureTypes(features: readonly ExtensionImageFeature[]): ImageFeatureType[]
{
  const distinctTypesSet = new Set<ImageFeatureType>();
  for (const feature of features)
  {
    if (isDisplayedInFeatureTypeCards(feature))
    {
      distinctTypesSet.add(feature.type);
    }
  }
  return Array.from(distinctTypesSet).sort(featureTypeComparison);
}

export function computeTypeFeatureContainers(
  type: ImageFeatureType,
  features: readonly ExtensionImageFeature[],
  t: TFunction = i18n.t
): ImageFeatureContainerType[]
{
  const featuresForType = features.filter((feature) => feature.type === type && isDisplayedInFeatureTypeCards(feature));
  const extensionIds = Array.from(new Set(featuresForType.map((feature) => feature.id)));

  const featureContainers: ImageFeatureContainerType[] = [];
  for (const extensionId of extensionIds)
  {
    const extensionUiFeatures = featuresForType.filter((feature) => feature.id === extensionId && isDisplayedInFeatureTypeCards(feature));

    for (const uiFeature of extensionUiFeatures)
    {
      featureContainers.push({
        extensionId,
        type,
        name: uiFeature.name,
        uiContainer: uiFeature.format === ImageFeatureFormat.Ui
          ? parseFeatureUiContainer(uiFeature, t)
          : UiContainer.builder().add(inferNonUiElement(uiFeature)).build()
      });
    }
  }

  return featureContainers;
}

export function computeRawFeatureContainers(
  rawFeatures: readonly ExtensionImageFeature[],
  _t: TFunction = i18n.t
): ImageFeatureContainerType[]
{
  return rawFeatures.map((rawFeature) =>
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
  });
}

export function inferMetadataUiContainer(value: string): UiContainer
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
