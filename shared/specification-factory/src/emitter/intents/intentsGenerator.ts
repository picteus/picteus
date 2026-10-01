import { IntentAudience } from "./decorators.js";
import { IntentEnum, IntentModel, IntentSpec, IntentType, IntentUnion } from "./intentsModel.js";
import { createGeneratedFileHeader } from "../common.js";
import { CodeWriter } from "../codeWriter.js";


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

function writeTypeScriptEnum(intentEnum: IntentEnum, writer: CodeWriter, isExported: boolean = true): void
{
  const exportPrefix = isExported ? "export " : "";
  writer.writeLine(`${exportPrefix}enum ${intentEnum.name}`);
  writer.writeLine("{");
  writer.indent(() =>
  {
    for (let index = 0; index < intentEnum.members.length; index++)
    {
      const member = intentEnum.members[index];
      const comma = index < intentEnum.members.length - 1 ? "," : "";
      writer.writeLine(`${member.name.charAt(0).toUpperCase()}${member.name.slice(1)} = ${JSON.stringify(member.value)}${comma}`);
    }
  });
  writer.writeLine("}");
  writer.blankLine();
}

function writeTypeScriptModel(model: IntentModel, writer: CodeWriter, isExported: boolean = true): void
{
  const exportPrefix = isExported ? "export " : "";
  const extendsClause = model.baseModelName ? ` extends ${model.baseModelName}` : "";
  writer.writeLine(`${exportPrefix}interface ${model.name}${extendsClause}`);
  writer.writeLine("{");
  writer.indent(() =>
  {
    for (const property of model.properties)
    {
      const optionalMarker = property.optional ? "?" : "";
      writer.writeLine(`readonly ${property.name}${optionalMarker}: ${resolveTypeScriptType(property.type)};`);
    }
  });
  writer.writeLine("}");
  writer.blankLine();
}

function writeTypeScriptUnion(intentUnion: IntentUnion, writer: CodeWriter, isExported: boolean = true): void
{
  const exportPrefix = isExported ? "export " : "";
  const unionTypes = intentUnion.variants.map(resolveTypeScriptType);
  writer.writeLine(`${exportPrefix}type ${intentUnion.name} = ${unionTypes.join(" | ")};`);
  writer.blankLine();
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

function writeTypeScriptIntentGuards(intentModels: IntentModel[], writer: CodeWriter): void
{
  writer.writeLine("function hasIntentProperty(intent: unknown, propertyName: string): boolean");
  writer.writeLine("{");
  writer.indent(() =>
  {
    writer.writeLine("return typeof intent === \"object\" && intent !== null && Reflect.get(intent, propertyName) !== undefined;");
  });
  writer.writeLine("}");
  writer.blankLine();

  for (const intentModel of intentModels)
  {
    const intentProperty = getIntentPayloadProperty(intentModel);
    if (!intentProperty)
    {
      throw new Error(`Intent model ${intentModel.name} must define its ${intentModel.name.slice(0, -"Intent".length)} payload property.`);
    }

    writer.writeLine(`export function is${intentModel.name}(intent: unknown): intent is ${intentModel.name}`);
    writer.writeLine("{");
    writer.indent(() =>
    {
      writer.writeLine(`return hasIntentProperty(intent, ${JSON.stringify(intentProperty.name)});`);
    });
    writer.writeLine("}");
    writer.blankLine();
  }
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

  const writer = new CodeWriter({ indentSize: 2 });
  writer.writeLines(createGeneratedFileHeader("//"));
  writer.writeLine("import type { Buffer } from \"node:buffer\";");
  writer.blankLine();
  writer.writeLine(`${audience === "backEnd" ? "" : "export "}type IntentJson = Record<string, unknown>;`);
  writer.blankLine();

  for (const intentEnum of selectedSpec.enums)
  {
    const isExported = !(audience === "backEnd" && commonDeclarations.has(intentEnum.name));
    writeTypeScriptEnum(intentEnum, writer, isExported);
  }

  for (const model of selectedSpec.models)
  {
    const isExported = !(audience === "backEnd" && commonDeclarations.has(model.name));
    writeTypeScriptModel(model, writer, isExported);
  }

  for (const intentUnion of selectedSpec.unions)
  {
    const isExported = !(audience === "backEnd" && commonDeclarations.has(intentUnion.name));
    writeTypeScriptUnion(intentUnion, writer, isExported);
  }

  const selectedIntentModels = selectedSpec.models.filter(
    (model) =>
    {
      return model.audience === audience
        || (model.audience === undefined && getIntentPayloadProperty(model) !== undefined);
    }
  );
  writeTypeScriptIntentGuards(selectedIntentModels, writer);
  writer.writeLine(`export type ${unionName} = ${intentModels.map((model) => model.name).join(" | ")};`);

  return `${writer.toString().trimEnd()}\n`;
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

function writePythonEnum(intentEnum: IntentEnum, writer: CodeWriter): void
{
  writer.writeLine(`class ${intentEnum.name}(str, Enum):`);
  writer.indent(() =>
  {
    if (intentEnum.members.length === 0)
    {
      writer.writeLine("pass");
      return;
    }
    for (const member of intentEnum.members)
    {
      writer.writeLine(`${convertToSnakeCase(member.name)} = ${JSON.stringify(member.value)}`);
    }
  });
  writer.blankLine();
}

function writePythonModel(model: IntentModel, modelMap: ReadonlyMap<string, IntentModel>, writer: CodeWriter): void
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

  writer.writeLine(dataclassDecorator);
  writer.writeLine(`class ${model.name}${extendsClause}:`);
  writer.indent(() =>
  {
    if (ownProperties.length === 0)
    {
      writer.writeLine("pass");
      return;
    }
    for (const property of ownProperties)
    {
      const pythonType = resolvePythonType(property.type);
      const optionalType = property.optional ? `Optional[${pythonType}]` : pythonType;
      const literalValue = property.type.kind === "literal" ? property.type.literalValue : undefined;
      if (literalValue !== undefined)
      {
        writer.writeLine(`${property.name}: ${optionalType} = field(default=${JSON.stringify(literalValue)}, init=False)`);
      }
      else if (property.optional)
      {
        writer.writeLine(`${property.name}: ${optionalType} = None`);
      }
      else
      {
        writer.writeLine(`${property.name}: ${pythonType}`);
      }
    }
  });
  writer.blankLine();
}

function writePythonUnion(intentUnion: IntentUnion, writer: CodeWriter): void
{
  const unionTypes = intentUnion.variants.map(resolvePythonType);
  writer.writeLine(`${intentUnion.name} = Union[${unionTypes.join(", ")}]`);
  writer.blankLine();
}

export function generateIntentPythonCode(spec: IntentSpec, audience: IntentAudience): string
{
  const selectedSpec = collectIntentDeclarations(spec, audience);
  const intentModels = selectedSpec.models.filter((model) => model.audience === audience);
  const modelMap = new Map(selectedSpec.models.map((model) => [ model.name, model ]));
  const unionName = audience === "frontEnd" ? "FrontIntent" : "BackIntent";

  const writer = new CodeWriter({ indentSize: 4 });
  writer.writeLines(createGeneratedFileHeader("#"));
  writer.writeLine("from __future__ import annotations");
  writer.blankLine();
  writer.writeLine("import json");
  writer.writeLine("from dataclasses import asdict, dataclass, field");
  writer.writeLine("from enum import Enum");
  writer.writeLine("from typing import Any, Dict, List, Literal, Optional, Union");
  writer.blankLine();
  writer.writeLine("Json = Dict[str, Any]");
  writer.blankLine();
  writer.writeLine("class SuperDataClass:");
  writer.indent(() =>
  {
    writer.writeLine("@property");
    writer.writeLine("def __dict__(self) -> Dict[str, Any]:");
    writer.indent(() =>
    {
      writer.writeLine("return asdict(self)");
    });
    writer.blankLine();
    writer.writeLine("@property");
    writer.writeLine("def json(self) -> str:");
    writer.indent(() =>
    {
      writer.writeLine("return json.dumps(self.__dict__)");
    });
  });
  writer.blankLine();

  for (const intentEnum of selectedSpec.enums)
  {
    writePythonEnum(intentEnum, writer);
  }

  for (const model of selectedSpec.models)
  {
    writePythonModel(model, modelMap, writer);
  }

  for (const intentUnion of selectedSpec.unions)
  {
    writePythonUnion(intentUnion, writer);
  }

  writer.writeLine(`${unionName} = Union[${intentModels.map((model) => model.name).join(", ")}]`);

  return `${writer.toString().trimEnd()}\n`;
}
