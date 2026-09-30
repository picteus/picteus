import { getDoc, Model, Namespace, Program, Type } from "@typespec/compiler";
import { PICTEUS_NAMESPACE } from "../common.js";
import { getIntentAudience, IntentAudience } from "./decorators.js";


export interface IntentType
{
  readonly kind: "string" | "number" | "boolean" | "bytes" | "enum" | "model" | "array" | "record" | "union" | "literal";
  readonly name: string;
  readonly literalValue?: string | number | boolean;
  readonly elementType?: IntentType;
  readonly unionTypes?: IntentType[];
}

export interface IntentProperty
{
  readonly name: string;
  readonly doc?: string;
  readonly optional: boolean;
  readonly type: IntentType;
}

export interface IntentModel
{
  readonly name: string;
  readonly doc?: string;
  readonly baseModelName?: string;
  readonly audience?: IntentAudience;
  readonly properties: IntentProperty[];
}

export interface IntentEnumMember
{
  readonly name: string;
  readonly value: string;
  readonly doc?: string;
}

export interface IntentEnum
{
  readonly name: string;
  readonly doc?: string;
  readonly members: IntentEnumMember[];
}

export interface IntentUnion
{
  readonly name: string;
  readonly doc?: string;
  readonly variants: IntentType[];
}

export interface IntentSpec
{
  readonly models: IntentModel[];
  readonly enums: IntentEnum[];
  readonly unions: IntentUnion[];
}

function collectNamespaces(namespace: Namespace): Namespace[]
{
  const namespaces = [ namespace ];
  for (const childNamespace of namespace.namespaces.values())
  {
    namespaces.push(...collectNamespaces(childNamespace));
  }
  return namespaces;
}

function resolveIntentNamespace(program: Program): Namespace
{
  const globalNamespace = program.getGlobalNamespaceType();
  const namespace = collectNamespaces(globalNamespace).find(
    (candidate) =>
    {
      return candidate.name === "Intents" && candidate.namespace?.name === PICTEUS_NAMESPACE;
    }
  );

  if (!namespace)
  {
    throw new Error("Could not locate the Picteus.Intents TypeSpec namespace.");
  }

  return namespace;
}

function resolveIntentType(type: Type): IntentType
{
  switch (type.kind)
  {
    case "Scalar":
    {
      const scalarName = type.name.toLowerCase();
      if (scalarName === "bytes")
      {
        return { kind: "bytes", name: "bytes" };
      }
      if (scalarName === "string")
      {
        return { kind: "string", name: "string" };
      }
      if (scalarName === "boolean")
      {
        return { kind: "boolean", name: "boolean" };
      }
      if ([ "int8", "int16", "int32", "int64", "integer", "safeint" ].includes(scalarName))
      {
        return { kind: "number", name: "int" };
      }
      if ([ "float", "float32", "float64", "numeric", "decimal", "decimal128" ].includes(scalarName))
      {
        return { kind: "number", name: "float" };
      }
      throw new Error(`Unsupported scalar type in intent specification: ${type.name}.`);
    }
    case "String":
      return { kind: "literal", name: JSON.stringify(type.value), literalValue: type.value };
    case "Number":
      return { kind: "literal", name: String(type.value), literalValue: type.value };
    case "Boolean":
      return { kind: "literal", name: String(type.value), literalValue: type.value };
    case "Enum":
      return { kind: "enum", name: type.name };
    case "Model":
      if (type.name === "Array" && type.indexer)
      {
        return {
          kind: "array",
          name: "Array",
          elementType: resolveIntentType(type.indexer.value)
        };
      }
      if (type.name === "Record" || type.name === "RecordUnknown")
      {
        return { kind: "record", name: "Record" };
      }
      return { kind: "model", name: type.name };
    case "Union":
    {
      const unionTypes: IntentType[] = [];
      for (const variant of type.variants.values())
      {
        unionTypes.push(resolveIntentType(variant.type));
      }
      return { kind: "union", name: unionTypes.map((unionType) => unionType.name).join(" | "), unionTypes };
    }
    default:
      throw new Error(`Unsupported TypeSpec type in intent specification: ${type.kind}.`);
  }
}

function getModelProperties(program: Program, model: Model): IntentProperty[]
{
  const properties: IntentProperty[] = [];
  for (const [ propertyName, property ] of model.properties)
  {
    properties.push(
      {
        name: propertyName,
        doc: getDoc(program, property),
        optional: property.optional,
        type: resolveIntentType(property.type)
      }
    );
  }
  return properties;
}

export function extractTypeSpecIntents(program: Program): IntentSpec
{
  const namespace = resolveIntentNamespace(program);
  const models: IntentModel[] = [];
  const enums: IntentEnum[] = [];
  const unions: IntentUnion[] = [];

  for (const [ modelName, model ] of namespace.models)
  {
    models.push(
      {
        name: modelName,
        doc: getDoc(program, model),
        baseModelName: model.baseModel?.name,
        audience: getIntentAudience(program, model),
        properties: getModelProperties(program, model)
      }
    );
  }

  for (const [ enumName, enumType ] of namespace.enums)
  {
    const members: IntentEnumMember[] = [];
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
    enums.push({ name: enumName, doc: getDoc(program, enumType), members });
  }

  for (const [ unionName, unionType ] of namespace.unions)
  {
    if (unionName === "FrontIntent" || unionName === "BackIntent" || unionName === "Intent")
    {
      throw new Error(`The ${unionName} union is generated from @frontEndIntent and @backEndIntent decorators; remove its TypeSpec declaration.`);
    }
    const variants: IntentType[] = [];
    for (const variant of unionType.variants.values())
    {
      variants.push(resolveIntentType(variant.type));
    }
    unions.push({ name: unionName, doc: getDoc(program, unionType), variants });
  }

  return { models, enums, unions };
}
