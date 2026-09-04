import { getDiscriminator, getDoc, Model, ModelProperty, Namespace, Program, Scalar, Type } from "@typespec/compiler";

import {
  DslAliasName,
  getModelAliases,
  getUiDivider,
  getUiLayout,
  getUiMeterBound,
  getUiWidget,
  isCustomRenderer,
  isDslIgnored,
  isDslRoot,
  isUiLabel,
  isUiModifiers,
  isUiValue,
  UiDividerOptions,
  UiLayoutKind,
  UiMeterBoundKind,
  UiWidgetKind
} from "./decorators.js";


export interface ViewKitEnumMember
{

  readonly name: string;
  readonly value: string;
  readonly doc?: string;

}

export interface ViewKitEnum
{

  readonly name: string;
  readonly doc?: string;
  readonly members: ViewKitEnumMember[];

}

export type ViewKitTypeKind =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "model"
  | "array"
  | "record"
  | "union"
  | "literal"
  | "unknown";

export interface ViewKitType
{

  readonly kind: ViewKitTypeKind;
  readonly name: string;
  readonly literalValue?: string | number | boolean;
  readonly elementType?: ViewKitType;
  readonly unionTypes?: ViewKitType[];

}

export interface ViewKitProperty
{

  readonly name: string;
  readonly doc?: string;
  readonly optional: boolean;
  readonly type: ViewKitType;
  readonly defaultValue?: string | number | boolean;
  readonly isUiLabel?: boolean;
  readonly isUiValue?: boolean;
  readonly uiDivider?: UiDividerOptions;
  readonly uiMeterBound?: UiMeterBoundKind;
  readonly isUiModifiers?: boolean;

}

export interface ViewKitModel
{

  readonly name: string;
  readonly doc?: string;
  readonly baseModelName?: string;
  readonly isDiscriminated: boolean;
  readonly discriminatorValue?: string;
  readonly isDslRoot: boolean;
  readonly isDslIgnored: boolean;
  readonly aliases: DslAliasName[];
  readonly properties: ViewKitProperty[];
  readonly uiLayout?: UiLayoutKind;
  readonly uiWidget?: UiWidgetKind;
  readonly isCustomRenderer?: boolean;

}

export interface PolymorphicRoot
{

  readonly name: string;
  readonly doc?: string;
  readonly discriminatorProperty: string;
  readonly derivedModels: ViewKitModel[];

}

export interface GrammarSpec
{

  readonly namespaceDoc?: string;
  readonly enums: ViewKitEnum[];
  readonly models: ViewKitModel[];
  readonly polymorphicRoots: PolymorphicRoot[];
  readonly uiElements: ViewKitModel[];
  readonly actionElements: ViewKitModel[];
  readonly rootModels: ViewKitModel[];

}

function resolveViewKitType(program: Program, type: Type): ViewKitType
{
  switch (type.kind)
  {
    case "Scalar":
    {
      const scalar = type as Scalar;
      const name = scalar.name;
      if (name === "string")
      {
        return { kind: "string", name: "string" };
      }
      if (name === "int32" || name === "int64" || name === "float32" || name === "float64" || name === "numeric")
      {
        return { kind: "number", name: "number" };
      }
      if (name === "boolean")
      {
        return { kind: "boolean", name: "boolean" };
      }
      return { kind: "string", name: "string" };
    }
    case "String":
      return { kind: "literal", name: `"${type.value}"`, literalValue: type.value };
    case "Number":
      return { kind: "literal", name: String(type.value), literalValue: type.value };
    case "Boolean":
      return { kind: "literal", name: String(type.value), literalValue: type.value };
    case "Enum":
      return { kind: "enum", name: type.name };
    case "Model":
    {
      if (type.name === "Array" && type.indexer)
      {
        return {
          kind: "array",
          name: "Array",
          elementType: resolveViewKitType(program, type.indexer.value)
        };
      }
      if (type.name === "Record" || type.name === "RecordUnknown")
      {
        return { kind: "record", name: "Record" };
      }
      return { kind: "model", name: type.name };
    }
    case "Union":
    {
      const unionTypes: ViewKitType[] = [];
      for (const variant of type.variants.values())
      {
        unionTypes.push(resolveViewKitType(program, variant.type));
      }
      return {
        kind: "union",
        name: unionTypes.map((unionType) => unionType.name).join(" | "),
        unionTypes
      };
    }
    default:
      return { kind: "unknown", name: "unknown" };
  }
}

function getAllModelProperties(model: Model): Map<string, ModelProperty>
{
  const properties = new Map<string, ModelProperty>();
  for (const [ name, property ] of model.properties)
  {
    properties.set(name, property);
  }
  if (model.baseModel)
  {
    const baseProperties = getAllModelProperties(model.baseModel);
    for (const [ name, property ] of baseProperties)
    {
      if (!properties.has(name))
      {
        properties.set(name, property);
      }
    }
  }
  return properties;
}

function collectNamespaces(namespace: Namespace): Namespace[]
{
  const result: Namespace[] = [];
  if (namespace.name !== "")
  {
    result.push(namespace);
  }
  for (const childNamespace of namespace.namespaces.values())
  {
    result.push(...collectNamespaces(childNamespace));
  }
  return result;
}

function isBuiltinNamespace(namespace: Namespace): boolean
{
  let current: Namespace | undefined = namespace;
  while (current)
  {
    if (current.name === "TypeSpec")
    {
      return true;
    }
    current = current.namespace;
  }
  return false;
}

function findViewKitNamespaces(program: Program): Namespace[]
{
  const globalNamespace = program.getGlobalNamespaceType();
  const allNamespaces = collectNamespaces(globalNamespace);
  return allNamespaces.filter(
    (namespace) =>
    {
      return !isBuiltinNamespace(namespace) && (namespace.models.size > 0 || namespace.enums.size > 0);
    }
  );
}

export function extractTypeSpecViewKitModel(program: Program): GrammarSpec
{
  const viewKitNamespaces = findViewKitNamespaces(program);

  if (viewKitNamespaces.length === 0)
  {
    throw new Error("Could not locate any user ViewKit namespace with models or enums in TypeSpec program.");
  }

  const namespaceDoc = viewKitNamespaces.map((namespace) => getDoc(program, namespace)).find(Boolean);
  const enums: ViewKitEnum[] = [];
  const models: ViewKitModel[] = [];

  for (const viewKitNamespace of viewKitNamespaces)
  {
    for (const [ enumName, enumType ] of viewKitNamespace.enums)
    {
      const members: ViewKitEnumMember[] = [];
      for (const [ memberName, member ] of enumType.members)
      {
        members.push(
          {
            name: memberName,
            value: typeof member.value === "string" ? member.value : memberName,
            doc: getDoc(program, member)
          }
        );
      }
      enums.push(
        {
          name: enumName,
          doc: getDoc(program, enumType),
          members
        }
      );
    }

    for (const [ modelName, modelType ] of viewKitNamespace.models)
    {
      if (modelName === "RecordUnknown" || modelName === "Array")
      {
        continue;
      }

      const properties: ViewKitProperty[] = [];
      let discriminatorValue: string | undefined = undefined;
      const allProperties = getAllModelProperties(modelType);

      for (const [ propertyName, property ] of allProperties)
      {
        const propertyType = resolveViewKitType(program, property.type);
        let defaultValue: string | number | boolean | undefined = undefined;

        if (property.defaultValue)
        {
          if (typeof property.defaultValue === "object" && property.defaultValue !== null)
          {
            if ("valueKind" in property.defaultValue && property.defaultValue.valueKind === "EnumValue")
            {
              const enumValue = property.defaultValue.value as { name?: string; value?: string };
              defaultValue = enumValue.name ?? enumValue.value;
            }
            else if ("value" in property.defaultValue)
            {
              if (typeof property.defaultValue.value === "object" && property.defaultValue.value !== null)
              {
                if ("name" in property.defaultValue.value)
                {
                  defaultValue = (property.defaultValue.value as { name: string }).name;
                }
                else if ("value" in property.defaultValue.value)
                {
                  defaultValue = (property.defaultValue.value as { value: string | number | boolean }).value;
                }
              }
              else
              {
                defaultValue = property.defaultValue.value as string | number | boolean;
              }
            }
            else if ("name" in property.defaultValue)
            {
              defaultValue = (property.defaultValue as { name: string }).name;
            }
          }
          else
          {
            defaultValue = property.defaultValue as string | number | boolean;
          }
        }

        if (propertyName === "type" && propertyType.kind === "literal")
        {
          discriminatorValue = String(propertyType.literalValue);
        }

        properties.push(
          {
            name: propertyName,
            doc: getDoc(program, property),
            optional: property.optional,
            type: propertyType,
            defaultValue,
            isUiLabel: isUiLabel(program, property),
            isUiValue: isUiValue(program, property),
            uiDivider: getUiDivider(program, property),
            uiMeterBound: getUiMeterBound(program, property),
            isUiModifiers: isUiModifiers(program, property)
          }
        );
      }

      const isDiscriminated = Boolean(getDiscriminator(program, modelType));
      const modelIsDslRoot = isDslRoot(program, modelType);
      const modelIsDslIgnored = isDslIgnored(program, modelType);
      const aliases = getModelAliases(program, modelType);

      models.push(
        {
          name: modelName,
          doc: getDoc(program, modelType),
          baseModelName: modelType.baseModel?.name,
          isDiscriminated,
          discriminatorValue,
          isDslRoot: modelIsDslRoot,
          isDslIgnored: modelIsDslIgnored,
          aliases,
          properties,
          uiLayout: getUiLayout(program, modelType),
          uiWidget: getUiWidget(program, modelType),
          isCustomRenderer: isCustomRenderer(program, modelType)
        }
      );
    }
  }

  // We discover polymorphic roots dynamically via @discriminator
  const polymorphicRoots: PolymorphicRoot[] = [];
  for (const viewKitNamespace of viewKitNamespaces)
  {
    for (const [ modelName, modelType ] of viewKitNamespace.models)
    {
      const discriminator = getDiscriminator(program, modelType);
      if (discriminator && modelType.baseModel === undefined)
      {
        const derived = models.filter((model) => model.baseModelName === modelName);
        polymorphicRoots.push(
          {
            name: modelName,
            doc: getDoc(program, modelType),
            discriminatorProperty: discriminator.propertyName,
            derivedModels: derived
          }
        );
      }
    }
  }

  const rootModels = models.filter((model) => model.isDslRoot);
  const uiElementRoot = polymorphicRoots.find((root) => root.name === "UiElement") ?? polymorphicRoots.find((root) => !root.name.toLowerCase().includes("action")) ?? polymorphicRoots[0];
  const actionElementRoot = polymorphicRoots.find((root) => root.name === "UiAction") ?? polymorphicRoots.find((root) => root.name.toLowerCase().includes("action")) ?? polymorphicRoots[1];

  const uiElements = uiElementRoot ? uiElementRoot.derivedModels : [];
  const actionElements = actionElementRoot ? actionElementRoot.derivedModels : [];

  return {
    namespaceDoc,
    enums,
    models,
    polymorphicRoots,
    uiElements,
    actionElements,
    rootModels
  };
}
