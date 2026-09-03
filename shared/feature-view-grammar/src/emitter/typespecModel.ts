import { getDiscriminator, getDoc, Model, ModelProperty, Program, Scalar, Type } from "@typespec/compiler";

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


export interface GrammarEnumMember
{

  readonly name: string;
  readonly value: string;
  readonly doc?: string;

}

export interface GrammarEnum
{

  readonly name: string;
  readonly doc?: string;
  readonly members: GrammarEnumMember[];

}

export type GrammarTypeKind =
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

export interface GrammarType
{

  readonly kind: GrammarTypeKind;
  readonly name: string;
  readonly literalValue?: string | number | boolean;
  readonly elementType?: GrammarType;
  readonly unionTypes?: GrammarType[];

}

export interface GrammarProperty
{

  readonly name: string;
  readonly doc?: string;
  readonly optional: boolean;
  readonly type: GrammarType;
  readonly defaultValue?: string | number | boolean;
  readonly isUiLabel?: boolean;
  readonly isUiValue?: boolean;
  readonly uiDivider?: UiDividerOptions;
  readonly uiMeterBound?: UiMeterBoundKind;
  readonly isUiModifiers?: boolean;

}

export interface GrammarModel
{

  readonly name: string;
  readonly doc?: string;
  readonly baseModelName?: string;
  readonly isDiscriminated: boolean;
  readonly discriminatorValue?: string;
  readonly isDslRoot: boolean;
  readonly isDslIgnored: boolean;
  readonly aliases: DslAliasName[];
  readonly properties: GrammarProperty[];
  readonly uiLayout?: UiLayoutKind;
  readonly uiWidget?: UiWidgetKind;
  readonly isCustomRenderer?: boolean;

}

export interface PolymorphicRoot
{

  readonly name: string;
  readonly doc?: string;
  readonly discriminatorProperty: string;
  readonly derivedModels: GrammarModel[];

}

export interface GrammarSpec
{

  readonly namespaceDoc?: string;
  readonly enums: GrammarEnum[];
  readonly models: GrammarModel[];
  readonly polymorphicRoots: PolymorphicRoot[];
  readonly uiElements: GrammarModel[];
  readonly actionElements: GrammarModel[];
  readonly rootModel?: GrammarModel;
  readonly rootModels: GrammarModel[];

}

function resolveGrammarType(program: Program, type: Type): GrammarType
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
          elementType: resolveGrammarType(program, type.indexer.value)
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
      const unionTypes: GrammarType[] = [];
      for (const variant of type.variants.values())
      {
        unionTypes.push(resolveGrammarType(program, variant.type));
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

export function extractTypeSpecGrammarModel(program: Program): GrammarSpec
{
  const globalNamespace = program.getGlobalNamespaceType();
  const picteusNamespace = globalNamespace.namespaces.get("Picteus");
  const grammarNamespace = picteusNamespace?.namespaces.get("FeatureViewGrammar");

  if (!grammarNamespace)
  {
    throw new Error("Could not locate namespace 'Picteus.FeatureViewGrammar' in TypeSpec program.");
  }

  const namespaceDoc = getDoc(program, grammarNamespace);
  const enums: GrammarEnum[] = [];
  const models: GrammarModel[] = [];

  for (const [ enumName, enumType ] of grammarNamespace.enums)
  {
    const members: GrammarEnumMember[] = [];
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

  for (const [ modelName, modelType ] of grammarNamespace.models)
  {
    if (modelName === "RecordUnknown" || modelName === "Array")
    {
      continue;
    }

    const properties: GrammarProperty[] = [];
    let discriminatorValue: string | undefined = undefined;
    const allProperties = getAllModelProperties(modelType);

    for (const [ propertyName, property ] of allProperties)
    {
      const propertyType = resolveGrammarType(program, property.type);
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

  // We discover polymorphic roots dynamically via @discriminator
  const polymorphicRoots: PolymorphicRoot[] = [];
  for (const [ modelName, modelType ] of grammarNamespace.models)
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

  const rootModels = models.filter((model) => model.isDslRoot);
  const rootModel = rootModels.find((model) => model.name === "FeatureBlock") ?? rootModels[0] ?? models.find((model) => model.name === "FeatureBlock");
  const uiElementRoot = polymorphicRoots.find((root) => root.name === "UiElement") ?? polymorphicRoots[0];
  const actionElementRoot = polymorphicRoots.find((root) => root.name === "ActionElement") ?? polymorphicRoots[1];

  const uiElements = uiElementRoot ? uiElementRoot.derivedModels : [];
  const actionElements = actionElementRoot ? actionElementRoot.derivedModels : [];

  return {
    namespaceDoc,
    enums,
    models,
    polymorphicRoots,
    uiElements,
    actionElements,
    rootModel,
    rootModels
  };
}
