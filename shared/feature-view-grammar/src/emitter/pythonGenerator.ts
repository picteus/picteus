import { GrammarModel, GrammarProperty, GrammarSpec, GrammarType } from "./typespecModel.js";


/**
 * Set of Python built-in names that should not trigger linter warnings
 * (e.g. Ruff A002/A003, Pylint W0622 redefined-builtin, PyCharm shadowing-builtins) when emitted.
 */
const PROTECTED_PYTHON_NAMES: ReadonlySet<string> = new Set([
  "id",
  "format",
  "type",
  "input",
  "filter",
  "map",
  "range",
  "hash",
  "iter",
  "min",
  "max",
  "sum",
  "object",
  "list",
  "dict",
  "set",
  "all",
  "any",
  "bin",
  "chr",
  "dir",
  "hex",
  "len",
  "oct",
  "ord",
  "pow",
  "str",
  "zip",
  "json"
]);

function convertToSnakeCase(value: string): string
{
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function hasProtectedParameter(parameterNames: string[]): boolean
{
  return parameterNames.some((parameterName) => PROTECTED_PYTHON_NAMES.has(parameterName));
}

function computeFieldNoqa(fieldName: string): string
{
  return PROTECTED_PYTHON_NAMES.has(fieldName) ? "  # noqa: A003" : "";
}

function computeFunctionNoqa(parameterNames: string[]): string
{
  return hasProtectedParameter(parameterNames) ? "  # noqa: A002" : "";
}

function computeNoinspectionLines(indent: string = ""): string[]
{
  return [
    `${indent}# noinspection PyShadowingBuiltins`,
    `${indent}# noinspection shadowing-builtins`
  ];
}

function formatPythonDoc(doc?: string, indent: string = "    "): string
{
  if (!doc)
  {
    return "";
  }
  const lines = doc.trim().split("\n");
  if (lines.length === 1)
  {
    return `${indent}"""${lines[0].trim()}"""\n`;
  }
  const formatted = lines.map((line) => `${indent}${line.trim()}`).join("\n");
  return `${indent}"""\n${formatted}\n${indent}"""\n`;
}

function resolvePythonType(type: GrammarType): string
{
  switch (type.kind)
  {
    case "string":
      return "str";
    case "number":
      return "float";
    case "boolean":
      return "bool";
    case "literal":
      return `Literal[${type.name}]`;
    case "enum":
      return type.name;
    case "model":
      return type.name;
    case "array":
      return `List[${resolvePythonType(type.elementType ?? { kind: "unknown", name: "Any" })}]`;
    case "record":
      return "Dict[str, Any]";
    case "union":
      return `Union[${type.unionTypes?.map(resolvePythonType).join(", ") ?? "Any"}]`;
    default:
      return "Any";
  }
}

function computePythonFactoryNames(model: GrammarModel): { primary: string; aliases: string[] }
{
  let baseName = model.name;
  if (baseName.endsWith("Element"))
  {
    baseName = baseName.slice(0, -"Element".length);
  }
  const primary = convertToSnakeCase(baseName);
  const aliases = (model.aliases ?? []).map(convertToSnakeCase);
  return { primary, aliases };
}

function generatePythonModelFactory(model: GrammarModel): string[]
{
  const lines: string[] = [];
  const { primary, aliases } = computePythonFactoryNames(model);

  const nonTypeProperties = model.properties.filter((property) => property.name !== "type");
  const requiredProperties = nonTypeProperties.filter((property) => !property.optional && property.defaultValue === undefined);
  const optionalProperties = nonTypeProperties.filter((property) => property.optional || property.defaultValue !== undefined);

  const parameters: string[] = [];
  const rawParameterNames: string[] = [];

  for (const property of requiredProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    const pythonType = resolvePythonType(property.type);
    parameters.push(`${pythonName}: ${pythonType}`);
    rawParameterNames.push(pythonName);
  }

  for (const property of optionalProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    const baseType = resolvePythonType(property.type);
    const pythonType = property.optional ? `Optional[${baseType}]` : baseType;
    rawParameterNames.push(pythonName);

    if (property.defaultValue !== undefined)
    {
      let defaultValueString = String(property.defaultValue);
      if (typeof property.defaultValue === "string")
      {
        if (property.type.kind === "enum")
        {
          defaultValueString = `${property.type.name}.${convertToSnakeCase(property.defaultValue)}`;
        }
        else
        {
          defaultValueString = `"${property.defaultValue}"`;
        }
      }
      else if (typeof property.defaultValue === "boolean")
      {
        defaultValueString = property.defaultValue ? "True" : "False";
      }
      parameters.push(`${pythonName}: ${pythonType} = ${defaultValueString}`);
    }
    else
    {
      parameters.push(`${pythonName}: ${pythonType} = None`);
    }
  }

  const callArguments: string[] = [];
  for (const property of requiredProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    if (property.type.kind === "array")
    {
      callArguments.push(`${pythonName}=list(${pythonName})`);
    }
    else
    {
      callArguments.push(`${pythonName}=${pythonName}`);
    }
  }

  for (const property of optionalProperties)
  {
    const pythonName = convertToSnakeCase(property.name);
    if (property.type.kind === "array")
    {
      callArguments.push(`${pythonName}=list(${pythonName}) if ${pythonName} is not None else None`);
    }
    else
    {
      callArguments.push(`${pythonName}=${pythonName}`);
    }
  }

  const allNames = Array.from(new Set([ primary, ...aliases ]));
  const noqa = computeFunctionNoqa(rawParameterNames);
  const isShadowing = hasProtectedParameter(rawParameterNames);

  for (const functionName of allNames)
  {
    if (isShadowing)
    {
      lines.push(...computeNoinspectionLines());
    }
    lines.push(`def ${functionName}(${parameters.join(", ")}) -> ${model.name}:${noqa}`);
    if (model.doc)
    {
      lines.push(formatPythonDoc(model.doc, "    "));
    }
    lines.push(`    return ${model.name}(${callArguments.join(", ")})`);
    lines.push("");
  }

  return lines;
}

export function generatePythonCode(spec: GrammarSpec): string
{
  const lines: string[] = [];
  const polymorphicRootNames = new Set(spec.polymorphicRoots.map((root) => root.name));

  lines.push("# ---------------------------------------------------------------------------");
  lines.push("# Auto-generated by @picteus/feature-view-grammar emitter. Do not edit directly.");
  lines.push("# ---------------------------------------------------------------------------");
  lines.push("# ruff: noqa: A002, A003");
  lines.push("# pylint: disable=redefined-builtin,invalid-name");
  lines.push("");
  lines.push("from __future__ import annotations");
  lines.push("");
  lines.push("import json as _json");
  lines.push("from dataclasses import dataclass, field");
  lines.push("from enum import Enum");
  lines.push("from typing import Any, Dict, List, Literal, Optional, Protocol, Union, runtime_checkable");
  lines.push("");

  // We define base serialization dataclass
  lines.push("@dataclass");
  lines.push("class GrammarBase:");
  lines.push("    \"\"\"Base dataclass providing recursive dictionary and JSON serialization.\"\"\"");
  lines.push("");
  lines.push("    def to_dict(self) -> Dict[str, Any]:");
  lines.push("        def _clean(val: Any) -> Any:");
  lines.push("            if isinstance(val, Enum):");
  lines.push("                return val.value");
  lines.push("            if isinstance(val, GrammarBase):");
  lines.push("                return val.to_dict()");
  lines.push("            if isinstance(val, list):");
  lines.push("                return [_clean(item) for item in val if item is not None]");
  lines.push("            if isinstance(val, dict):");
  lines.push("                return {k: _clean(v) for k, v in val.items() if v is not None}");
  lines.push("            return val");
  lines.push("");
  lines.push("        result: Dict[str, Any] = {}");
  lines.push("        for field_name, field_val in self.__dict__.items():");
  lines.push("            if field_val is not None:");
  lines.push("                parts = field_name.split('_')");
  lines.push("                camel_key = parts[0] + ''.join(p.capitalize() for p in parts[1:]) if len(parts) > 1 else field_name");
  lines.push("                result[camel_key] = _clean(field_val)");
  lines.push("        return result");
  lines.push("");
  lines.push("    def to_json(self, indent: Optional[int] = None) -> str:");
  lines.push("        return _json.dumps(self.to_dict(), indent=indent)");
  lines.push("");

  // 1. We generate Enums from AST
  for (const grammarEnum of spec.enums)
  {
    lines.push(`class ${grammarEnum.name}(str, Enum):`);
    if (grammarEnum.doc)
    {
      lines.push(formatPythonDoc(grammarEnum.doc, "    "));
    }
    for (const member of grammarEnum.members)
    {
      lines.push(`    ${convertToSnakeCase(member.name)} = "${member.value}"`);
    }
    lines.push("");
  }

  // 2. We generate Protocols (Structural Interfaces via typing.Protocol PEP 544)
  lines.push("# --- Protocols (Structural Typing Contracts via PEP 544) ---");
  lines.push("");

  for (const root of spec.polymorphicRoots)
  {
    const rootModel = spec.models.find((model) => model.name === root.name);
    lines.push("@runtime_checkable");
    lines.push(`class ${root.name}Protocol(Protocol):`);
    lines.push(formatPythonDoc(root.doc ?? `Structural interface protocol for ${root.name}.`, "    "));
    lines.push("    @property");
    const rootDiscriminatorName = convertToSnakeCase(root.discriminatorProperty);
    if (PROTECTED_PYTHON_NAMES.has(rootDiscriminatorName))
    {
      lines.push(...computeNoinspectionLines("    "));
    }
    lines.push(`    def ${rootDiscriminatorName}(self) -> str: ...${computeFieldNoqa(rootDiscriminatorName)}`);
    if (rootModel)
    {
      for (const property of rootModel.properties)
      {
        if (property.name !== root.discriminatorProperty)
        {
          const pythonName = convertToSnakeCase(property.name);
          const pythonType = resolvePythonType(property.type);
          lines.push("    @property");
          if (PROTECTED_PYTHON_NAMES.has(pythonName))
          {
            lines.push(...computeNoinspectionLines("    "));
          }
          lines.push(`    def ${pythonName}(self) -> ${pythonType}: ...${computeFieldNoqa(pythonName)}`);
        }
      }
    }
    lines.push("");

    for (const derived of root.derivedModels)
    {
      if (derived.isDslIgnored)
      {
        continue;
      }
      lines.push("@runtime_checkable");
      lines.push(`class ${derived.name}Protocol(${root.name}Protocol, Protocol):`);
      lines.push(formatPythonDoc(derived.doc ?? `Protocol contract for ${derived.name}.`, "    "));
      for (const property of derived.properties)
      {
        if (property.name !== root.discriminatorProperty)
        {
          const pythonName = convertToSnakeCase(property.name);
          const baseType = resolvePythonType(property.type);
          const pythonType = property.optional ? `Optional[${baseType}]` : baseType;
          lines.push("    @property");
          if (PROTECTED_PYTHON_NAMES.has(pythonName))
          {
            lines.push(...computeNoinspectionLines("    "));
          }
          lines.push(`    def ${pythonName}(self) -> ${pythonType}: ...${computeFieldNoqa(pythonName)}`);
        }
      }
      lines.push("");
    }
  }

  // 3. We generate Base Dataclasses for Polymorphic Roots
  for (const root of spec.polymorphicRoots)
  {
    lines.push("@dataclass");
    lines.push(`class ${root.name}Base(GrammarBase):`);
    lines.push(formatPythonDoc(`Base dataclass for all ${root.name} models.`, "    "));
    lines.push("    pass");
    lines.push("");
  }

  // 4. We generate Supporting Models (non-polymorphic derived, non-root) from AST
  const supportingModels = spec.models.filter(
    (model) =>
      !polymorphicRootNames.has(model.name) &&
      (!model.baseModelName || !polymorphicRootNames.has(model.baseModelName)) &&
      model !== spec.rootModel &&
      !model.isDslIgnored
  );

  for (const model of supportingModels)
  {
    const baseClassName = (model.baseModelName && !polymorphicRootNames.has(model.baseModelName))
      ? model.baseModelName
      : "GrammarBase";
    lines.push("@dataclass");
    lines.push(`class ${model.name}(${baseClassName}):`);
    if (model.doc)
    {
      lines.push(formatPythonDoc(model.doc, "    "));
    }

    const requiredProperties = model.properties.filter((property) => !property.optional && property.defaultValue === undefined);
    const optionalProperties = model.properties.filter((property) => property.optional || property.defaultValue !== undefined);

    if (requiredProperties.length === 0 && optionalProperties.length === 0)
    {
      lines.push("    pass");
    }

    for (const property of requiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const pythonType = resolvePythonType(property.type);
      if (PROTECTED_PYTHON_NAMES.has(pythonName))
      {
        lines.push(...computeNoinspectionLines("    "));
      }
      lines.push(`    ${pythonName}: ${pythonType}${computeFieldNoqa(pythonName)}`);
    }

    for (const property of optionalProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const baseType = resolvePythonType(property.type);
      const pythonType = property.optional ? `Optional[${baseType}]` : baseType;

      if (PROTECTED_PYTHON_NAMES.has(pythonName))
      {
        lines.push(...computeNoinspectionLines("    "));
      }

      if (property.defaultValue !== undefined)
      {
        let defaultValueString = String(property.defaultValue);
        if (typeof property.defaultValue === "string")
        {
          if (property.type.kind === "enum")
          {
            defaultValueString = `${property.type.name}.${convertToSnakeCase(property.defaultValue)}`;
          }
          else
          {
            defaultValueString = `"${property.defaultValue}"`;
          }
        }
        else if (typeof property.defaultValue === "boolean")
        {
          defaultValueString = property.defaultValue ? "True" : "False";
        }
        lines.push(`    ${pythonName}: ${pythonType} = ${defaultValueString}${computeFieldNoqa(pythonName)}`);
      }
      else
      {
        lines.push(`    ${pythonName}: ${pythonType} = None${computeFieldNoqa(pythonName)}`);
      }
    }
    lines.push("");
  }

  // 5. We generate Concrete Derived Dataclasses from polymorphic roots
  for (const root of spec.polymorphicRoots)
  {
    const baseClassName = `${root.name}Base`;
    for (const model of root.derivedModels)
    {
      if (model.isDslIgnored)
      {
        continue;
      }
      lines.push("@dataclass");
      lines.push(`class ${model.name}(${baseClassName}):`);
      if (model.doc)
      {
        lines.push(formatPythonDoc(model.doc, "    "));
      }

      const otherProperties = model.properties.filter((property) => property.name !== "type");
      const requiredProperties = otherProperties.filter((property) => !property.optional && property.defaultValue === undefined);
      const optionalProperties = otherProperties.filter((property) => property.optional || property.defaultValue !== undefined);

      for (const property of requiredProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const pythonType = resolvePythonType(property.type);
        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          lines.push(...computeNoinspectionLines("    "));
        }
        lines.push(`    ${pythonName}: ${pythonType}${computeFieldNoqa(pythonName)}`);
      }

      const discriminatorValue = model.discriminatorValue ?? "element";
      lines.push(...computeNoinspectionLines("    "));
      lines.push(`    type: str = "${discriminatorValue}"${computeFieldNoqa("type")}`);

      for (const property of optionalProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const baseType = resolvePythonType(property.type);
        const pythonType = property.optional ? `Optional[${baseType}]` : baseType;

        if (PROTECTED_PYTHON_NAMES.has(pythonName))
        {
          lines.push(...computeNoinspectionLines("    "));
        }

        if (property.defaultValue !== undefined)
        {
          let defaultValueString = String(property.defaultValue);
          if (typeof property.defaultValue === "string")
          {
            if (property.type.kind === "enum")
            {
              defaultValueString = `${property.type.name}.${convertToSnakeCase(property.defaultValue)}`;
            }
            else
            {
              defaultValueString = `"${property.defaultValue}"`;
            }
          }
          else if (typeof property.defaultValue === "boolean")
          {
            defaultValueString = property.defaultValue ? "True" : "False";
          }
          lines.push(`    ${pythonName}: ${pythonType} = ${defaultValueString}${computeFieldNoqa(pythonName)}`);
        }
        else
        {
          lines.push(`    ${pythonName}: ${pythonType} = None${computeFieldNoqa(pythonName)}`);
        }
      }
      lines.push("");
    }

    // We generate polymorphic union type
    const derivedUnionType = root.derivedModels.map((model) => model.name).join(", ");
    lines.push(`${root.name} = Union[${derivedUnionType}]`);
    lines.push("");
  }

  // 6. We generate Root Models and Builders
  const rootModels = spec.rootModels.length > 0 ? spec.rootModels : (spec.rootModel ? [ spec.rootModel ] : []);
  for (const root of rootModels)
  {
    lines.push("@dataclass");
    lines.push(`class ${root.name}(GrammarBase):`);
    if (root.doc)
    {
      lines.push(formatPythonDoc(root.doc, "    "));
    }

    const hasSchemaVersion = root.properties.some((property) => property.name === "schemaVersion");
    const rootNonTypeProperties = root.properties.filter((property) => property.name !== "type" && property.name !== "schemaVersion");
    const rootRequiredProperties = rootNonTypeProperties.filter((property) => !property.optional && property.type.kind !== "array" && property.defaultValue === undefined);
    const rootOptionalProperties = rootNonTypeProperties.filter((property) => (property.optional || property.defaultValue !== undefined) && property.type.kind !== "array");
    const rootArrayProperties = rootNonTypeProperties.filter((property) => property.type.kind === "array");

    for (const property of rootRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const baseType = resolvePythonType(property.type);
      if (PROTECTED_PYTHON_NAMES.has(pythonName))
      {
        lines.push(...computeNoinspectionLines("    "));
      }
      lines.push(`    ${pythonName}: ${baseType}${computeFieldNoqa(pythonName)}`);
    }

    if (hasSchemaVersion)
    {
      lines.push(`    schema_version: str = "1.0"${computeFieldNoqa("schema_version")}`);
    }

    for (const property of rootOptionalProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const baseType = resolvePythonType(property.type);
      if (PROTECTED_PYTHON_NAMES.has(pythonName))
      {
        lines.push(...computeNoinspectionLines("    "));
      }
      if (property.defaultValue !== undefined)
      {
        lines.push(`    ${pythonName}: ${baseType} = "${property.defaultValue}"${computeFieldNoqa(pythonName)}`);
      }
      else
      {
        lines.push(`    ${pythonName}: Optional[${baseType}] = None${computeFieldNoqa(pythonName)}`);
      }
    }

    for (const property of rootArrayProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const baseType = resolvePythonType(property.type);
      if (PROTECTED_PYTHON_NAMES.has(pythonName))
      {
        lines.push(...computeNoinspectionLines("    "));
      }
      if (!property.optional)
      {
        lines.push(`    ${pythonName}: ${baseType} = field(default_factory=list)${computeFieldNoqa(pythonName)}`);
      }
      else
      {
        lines.push(`    ${pythonName}: Optional[${baseType}] = None${computeFieldNoqa(pythonName)}`);
      }
    }
    lines.push("");

    // 7. We generate Root Builder
    const builderClassName = `${root.name}Builder`;

    lines.push(`class ${builderClassName}:`);
    lines.push(formatPythonDoc(`Fluent builder for constructing ${root.name} instances.`, "    "));

    const constructorParameters: string[] = [];
    const constructorParameterNames: string[] = [];
    for (const property of rootRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      constructorParameters.push(`${pythonName}: ${resolvePythonType(property.type)}`);
      constructorParameterNames.push(pythonName);
    }
    const constructorNoqa = computeFunctionNoqa(constructorParameterNames);

    if (hasProtectedParameter(constructorParameterNames))
    {
      lines.push(...computeNoinspectionLines("    "));
    }
    const constructorParameterString = constructorParameters.length > 0 ? `, ${constructorParameters.join(", ")}` : "";
    lines.push(`    def __init__(self${constructorParameterString}):${constructorNoqa}`);
    for (const property of rootRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      lines.push(`        self._${pythonName} = ${pythonName}`);
    }
    for (const property of rootOptionalProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      if (property.defaultValue !== undefined)
      {
        const defaultValue = typeof property.defaultValue === "string" ? `"${property.defaultValue}"` : (property.defaultValue ? "True" : "False");
        lines.push(`        self._${pythonName}: ${resolvePythonType(property.type)} = ${defaultValue}`);
      }
      else
      {
        lines.push(`        self._${pythonName}: Optional[${resolvePythonType(property.type)}] = None`);
      }
    }
    for (const property of rootArrayProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      lines.push(`        self._${pythonName}: List[Any] = []`);
    }
    if (rootRequiredProperties.length === 0 && rootOptionalProperties.length === 0 && rootArrayProperties.length === 0)
    {
      lines.push("        pass");
    }
    lines.push("");

    // We generate setters for scalar optional properties
    for (const property of rootOptionalProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const pythonType = resolvePythonType(property.type);

      if (property.name === "description")
      {
        lines.push(`    def description(self, description: str) -> ${builderClassName}:`);
        lines.push(`        self._description = description`);
        lines.push("        return self");
        lines.push("");
      }
      else if (property.name === "attribution")
      {
        lines.push(...computeNoinspectionLines("    "));
        lines.push(`    def attribution(self, extension_id: Optional[str] = None, format: str = "json", attribution: Optional[FeatureAttribution] = None) -> ${builderClassName}:  # noqa: A002`);
        lines.push("        if attribution is not None:");
        lines.push("            self._attribution = attribution");
        lines.push("        elif extension_id is not None:");
        lines.push("            self._attribution = FeatureAttribution(extension_id=extension_id, format=format)");
        lines.push("        return self");
        lines.push("");
      }
      else
      {
        const isProtectedSetter = PROTECTED_PYTHON_NAMES.has(pythonName);
        if (isProtectedSetter)
        {
          lines.push(...computeNoinspectionLines("    "));
        }
        const setterNoqa = computeFunctionNoqa([ pythonName ]);
        lines.push(`    def ${pythonName}(self, ${pythonName}: ${pythonType}) -> ${builderClassName}:${setterNoqa}`);
        lines.push(`        self._${pythonName} = ${pythonName}`);
        lines.push("        return self");
        lines.push("");
      }
    }

    // We generate generic collection adders
    for (const property of rootArrayProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      const elementType = resolvePythonType(property.type.elementType ?? { kind: "unknown", name: "Any" });
      const singularName = property.name.endsWith("s") ? property.name.slice(0, -1) : property.name;
      const pythonSingular = convertToSnakeCase(singularName);

      if (property.name === "elements")
      {
        lines.push(`    def add(self, element: ${elementType}) -> ${builderClassName}:`);
        lines.push(`        self._${pythonName}.append(element)`);
        lines.push("        return self");
        lines.push("");
      }

      lines.push(`    def add_${pythonName}(self, *items: ${elementType}) -> ${builderClassName}:`);
      lines.push(`        self._${pythonName}.extend(items)`);
      lines.push("        return self");
      lines.push("");

      if (property.name !== "elements")
      {
        lines.push(`    def add_${pythonSingular}(self, item: ${elementType}) -> ${builderClassName}:`);
        lines.push(`        self._${pythonName}.append(item)`);
        lines.push("        return self");
        lines.push("");
      }
    }

    // We generate dynamic builder methods for all visual UI elements
    for (const uiModel of spec.uiElements)
    {
      if (uiModel.isDslIgnored)
      {
        continue;
      }
      const { primary, aliases } = computePythonFactoryNames(uiModel);
      const allNames = Array.from(new Set([ primary, ...aliases ]));

      const nonTypeProperties = uiModel.properties.filter((property) => property.name !== "type");
      const requiredProperties = nonTypeProperties.filter((property) => !property.optional && property.defaultValue === undefined);
      const optionalProperties = nonTypeProperties.filter((property) => property.optional || property.defaultValue !== undefined);

      const parameters: string[] = [];
      const callArguments: string[] = [];
      const rawMethodParameterNames: string[] = [];

      for (const property of requiredProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const pythonType = resolvePythonType(property.type);
        parameters.push(`${pythonName}: ${pythonType}`);
        callArguments.push(`${pythonName}=${pythonName}`);
        rawMethodParameterNames.push(pythonName);
      }

      for (const property of optionalProperties)
      {
        const pythonName = convertToSnakeCase(property.name);
        const baseType = resolvePythonType(property.type);
        const pythonType = property.optional ? `Optional[${baseType}]` : baseType;
        rawMethodParameterNames.push(pythonName);

        if (hasPropertyDefault(property))
        {
          let defaultValueString = String(property.defaultValue);
          if (typeof property.defaultValue === "string")
          {
            defaultValueString = property.type.kind === "enum" ? `${property.type.name}.${convertToSnakeCase(property.defaultValue)}` : `"${property.defaultValue}"`;
          }
          else if (typeof property.defaultValue === "boolean")
          {
            defaultValueString = property.defaultValue ? "True" : "False";
          }
          parameters.push(`${pythonName}: ${pythonType} = ${defaultValueString}`);
        }
        else
        {
          parameters.push(`${pythonName}: ${pythonType} = None`);
        }
        callArguments.push(`${pythonName}=${pythonName}`);
      }

      const methodNoqa = computeFunctionNoqa(rawMethodParameterNames);
      const hasShadowing = hasProtectedParameter(rawMethodParameterNames);

      for (const functionName of allNames)
      {
        const methodName = `add_${functionName}`;
        if (hasShadowing)
        {
          lines.push(...computeNoinspectionLines("    "));
        }
        lines.push(`    def ${methodName}(self, ${parameters.join(", ")}) -> ${builderClassName}:${methodNoqa}`);
        lines.push(`        return self.add(${functionName}(${callArguments.join(", ")}))`);
        lines.push("");
      }
    }

    lines.push(`    def build(self) -> ${root.name}:`);
    lines.push(`        return ${root.name}(`);
    if (hasSchemaVersion)
    {
      lines.push(`            schema_version="1.0",`);
    }
    for (const property of rootRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      lines.push(`            ${pythonName}=self._${pythonName},`);
    }
    for (const property of rootOptionalProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      lines.push(`            ${pythonName}=self._${pythonName},`);
    }
    for (const property of rootArrayProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      if (property.optional)
      {
        lines.push(`            ${pythonName}=list(self._${pythonName}) if len(self._${pythonName}) > 0 else None,`);
      }
      else
      {
        lines.push(`            ${pythonName}=list(self._${pythonName}),`);
      }
    }
    const lastBuildLineIndex = lines.length - 1;
    lines[lastBuildLineIndex] = lines[lastBuildLineIndex].replace(/,$/, "");
    lines.push("        )");
    lines.push("");

    // 8. We generate Functional Root Factory
    const createFunctionName = `create_${convertToSnakeCase(root.name)}`;
    const rootCreateArguments: string[] = [];
    const rootCreateParameterNames: string[] = [];

    for (const property of rootRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      rootCreateArguments.push(`${pythonName}: ${resolvePythonType(property.type)}`);
      rootCreateParameterNames.push(pythonName);
    }
    for (const property of rootNonTypeProperties.filter((property) => !rootRequiredProperties.includes(property)))
    {
      const pythonName = convertToSnakeCase(property.name);
      const baseType = resolvePythonType(property.type);
      rootCreateParameterNames.push(pythonName);
      if (property.defaultValue !== undefined)
      {
        const defaultValue = typeof property.defaultValue === "string" ? `"${property.defaultValue}"` : (property.defaultValue ? "True" : "False");
        rootCreateArguments.push(`${pythonName}: ${baseType} = ${defaultValue}`);
      }
      else
      {
        rootCreateArguments.push(`${pythonName}: Optional[${baseType}] = None`);
      }
    }

    const rootCreateNoqa = computeFunctionNoqa(rootCreateParameterNames);
    if (hasProtectedParameter(rootCreateParameterNames))
    {
      lines.push(...computeNoinspectionLines());
    }
    lines.push(`def ${createFunctionName}(${rootCreateArguments.join(", ")}) -> ${root.name}:${rootCreateNoqa}`);
    lines.push(`    return ${root.name}(`);
    if (hasSchemaVersion)
    {
      lines.push(`        schema_version="1.0",`);
    }
    for (const property of rootRequiredProperties)
    {
      const pythonName = convertToSnakeCase(property.name);
      lines.push(`        ${pythonName}=${pythonName},`);
    }
    for (const property of rootNonTypeProperties.filter((property) => !rootRequiredProperties.includes(property)))
    {
      const pythonName = convertToSnakeCase(property.name);
      if (property.type.kind === "array" && !property.optional)
      {
        lines.push(`        ${pythonName}=list(${pythonName}) if ${pythonName} is not None else [],`);
      }
      else if (property.type.kind === "array" && property.optional)
      {
        lines.push(`        ${pythonName}=list(${pythonName}) if ${pythonName} is not None else None,`);
      }
      else
      {
        lines.push(`        ${pythonName}=${pythonName},`);
      }
    }
    const lastRootCreateLineIndex = lines.length - 1;
    lines[lastRootCreateLineIndex] = lines[lastRootCreateLineIndex].replace(/,$/, "");
    lines.push("    )");
    lines.push("");
  }

  // 9. We generate Functional DSL Factory Helpers for all models from AST
  lines.push("# --- Functional DSL Factory Helpers ---");
  lines.push("");

  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslRoot || spec.rootModels.includes(model) || model.isDslIgnored)
    {
      continue;
    }
    const factoryLines = generatePythonModelFactory(model);
    lines.push(...factoryLines);
  }

  return lines.join("\n");
}

function hasPropertyDefault(property: GrammarProperty): boolean
{
  return property.defaultValue !== undefined;
}
