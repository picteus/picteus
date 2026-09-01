import { getDiscriminator, getDoc, Model, ModelProperty, Program, Scalar, Type } from "@typespec/compiler";

import {
  getModelAliases,
  getUiDivider,
  getUiLayout,
  getUiMeterBound,
  getUiWidget,
  isDslIgnored,
  isDslRoot,
  isUiLabel,
  isUiModifiers,
  isUiValue
} from "./decorators.js";


export interface GrammarEnumMember
{
  name: string;
  value: string;
  doc?: string;
}

export interface GrammarEnum
{
  name: string;
  doc?: string;
  members: GrammarEnumMember[];
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
  kind: GrammarTypeKind;
  name: string;
  literalValue?: string | number | boolean;
  elementType?: GrammarType;
  unionTypes?: GrammarType[];
}

export interface GrammarProperty
{
  name: string;
  doc?: string;
  optional: boolean;
  type: GrammarType;
  defaultValue?: string | number | boolean;
  isUiLabel?: boolean;
  isUiValue?: boolean;
  uiDivider?: { orientation?: string };
  uiMeterBound?: string;
  isUiModifiers?: boolean;
}

export interface GrammarModel
{
  name: string;
  doc?: string;
  baseModelName?: string;
  isDiscriminated: boolean;
  discriminatorValue?: string;
  isDslRoot: boolean;
  isDslIgnored: boolean;
  aliases: string[];
  properties: GrammarProperty[];
  uiLayout?: string;
  uiWidget?: string;
}

export interface PolymorphicRoot
{
  name: string;
  doc?: string;
  discriminatorProperty: string;
  derivedModels: GrammarModel[];
}

export interface GrammarSpec
{
  namespaceDoc?: string;
  enums: GrammarEnum[];
  models: GrammarModel[];
  polymorphicRoots: PolymorphicRoot[];
  uiElements: GrammarModel[];
  actionElements: GrammarModel[];
  rootModel?: GrammarModel;
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
        name: unionTypes.map((u) => u.name).join(" | "),
        unionTypes
      };
    }
    default:
      return { kind: "unknown", name: "unknown" };
  }
}

function getAllModelProperties(model: Model): Map<string, ModelProperty>
{
  const props = new Map<string, ModelProperty>();
  for (const [ name, prop ] of model.properties)
  {
    props.set(name, prop);
  }
  if (model.baseModel)
  {
    const baseProps = getAllModelProperties(model.baseModel);
    for (const [ name, prop ] of baseProps)
    {
      if (!props.has(name))
      {
        props.set(name, prop);
      }
    }
  }
  return props;
}

export function extractTypeSpecGrammarModel(program: Program): GrammarSpec
{
  const globalNs = program.getGlobalNamespaceType();
  const picteusNs = globalNs.namespaces.get("Picteus");
  const grammarNs = picteusNs?.namespaces.get("FeatureViewGrammar");

  if (!grammarNs)
  {
    throw new Error("Could not locate namespace 'Picteus.FeatureViewGrammar' in TypeSpec program.");
  }

  const namespaceDoc = getDoc(program, grammarNs);
  const enums: GrammarEnum[] = [];
  const models: GrammarModel[] = [];

  for (const [ enumName, enumType ] of grammarNs.enums)
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

  for (const [ modelName, modelType ] of grammarNs.models)
  {
    if (modelName === "RecordUnknown" || modelName === "Array")
    {
      continue;
    }

    const properties: GrammarProperty[] = [];
    let discriminatorValue: string | undefined = undefined;
    const allProps = getAllModelProperties(modelType);

    for (const [ propName, prop ] of allProps)
    {
      const propType = resolveGrammarType(program, prop.type);
      let defaultValue: string | number | boolean | undefined = undefined;

      if (prop.defaultValue)
      {
        if (typeof prop.defaultValue === "object" && prop.defaultValue !== null)
        {
          if ("valueKind" in prop.defaultValue && prop.defaultValue.valueKind === "EnumValue")
          {
            const enumVal = prop.defaultValue.value as { name?: string; value?: string };
            defaultValue = enumVal.name ?? enumVal.value;
          }
          else if ("value" in prop.defaultValue)
          {
            if (typeof prop.defaultValue.value === "object" && prop.defaultValue.value !== null)
            {
              if ("name" in prop.defaultValue.value)
              {
                defaultValue = (prop.defaultValue.value as { name: string }).name;
              }
              else if ("value" in prop.defaultValue.value)
              {
                defaultValue = (prop.defaultValue.value as { value: string | number | boolean }).value;
              }
            }
            else
            {
              defaultValue = prop.defaultValue.value as string | number | boolean;
            }
          }
          else if ("name" in prop.defaultValue)
          {
            defaultValue = (prop.defaultValue as { name: string }).name;
          }
        }
        else
        {
          defaultValue = prop.defaultValue as string | number | boolean;
        }
      }

      if (propName === "type" && propType.kind === "literal")
      {
        discriminatorValue = String(propType.literalValue);
      }

      properties.push(
        {
          name: propName,
          doc: getDoc(program, prop),
          optional: prop.optional,
          type: propType,
          defaultValue,
          isUiLabel: isUiLabel(program, prop),
          isUiValue: isUiValue(program, prop),
          uiDivider: getUiDivider(program, prop),
          uiMeterBound: getUiMeterBound(program, prop),
          isUiModifiers: isUiModifiers(program, prop)
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
        uiWidget: getUiWidget(program, modelType)
      }
    );
  }

  // Discover polymorphic roots dynamically via @discriminator
  const polymorphicRoots: PolymorphicRoot[] = [];
  for (const [ modelName, modelType ] of grammarNs.models)
  {
    const disc = getDiscriminator(program, modelType);
    if (disc && modelType.baseModel === undefined)
    {
      const derived = models.filter((m) => m.baseModelName === modelName);
      polymorphicRoots.push(
        {
          name: modelName,
          doc: getDoc(program, modelType),
          discriminatorProperty: disc.propertyName,
          derivedModels: derived
        }
      );
    }
  }

  const rootModel = models.find((m) => m.isDslRoot) ?? models.find((m) => m.name === "FeatureBlock");
  const uiRoot = polymorphicRoots.find((r) => r.name === "UiElement") ?? polymorphicRoots[0];
  const actionRoot = polymorphicRoots.find((r) => r.name === "ActionElement") ?? polymorphicRoots[1];

  const uiElements = uiRoot ? uiRoot.derivedModels : [];
  const actionElements = actionRoot ? actionRoot.derivedModels : [];

  return {
    namespaceDoc,
    enums,
    models,
    polymorphicRoots,
    uiElements,
    actionElements,
    rootModel
  };
}
