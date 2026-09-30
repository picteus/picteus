import { IntentAudience } from "./decorators.js";
import { IntentEnum, IntentModel, IntentSpec, IntentType, IntentUnion } from "./intentsModel.js";
import { createGeneratedFileHeader } from "../common.js";


function collectIntentDeclarations(spec: IntentSpec, audience: IntentAudience): IntentSpec
{
  const modelMap = new Map(spec.models.map((model) => [ model.name, model ]));
  const unionMap = new Map(spec.unions.map((intentUnion) => [ intentUnion.name, intentUnion ]));
  const modelNames = new Set<string>();
  const enumNames = new Set<string>();
  const unionNames = new Set<string>();

  function includeType(type: IntentType): void
  {
    if (type.kind === "model" && !modelNames.has(type.name))
    {
      if (unionMap.has(type.name))
      {
        includeUnion(type.name);
        return;
      }
      modelNames.add(type.name);
      const model = modelMap.get(type.name);
      if (model)
      {
        if (model.baseModelName)
        {
          includeType({ kind: "model", name: model.baseModelName });
        }
        for (const property of model.properties)
        {
          includeType(property.type);
        }
      }
    }
    else if (type.kind === "enum")
    {
      enumNames.add(type.name);
    }
    else if (type.kind === "union")
    {
      for (const unionType of type.unionTypes ?? [])
      {
        includeType(unionType);
      }
    }
    else if (type.kind === "array" && type.elementType)
    {
      includeType(type.elementType);
    }
  }

  function includeUnion(unionName: string): void
  {
    if (unionNames.has(unionName))
    {
      return;
    }
    unionNames.add(unionName);
    const intentUnion = unionMap.get(unionName);
    if (intentUnion)
    {
      for (const variant of intentUnion.variants)
      {
        includeType(variant);
        if (variant.kind === "model" && unionMap.has(variant.name))
        {
          includeUnion(variant.name);
        }
      }
    }
  }

  const intentModels = spec.models.filter((model) => model.audience === audience);
  if (intentModels.length === 0)
  {
    throw new Error(`No intent models are marked with @${audience}Intent.`);
  }
  for (const intentModel of intentModels)
  {
    includeType({ kind: "model", name: intentModel.name });
  }
  if (audience === "frontEnd")
  {
    for (const intentEnum of spec.enums)
    {
      enumNames.add(intentEnum.name);
    }
  }

  return {
    models: spec.models.filter((model) => modelNames.has(model.name)),
    enums: spec.enums.filter((intentEnum) => enumNames.has(intentEnum.name)),
    unions: spec.unions.filter((intentUnion) => unionNames.has(intentUnion.name))
  };
}

function resolveTypeScriptType(type: IntentType): string
{
  switch (type.kind)
  {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "bytes":
      return "Buffer";
    case "enum":
    case "model":
      return type.name;
    case "array":
    {
      const elementType = resolveTypeScriptType(type.elementType ?? { kind: "string", name: "string" });
      return type.elementType?.kind === "union" ? `(${elementType})[]` : `${elementType}[]`;
    }
    case "record":
      return "IntentJson";
    case "literal":
      return type.name;
    case "union":
      return (type.unionTypes ?? []).map(resolveTypeScriptType).join(" | ");
  }
}

function generateTypeScriptEnum(intentEnum: IntentEnum): string[]
{
  const lines = [ `export enum ${intentEnum.name}`, "{" ];
  for (let index = 0; index < intentEnum.members.length; index++)
  {
    const member = intentEnum.members[index];
    const comma = index < intentEnum.members.length - 1 ? "," : "";
    lines.push(`  ${member.name.charAt(0).toUpperCase()}${member.name.slice(1)} = ${JSON.stringify(member.value)}${comma}`);
  }
  lines.push("}");
  return lines;
}

function generateTypeScriptModel(model: IntentModel): string[]
{
  const extendsClause = model.baseModelName ? ` extends ${model.baseModelName}` : "";
  const lines = [ `export interface ${model.name}${extendsClause}`, "{" ];
  for (const property of model.properties)
  {
    const optionalMarker = property.optional ? "?" : "";
    lines.push(`  readonly ${property.name}${optionalMarker}: ${resolveTypeScriptType(property.type)};`);
  }
  lines.push("}");
  return lines;
}

function generateTypeScriptUnion(intentUnion: IntentUnion): string[]
{
  const unionTypes = intentUnion.variants.map(resolveTypeScriptType);
  return [ `export type ${intentUnion.name} = ${unionTypes.join(" | ")};` ];
}

function getIntentPayloadProperty(intentModel: IntentModel): IntentModel["properties"][number] | undefined
{
  if (!intentModel.name.endsWith("Intent"))
  {
    return undefined;
  }

  const payloadName = intentModel.name.slice(0, -"Intent".length);
  const payloadPropertyName = `${payloadName.charAt(0).toLowerCase()}${payloadName.slice(1)}`;
  return intentModel.properties.find((property) => property.name === payloadPropertyName);
}

function generateTypeScriptIntentGuards(intentModels: IntentModel[]): string[]
{
  const lines = [
    "function hasIntentProperty(intent: unknown, propertyName: string): boolean",
    "{",
    "  return typeof intent === \"object\" && intent !== null && Reflect.get(intent, propertyName) !== undefined;",
    "}",
    ""
  ];

  for (const intentModel of intentModels)
  {
    const intentProperty = getIntentPayloadProperty(intentModel);
    if (!intentProperty)
    {
      throw new Error(`Intent model ${intentModel.name} must define its ${intentModel.name.slice(0, -"Intent".length)} payload property.`);
    }

    lines.push(
      `export function is${intentModel.name}(intent: unknown): intent is ${intentModel.name}`,
      "{",
      `  return hasIntentProperty(intent, ${JSON.stringify(intentProperty.name)});`,
      "}",
      ""
    );
  }

  return lines;
}

export function generateIntentTypeScriptCode(spec: IntentSpec, audience: IntentAudience): string
{
  const selectedSpec = collectIntentDeclarations(spec, audience);
  const intentModels = selectedSpec.models.filter((model) => model.audience === audience);
  const unionName = audience === "frontEnd" ? "FrontIntent" : "BackIntent";
  const commonSpec = audience === "backEnd" ? collectIntentDeclarations(spec, "frontEnd") : undefined;
  const commonDeclarations = new Set([
    "IntentJson",
    ...(commonSpec?.models.map((model) => model.name) ?? []),
    ...(commonSpec?.enums.map((intentEnum) => intentEnum.name) ?? []),
    ...(commonSpec?.unions.map((intentUnion) => intentUnion.name) ?? [])
  ]);
  const lines = [
    ...createGeneratedFileHeader("//"),
    "import type { Buffer } from \"node:buffer\";",
    "",
    `${audience === "backEnd" ? "" : "export "}type IntentJson = Record<string, unknown>;`,
    ""
  ];

  for (const intentEnum of selectedSpec.enums)
  {
    const enumCode = generateTypeScriptEnum(intentEnum);
    if (audience === "backEnd" && commonDeclarations.has(intentEnum.name))
    {
      enumCode[0] = enumCode[0].replace("export ", "");
    }
    lines.push(...enumCode, "");
  }

  for (const model of selectedSpec.models)
  {
    const modelCode = generateTypeScriptModel(model);
    if (audience === "backEnd" && commonDeclarations.has(model.name))
    {
      modelCode[0] = modelCode[0].replace("export ", "");
    }
    lines.push(...modelCode, "");
  }

  for (const intentUnion of selectedSpec.unions)
  {
    const unionCode = generateTypeScriptUnion(intentUnion);
    if (audience === "backEnd" && commonDeclarations.has(intentUnion.name))
    {
      unionCode[0] = unionCode[0].replace("export ", "");
    }
    lines.push(...unionCode, "");
  }

  const selectedIntentModels = selectedSpec.models.filter(
    (model) =>
    {
      return model.audience === audience
        || (model.audience === undefined && getIntentPayloadProperty(model) !== undefined);
    }
  );
  lines.push(...generateTypeScriptIntentGuards(selectedIntentModels));
  lines.push(`export type ${unionName} = ${intentModels.map((model) => model.name).join(" | ")};`);
  return `${lines.join("\n").trimEnd()}\n`;
}

function convertToSnakeCase(value: string): string
{
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

function resolvePythonType(type: IntentType): string
{
  switch (type.kind)
  {
    case "string":
      return "str";
    case "number":
      return type.name === "int" ? "int" : "float";
    case "boolean":
      return "bool";
    case "bytes":
      return "bytearray";
    case "enum":
    case "model":
      return type.name;
    case "array":
      return `List[${resolvePythonType(type.elementType ?? { kind: "string", name: "string" })}]`;
    case "record":
      return "Json";
    case "literal":
      return `Literal[${type.name}]`;
    case "union":
      return `Union[${(type.unionTypes ?? []).map(resolvePythonType).join(", ")}]`;
  }
}

function generatePythonEnum(intentEnum: IntentEnum): string[]
{
  const lines = [ `class ${intentEnum.name}(str, Enum):` ];
  if (intentEnum.members.length === 0)
  {
    lines.push("    pass");
  }
  for (const member of intentEnum.members)
  {
    lines.push(`    ${convertToSnakeCase(member.name)} = ${JSON.stringify(member.value)}`);
  }
  return lines;
}

function generatePythonModel(model: IntentModel, modelMap: ReadonlyMap<string, IntentModel>): string[]
{
  const baseModel = model.baseModelName ? modelMap.get(model.baseModelName) : undefined;
  const extendsClause = model.baseModelName ? `(${model.baseModelName})` : "(SuperDataClass)";
  const requiredProperties = model.properties.filter((property) => !property.optional && property.type.kind !== "literal");
  const inheritedPropertyNames = new Set<string>();
  let ancestor = baseModel;
  let hasOptionalInheritedProperty = false;
  while (ancestor)
  {
    for (const property of ancestor.properties)
    {
      inheritedPropertyNames.add(property.name);
      hasOptionalInheritedProperty = hasOptionalInheritedProperty || property.optional;
    }
    ancestor = ancestor.baseModelName ? modelMap.get(ancestor.baseModelName) : undefined;
  }

  const ownProperties = model.properties.filter((property) => !inheritedPropertyNames.has(property.name));
  let hasOptionalPropertyBeforeRequired = false;
  let hasDefaultBeforeRequired = false;
  for (const property of ownProperties)
  {
    if (property.optional)
    {
      hasOptionalPropertyBeforeRequired = true;
    }
    else if (property.type.kind !== "literal" && hasOptionalPropertyBeforeRequired)
    {
      hasDefaultBeforeRequired = true;
    }
  }
  const hasRequiredAfterInheritedDefaults = requiredProperties.some((property) =>
  {
    return !inheritedPropertyNames.has(property.name);
  }) && hasOptionalInheritedProperty;
  const useKeywordOnlyProperties = hasRequiredAfterInheritedDefaults || hasDefaultBeforeRequired;
  const dataclassDecorator = useKeywordOnlyProperties ? "@dataclass(kw_only=True)" : "@dataclass";
  const lines = [ dataclassDecorator, `class ${model.name}${extendsClause}:` ];
  if (ownProperties.length === 0)
  {
    lines.push("    pass");
  }
  for (const property of ownProperties)
  {
    const pythonType = resolvePythonType(property.type);
    const optionalType = property.optional ? `Optional[${pythonType}]` : pythonType;
    const literalValue = property.type.kind === "literal" ? property.type.literalValue : undefined;
    if (literalValue !== undefined)
    {
      lines.push(`    ${property.name}: ${optionalType} = field(default=${JSON.stringify(literalValue)}, init=False)`);
    }
    else if (property.optional)
    {
      lines.push(`    ${property.name}: ${optionalType} = None`);
    }
    else
    {
      lines.push(`    ${property.name}: ${pythonType}`);
    }
  }
  return lines;
}

function generatePythonUnion(intentUnion: IntentUnion): string[]
{
  const unionTypes = intentUnion.variants.map(resolvePythonType);
  return [ `${intentUnion.name} = Union[${unionTypes.join(", ")}]` ];
}

export function generateIntentPythonCode(spec: IntentSpec, audience: IntentAudience): string
{
  const selectedSpec = collectIntentDeclarations(spec, audience);
  const intentModels = selectedSpec.models.filter((model) => model.audience === audience);
  const modelMap = new Map(selectedSpec.models.map((model) => [ model.name, model ]));
  const unionName = audience === "frontEnd" ? "FrontIntent" : "BackIntent";
  const lines = [
    ...createGeneratedFileHeader("#"),
    "from __future__ import annotations",
    "",
    "import json",
    "from dataclasses import asdict, dataclass, field",
    "from enum import Enum",
    "from typing import Any, Dict, List, Literal, Optional, Union",
    "",
    "Json = Dict[str, Any]",
    "",
    "class SuperDataClass:",
    "    @property",
    "    def __dict__(self) -> Dict[str, Any]:",
    "        return asdict(self)",
    "",
    "    @property",
    "    def json(self) -> str:",
    "        return json.dumps(self.__dict__)",
    ""
  ];

  for (const intentEnum of selectedSpec.enums)
  {
    lines.push(...generatePythonEnum(intentEnum), "");
  }

  for (const model of selectedSpec.models)
  {
    lines.push(...generatePythonModel(model, modelMap), "");
  }

  for (const intentUnion of selectedSpec.unions)
  {
    lines.push(...generatePythonUnion(intentUnion), "");
  }

  lines.push(`${unionName} = Union[${intentModels.map((model) => model.name).join(", ")}]`, "");
  return `${lines.join("\n").trimEnd()}\n`;
}
