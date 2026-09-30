import { GrammarSpec, ViewKitModel, ViewKitProperty } from "./typespecModel.js";


export const DISCRIMINATOR_PROPERTY = "type";
export const SCHEMA_VERSION_PROPERTY = "schemaVersion";
export const SCHEMA_VERSION_VALUE = "1.0";
export const ELEMENTS_PROPERTY = "elements";
export const ELEMENT_SUFFIX = "Element";

export interface PropertyPartition
{

  readonly nonTypeProperties: ViewKitProperty[];
  readonly requiredProperties: ViewKitProperty[];
  readonly optionalProperties: ViewKitProperty[];
  readonly arrayProperties: ViewKitProperty[];
  readonly scalarRequiredProperties: ViewKitProperty[];
  readonly scalarOptionalProperties: ViewKitProperty[];

}

export function capitalizeText(value: string): string
{
  if (value.length === 0)
  {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function uncapitalizeText(value: string): string
{
  if (value.length === 0)
  {
    return value;
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function convertToSnakeCase(value: string): string
{
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

export function computeBaseModelProperties(model: ViewKitModel, spec: GrammarSpec): Map<string, ViewKitProperty>
{
  const properties = new Map<string, ViewKitProperty>();
  if (!model.baseModelName)
  {
    return properties;
  }

  const baseModel = spec.models.find(
    (candidate) =>
    {
      return candidate.name === model.baseModelName;
    }
  );
  if (!baseModel)
  {
    return properties;
  }

  for (const property of baseModel.properties)
  {
    properties.set(property.name, property);
  }

  const inherited = computeBaseModelProperties(baseModel, spec);
  for (const [ key, value ] of inherited)
  {
    if (!properties.has(key))
    {
      properties.set(key, value);
    }
  }

  return properties;
}

export function partitionProperties(
  properties: ViewKitProperty[],
  options?: { excludeSchemaVersion?: boolean }
): PropertyPartition
{
  const nonTypeProperties = properties.filter(
    (property) =>
    {
      if (property.name === DISCRIMINATOR_PROPERTY)
      {
        return false;
      }
      return !(options?.excludeSchemaVersion && property.name === SCHEMA_VERSION_PROPERTY);
    }
  );

  const requiredProperties = nonTypeProperties.filter(
    (property) =>
    {
      return !property.optional && property.defaultValue === undefined;
    }
  );

  const optionalProperties = nonTypeProperties.filter(
    (property) =>
    {
      return property.optional || property.defaultValue !== undefined;
    }
  );

  const arrayProperties = nonTypeProperties.filter(
    (property) =>
    {
      return property.type.kind === "array";
    }
  );

  const scalarRequiredProperties = requiredProperties.filter(
    (property) =>
    {
      return property.type.kind !== "array";
    }
  );

  const scalarOptionalProperties = optionalProperties.filter(
    (property) =>
    {
      return property.type.kind !== "array";
    }
  );

  return {
    nonTypeProperties,
    requiredProperties,
    optionalProperties,
    arrayProperties,
    scalarRequiredProperties,
    scalarOptionalProperties
  };
}

export function computeFactoryNames(model: ViewKitModel): { primary: string; aliases: string[] }
{
  let baseName = model.name;
  if (baseName.endsWith(ELEMENT_SUFFIX))
  {
    baseName = baseName.slice(0, -ELEMENT_SUFFIX.length);
  }
  const primary = uncapitalizeText(baseName);
  const aliases = (model.aliases ?? []).map(uncapitalizeText);
  return { primary, aliases };
}

export function computePythonFactoryNames(model: ViewKitModel): { primary: string; aliases: string[] }
{
  let baseName = model.name;
  if (baseName.endsWith(ELEMENT_SUFFIX))
  {
    baseName = baseName.slice(0, -ELEMENT_SUFFIX.length);
  }
  const primary = convertToSnakeCase(baseName);
  const aliases = (model.aliases ?? []).map(convertToSnakeCase);
  return { primary, aliases };
}
