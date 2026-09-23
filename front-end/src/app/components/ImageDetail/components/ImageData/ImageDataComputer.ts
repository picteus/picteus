import i18n, { TFunction } from "i18next";

import {
  booleanPlain,
  CodeLanguage,
  createUiContainer,
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
  tableRow,
  TableRow,
  TextIntensity,
  TextWeight,
  timestamp,
  UiContainer,
  UiElement,
  xml
} from "@picteus/shared-core";
import { ExtensionImageFeature, GenerationRecipe, ImageFeatureFormat, ImageFeatureType } from "@picteus/ws-client";


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
      stringShort(t("imageDetail.schemaComplianceError"), {
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

export function computeRecipeCommonRows(generationRecipe: GenerationRecipe, t: TFunction = i18n.t): TableRow[]
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

  if (generationRecipe.modelTags && generationRecipe.modelTags.length > 0)
  {
    rows.push(tableRow([ stringShort(t("field.modelTags"), options), flowing(generationRecipe.modelTags.map((modelTag) => stringShort(modelTag, { representation: StringShortRepresentation.chip }))) ]));
  }

  if (generationRecipe.inputAssets && generationRecipe.inputAssets.length > 0)
  {
    rows.push(tableRow([
        stringShort(t("field.assetIds"), options),
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
