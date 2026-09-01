import { GrammarModel, GrammarProperty, GrammarSpec, GrammarType } from "./typespecModel.js";


/**
 * Set of Python built-in names that should not trigger linter warnings
 * (e.g. Ruff A002/A003, Pylint W0622 redefined-builtin, PyCharm shadowing-builtins) when emitted.
 */
const PROTECTED_PYTHON_NAMES = new Set([
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
  "zip"
]);

function toSnakeCase(strig: string): string
{
  return strig.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function hasProtectedParam(parametersNames: string[]): boolean
{
  return parametersNames.some((parameterName) => PROTECTED_PYTHON_NAMES.has(parameterName));
}

function getFieldNoqa(fieldName: string): string
{
  return PROTECTED_PYTHON_NAMES.has(fieldName) ? "  # noqa: A003" : "";
}

function getFunctionNoqa(parametersNames: string[]): string
{
  return hasProtectedParam(parametersNames) ? "  # noqa: A002" : "";
}

function getNoinspectionLines(indent: string = ""): string[]
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

function getPythonFactoryNames(model: GrammarModel): { primary: string; aliases: string[] }
{
  let baseName = model.name;
  if (baseName.endsWith("Element"))
  {
    baseName = baseName.slice(0, -"Element".length);
  }
  const primary = toSnakeCase(baseName);
  const aliases = (model.aliases ?? []).map(toSnakeCase);
  return { primary, aliases };
}

function generatePythonModelFactory(model: GrammarModel): string[]
{
  const lines: string[] = [];
  const { primary, aliases } = getPythonFactoryNames(model);

  const nonTypeProps = model.properties.filter((p) => p.name !== "type");
  const requiredProps = nonTypeProps.filter((p) => !p.optional && p.defaultValue === undefined);
  const optionalProps = nonTypeProps.filter((p) => p.optional || p.defaultValue !== undefined);

  const params: string[] = [];
  const rawParamNames: string[] = [];

  for (const prop of requiredProps)
  {
    const pyName = toSnakeCase(prop.name);
    const pyType = resolvePythonType(prop.type);
    params.push(`${pyName}: ${pyType}`);
    rawParamNames.push(pyName);
  }

  for (const prop of optionalProps)
  {
    const pyName = toSnakeCase(prop.name);
    const baseType = resolvePythonType(prop.type);
    const pyType = prop.optional ? `Optional[${baseType}]` : baseType;
    rawParamNames.push(pyName);

    if (prop.defaultValue !== undefined)
    {
      let defaultValStr = String(prop.defaultValue);
      if (typeof prop.defaultValue === "string")
      {
        if (prop.type.kind === "enum")
        {
          defaultValStr = `${prop.type.name}.${toSnakeCase(prop.defaultValue)}`;
        }
        else
        {
          defaultValStr = `"${prop.defaultValue}"`;
        }
      }
      else if (typeof prop.defaultValue === "boolean")
      {
        defaultValStr = prop.defaultValue ? "True" : "False";
      }
      params.push(`${pyName}: ${pyType} = ${defaultValStr}`);
    }
    else
    {
      params.push(`${pyName}: ${pyType} = None`);
    }
  }

  const callArgs: string[] = [];
  for (const prop of requiredProps)
  {
    const pyName = toSnakeCase(prop.name);
    if (prop.type.kind === "array")
    {
      callArgs.push(`${pyName}=list(${pyName})`);
    }
    else
    {
      callArgs.push(`${pyName}=${pyName}`);
    }
  }

  for (const prop of optionalProps)
  {
    const pyName = toSnakeCase(prop.name);
    if (prop.type.kind === "array")
    {
      callArgs.push(`${pyName}=list(${pyName}) if ${pyName} is not None else None`);
    }
    else
    {
      callArgs.push(`${pyName}=${pyName}`);
    }
  }

  const allNames = [ primary, ...aliases ];
  const noqa = getFunctionNoqa(rawParamNames);
  const isShadowing = hasProtectedParam(rawParamNames);

  for (const fnName of allNames)
  {
    if (isShadowing)
    {
      lines.push(...getNoinspectionLines());
    }
    lines.push(`def ${fnName}(${params.join(", ")}) -> ${model.name}:${noqa}`);
    if (model.doc)
    {
      lines.push(formatPythonDoc(model.doc, "    "));
    }
    lines.push(`    return ${model.name}(${callArgs.join(", ")})`);
    lines.push("");
  }

  return lines;
}

export function generatePythonCode(spec: GrammarSpec): string
{
  const lines: string[] = [];
  const polymorphicRootNames = new Set(spec.polymorphicRoots.map((r) => r.name));

  lines.push("# ---------------------------------------------------------------------------");
  lines.push("# Auto-generated by @picteus/feature-view-grammar emitter. Do not edit directly.");
  lines.push("# ---------------------------------------------------------------------------");
  lines.push("# ruff: noqa: A002, A003");
  lines.push("# pylint: disable=redefined-builtin,invalid-name");
  lines.push("");
  lines.push("from __future__ import annotations");
  lines.push("");
  lines.push("import json");
  lines.push("from dataclasses import dataclass, field");
  lines.push("from enum import Enum");
  lines.push("from typing import Any, Dict, List, Literal, Optional, Protocol, Union, runtime_checkable");
  lines.push("");

  // Base serialization class
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
  lines.push("        return json.dumps(self.to_dict(), indent=indent)");
  lines.push("");

  // 1. Generate Enums from AST
  for (const en of spec.enums)
  {
    lines.push(`class ${en.name}(str, Enum):`);
    if (en.doc)
    {
      lines.push(formatPythonDoc(en.doc, "    "));
    }
    for (const member of en.members)
    {
      lines.push(`    ${toSnakeCase(member.name)} = "${member.value}"`);
    }
    lines.push("");
  }

  // 2. Generate Protocols (Structural Interfaces via typing.Protocol PEP 544)
  lines.push("# --- Protocols (Structural Typing Contracts via PEP 544) ---");
  lines.push("");

  for (const root of spec.polymorphicRoots)
  {
    const rootModel = spec.models.find((model) => model.name === root.name);
    lines.push("@runtime_checkable");
    lines.push(`class ${root.name}Protocol(Protocol):`);
    lines.push(formatPythonDoc(root.doc ?? `Structural interface protocol for ${root.name}.`, "    "));
    lines.push("    @property");
    const rootDiscName = toSnakeCase(root.discriminatorProperty);
    if (PROTECTED_PYTHON_NAMES.has(rootDiscName))
    {
      lines.push(...getNoinspectionLines("    "));
    }
    lines.push(`    def ${rootDiscName}(self) -> str: ...${getFieldNoqa(rootDiscName)}`);
    if (rootModel)
    {
      for (const prop of rootModel.properties)
      {
        if (prop.name !== root.discriminatorProperty)
        {
          const pyName = toSnakeCase(prop.name);
          const pyType = resolvePythonType(prop.type);
          lines.push("    @property");
          if (PROTECTED_PYTHON_NAMES.has(pyName))
          {
            lines.push(...getNoinspectionLines("    "));
          }
          lines.push(`    def ${pyName}(self) -> ${pyType}: ...${getFieldNoqa(pyName)}`);
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
      for (const prop of derived.properties)
      {
        if (prop.name !== root.discriminatorProperty)
        {
          const pyName = toSnakeCase(prop.name);
          const baseType = resolvePythonType(prop.type);
          const pyType = prop.optional ? `Optional[${baseType}]` : baseType;
          lines.push("    @property");
          if (PROTECTED_PYTHON_NAMES.has(pyName))
          {
            lines.push(...getNoinspectionLines("    "));
          }
          lines.push(`    def ${pyName}(self) -> ${pyType}: ...${getFieldNoqa(pyName)}`);
        }
      }
      lines.push("");
    }
  }

  // 3. Generate Base Dataclasses for Polymorphic Roots
  for (const root of spec.polymorphicRoots)
  {
    lines.push("@dataclass");
    lines.push(`class ${root.name}Base(GrammarBase):`);
    lines.push(formatPythonDoc(`Base dataclass for all ${root.name} models.`, "    "));
    lines.push("    pass");
    lines.push("");
  }

  // 4. Generate Supporting Models (non-polymorphic derived, non-root) from AST
  const supportingModels = spec.models.filter(
    (m) => !polymorphicRootNames.has(m.name) && !m.baseModelName && m !== spec.rootModel && !m.isDslIgnored
  );

  for (const model of supportingModels)
  {
    lines.push("@dataclass");
    lines.push(`class ${model.name}(GrammarBase):`);
    if (model.doc)
    {
      lines.push(formatPythonDoc(model.doc, "    "));
    }

    const requiredProps = model.properties.filter((p) => !p.optional && p.defaultValue === undefined);
    const optionalProps = model.properties.filter((p) => p.optional || p.defaultValue !== undefined);

    if (requiredProps.length === 0 && optionalProps.length === 0)
    {
      lines.push("    pass");
    }

    for (const prop of requiredProps)
    {
      const pyName = toSnakeCase(prop.name);
      const pyType = resolvePythonType(prop.type);
      if (PROTECTED_PYTHON_NAMES.has(pyName))
      {
        lines.push(...getNoinspectionLines("    "));
      }
      lines.push(`    ${pyName}: ${pyType}${getFieldNoqa(pyName)}`);
    }

    for (const prop of optionalProps)
    {
      const pyName = toSnakeCase(prop.name);
      const baseType = resolvePythonType(prop.type);
      const pyType = prop.optional ? `Optional[${baseType}]` : baseType;

      if (PROTECTED_PYTHON_NAMES.has(pyName))
      {
        lines.push(...getNoinspectionLines("    "));
      }

      if (prop.defaultValue !== undefined)
      {
        let defaultValStr = String(prop.defaultValue);
        if (typeof prop.defaultValue === "string")
        {
          if (prop.type.kind === "enum")
          {
            defaultValStr = `${prop.type.name}.${toSnakeCase(prop.defaultValue)}`;
          }
          else
          {
            defaultValStr = `"${prop.defaultValue}"`;
          }
        }
        else if (typeof prop.defaultValue === "boolean")
        {
          defaultValStr = prop.defaultValue ? "True" : "False";
        }
        lines.push(`    ${pyName}: ${pyType} = ${defaultValStr}${getFieldNoqa(pyName)}`);
      }
      else
      {
        lines.push(`    ${pyName}: ${pyType} = None${getFieldNoqa(pyName)}`);
      }
    }
    lines.push("");
  }

  // 5. Generate Concrete Derived Dataclasses from polymorphic roots
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

      const otherProps = model.properties.filter((p) => p.name !== "type");
      const requiredProps = otherProps.filter((p) => !p.optional && p.defaultValue === undefined);
      const optionalProps = otherProps.filter((p) => p.optional || p.defaultValue !== undefined);

      for (const prop of requiredProps)
      {
        const pyName = toSnakeCase(prop.name);
        const pyType = resolvePythonType(prop.type);
        if (PROTECTED_PYTHON_NAMES.has(pyName))
        {
          lines.push(...getNoinspectionLines("    "));
        }
        lines.push(`    ${pyName}: ${pyType}${getFieldNoqa(pyName)}`);
      }

      const discVal = model.discriminatorValue ?? "element";
      lines.push(...getNoinspectionLines("    "));
      lines.push(`    type: str = "${discVal}"${getFieldNoqa("type")}`);

      for (const prop of optionalProps)
      {
        const pyName = toSnakeCase(prop.name);
        const baseType = resolvePythonType(prop.type);
        const pyType = prop.optional ? `Optional[${baseType}]` : baseType;

        if (PROTECTED_PYTHON_NAMES.has(pyName))
        {
          lines.push(...getNoinspectionLines("    "));
        }

        if (prop.defaultValue !== undefined)
        {
          let defaultValStr = String(prop.defaultValue);
          if (typeof prop.defaultValue === "string")
          {
            if (prop.type.kind === "enum")
            {
              defaultValStr = `${prop.type.name}.${toSnakeCase(prop.defaultValue)}`;
            }
            else
            {
              defaultValStr = `"${prop.defaultValue}"`;
            }
          }
          else if (typeof prop.defaultValue === "boolean")
          {
            defaultValStr = prop.defaultValue ? "True" : "False";
          }
          lines.push(`    ${pyName}: ${pyType} = ${defaultValStr}${getFieldNoqa(pyName)}`);
        }
        else
        {
          lines.push(`    ${pyName}: ${pyType} = None${getFieldNoqa(pyName)}`);
        }
      }
      lines.push("");
    }

    // Generate polymorphic union type
    const derivedUnion = root.derivedModels.map((m) => m.name).join(", ");
    lines.push(`${root.name} = Union[${derivedUnion}]`);
    lines.push("");
  }

  // 6. Generate Root Model (FeatureBlock)
  const root = spec.rootModel;
  if (root)
  {
    lines.push("@dataclass");
    lines.push(`class ${root.name}(GrammarBase):`);
    if (root.doc)
    {
      lines.push(formatPythonDoc(root.doc, "    "));
    }

    const rootNonTypeProps = root.properties.filter((p) => p.name !== "type");
    const rootReqProps = rootNonTypeProps.filter((p) => !p.optional && p.type.kind !== "array" && p.defaultValue === undefined);
    const rootOptProps = rootNonTypeProps.filter((p) => (p.optional || p.defaultValue !== undefined) && p.type.kind !== "array");
    const rootArrayProps = rootNonTypeProps.filter((p) => p.type.kind === "array");

    for (const prop of rootReqProps)
    {
      const pyName = toSnakeCase(prop.name);
      const baseType = resolvePythonType(prop.type);
      if (PROTECTED_PYTHON_NAMES.has(pyName))
      {
        lines.push(...getNoinspectionLines("    "));
      }
      lines.push(`    ${pyName}: ${baseType}${getFieldNoqa(pyName)}`);
    }

    for (const prop of rootOptProps)
    {
      const pyName = toSnakeCase(prop.name);
      const baseType = resolvePythonType(prop.type);
      if (PROTECTED_PYTHON_NAMES.has(pyName))
      {
        lines.push(...getNoinspectionLines("    "));
      }
      if (prop.defaultValue !== undefined)
      {
        lines.push(`    ${pyName}: ${baseType} = "${prop.defaultValue}"${getFieldNoqa(pyName)}`);
      }
      else
      {
        lines.push(`    ${pyName}: Optional[${baseType}] = None${getFieldNoqa(pyName)}`);
      }
    }

    for (const prop of rootArrayProps)
    {
      const pyName = toSnakeCase(prop.name);
      const baseType = resolvePythonType(prop.type);
      if (PROTECTED_PYTHON_NAMES.has(pyName))
      {
        lines.push(...getNoinspectionLines("    "));
      }
      if (!prop.optional)
      {
        lines.push(`    ${pyName}: ${baseType} = field(default_factory=list)${getFieldNoqa(pyName)}`);
      }
      else
      {
        lines.push(`    ${pyName}: Optional[${baseType}] = None${getFieldNoqa(pyName)}`);
      }
    }
    lines.push("");

    // 7. Generate Root Builder
    const builderClassName = `${root.name}Builder`;

    lines.push(`class ${builderClassName}:`);
    lines.push(formatPythonDoc(`Fluent builder for constructing ${root.name} instances.`, "    "));

    const ctorParams: string[] = [];
    const ctorParamNames: string[] = [];
    for (const p of rootReqProps)
    {
      const pyName = toSnakeCase(p.name);
      ctorParams.push(`${pyName}: ${resolvePythonType(p.type)}`);
      ctorParamNames.push(pyName);
    }
    const ctorNoqa = getFunctionNoqa(ctorParamNames);

    if (hasProtectedParam(ctorParamNames))
    {
      lines.push(...getNoinspectionLines("    "));
    }
    lines.push(`    def __init__(self, ${ctorParams.join(", ")}):${ctorNoqa}`);
    for (const p of rootReqProps)
    {
      const pyName = toSnakeCase(p.name);
      lines.push(`        self._${pyName}: ${resolvePythonType(p.type)} = ${pyName}`);
    }
    for (const p of rootOptProps)
    {
      const pyName = toSnakeCase(p.name);
      if (p.defaultValue !== undefined)
      {
        const defVal = typeof p.defaultValue === "string" ? `"${p.defaultValue}"` : (p.defaultValue ? "True" : "False");
        lines.push(`        self._${pyName}: ${resolvePythonType(p.type)} = ${defVal}`);
      }
      else
      {
        lines.push(`        self._${pyName}: Optional[${resolvePythonType(p.type)}] = None`);
      }
    }
    for (const p of rootArrayProps)
    {
      const pyName = toSnakeCase(p.name);
      const elemType = resolvePythonType(p.type.elementType ?? { kind: "unknown", name: "Any" });
      lines.push(`        self._${pyName}: List[${elemType}] = []`);
    }
    lines.push("");

    // Setters for optional properties
    for (const p of rootOptProps)
    {
      const pyName = toSnakeCase(p.name);
      const pyType = resolvePythonType(p.type);
      if (p.name === "attribution")
      {
        lines.push(...getNoinspectionLines("    "));
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
        const isProtectedSetter = PROTECTED_PYTHON_NAMES.has(pyName);
        if (isProtectedSetter)
        {
          lines.push(...getNoinspectionLines("    "));
        }
        const setterNoqa = getFunctionNoqa([ pyName ]);
        lines.push(`    def ${pyName}(self, ${pyName}: ${pyType}) -> ${builderClassName}:${setterNoqa}`);
        lines.push(`        self._${pyName} = ${pyName}`);
        lines.push("        return self");
        lines.push("");
      }
    }

    // Generic collection adders
    for (const p of rootArrayProps)
    {
      const pyName = toSnakeCase(p.name);
      const elemType = resolvePythonType(p.type.elementType ?? { kind: "unknown", name: "Any" });
      const singularName = p.name.endsWith("s") ? p.name.slice(0, -1) : p.name;
      const pySingular = toSnakeCase(singularName);

      if (p.name === "elements")
      {
        lines.push(`    def add(self, element: ${elemType}) -> ${builderClassName}:`);
        lines.push(`        self._${pyName}.append(element)`);
        lines.push("        return self");
        lines.push("");
      }

      lines.push(`    def add_${pyName}(self, *items: ${elemType}) -> ${builderClassName}:`);
      lines.push(`        self._${pyName}.extend(items)`);
      lines.push("        return self");
      lines.push("");

      if (p.name !== "elements")
      {
        lines.push(`    def add_${pySingular}(self, item: ${elemType}) -> ${builderClassName}:`);
        lines.push(`        self._${pyName}.append(item)`);
        lines.push("        return self");
        lines.push("");
      }
    }

    // Dynamic builder methods for all visual UI elements
    for (const uiModel of spec.uiElements)
    {
      if (uiModel.isDslIgnored)
      {
        continue;
      }
      const { primary, aliases } = getPythonFactoryNames(uiModel);
      const allNames = [ primary, ...aliases ];

      const nonType = uiModel.properties.filter((p) => p.name !== "type");
      const req = nonType.filter((p) => !p.optional && p.defaultValue === undefined);
      const opt = nonType.filter((p) => p.optional || p.defaultValue !== undefined);

      const params: string[] = [];
      const callArgs: string[] = [];
      const rawMethodParamNames: string[] = [];

      for (const p of req)
      {
        const pyName = toSnakeCase(p.name);
        const pyType = resolvePythonType(p.type);
        params.push(`${pyName}: ${pyType}`);
        callArgs.push(`${pyName}=${pyName}`);
        rawMethodParamNames.push(pyName);
      }

      for (const p of opt)
      {
        const pyName = toSnakeCase(p.name);
        const baseType = resolvePythonType(p.type);
        const pyType = p.optional ? `Optional[${baseType}]` : baseType;
        rawMethodParamNames.push(pyName);

        if (propHasDefault(p))
        {
          let defaultValStr = String(p.defaultValue);
          if (typeof p.defaultValue === "string")
          {
            defaultValStr = p.type.kind === "enum" ? `${p.type.name}.${toSnakeCase(p.defaultValue)}` : `"${p.defaultValue}"`;
          }
          else if (typeof p.defaultValue === "boolean")
          {
            defaultValStr = p.defaultValue ? "True" : "False";
          }
          params.push(`${pyName}: ${pyType} = ${defaultValStr}`);
        }
        else
        {
          params.push(`${pyName}: ${pyType} = None`);
        }
        callArgs.push(`${pyName}=${pyName}`);
      }

      const methodNoqa = getFunctionNoqa(rawMethodParamNames);
      const hasShadowing = hasProtectedParam(rawMethodParamNames);

      for (const fnName of allNames)
      {
        const methodName = `add_${fnName}`;
        if (hasShadowing)
        {
          lines.push(...getNoinspectionLines("    "));
        }
        lines.push(`    def ${methodName}(self, ${params.join(", ")}) -> ${builderClassName}:${methodNoqa}`);
        lines.push(`        return self.add(${fnName}(${callArgs.join(", ")}))`);
        lines.push("");
      }
    }

    lines.push(`    def build(self) -> ${root.name}:`);
    lines.push(`        return ${root.name}(`);
    for (const p of rootReqProps)
    {
      const pyName = toSnakeCase(p.name);
      lines.push(`            ${pyName}=self._${pyName},`);
    }
    for (const p of rootOptProps)
    {
      const pyName = toSnakeCase(p.name);
      lines.push(`            ${pyName}=self._${pyName},`);
    }
    for (const p of rootArrayProps)
    {
      const pyName = toSnakeCase(p.name);
      if (p.optional)
      {
        lines.push(`            ${pyName}=list(self._${pyName}) if len(self._${pyName}) > 0 else None,`);
      }
      else
      {
        lines.push(`            ${pyName}=list(self._${pyName}),`);
      }
    }
    const lastPyBuildIdx = lines.length - 1;
    lines[lastPyBuildIdx] = lines[lastPyBuildIdx].replace(/,$/, "");
    lines.push("        )");
    lines.push("");

    // 8. Generate Functional Root Factory
    const createFnName = `create_${toSnakeCase(root.name)}`;
    const rootCreateArgs: string[] = [];
    const rootCreateParamNames: string[] = [];

    for (const p of rootReqProps)
    {
      const pyName = toSnakeCase(p.name);
      rootCreateArgs.push(`${pyName}: ${resolvePythonType(p.type)}`);
      rootCreateParamNames.push(pyName);
    }
    for (const p of rootNonTypeProps.filter((p) => !rootReqProps.includes(p)))
    {
      const pyName = toSnakeCase(p.name);
      const baseType = resolvePythonType(p.type);
      rootCreateParamNames.push(pyName);
      if (p.defaultValue !== undefined)
      {
        const defVal = typeof p.defaultValue === "string" ? `"${p.defaultValue}"` : (p.defaultValue ? "True" : "False");
        rootCreateArgs.push(`${pyName}: ${baseType} = ${defVal}`);
      }
      else
      {
        rootCreateArgs.push(`${pyName}: Optional[${baseType}] = None`);
      }
    }

    const rootCreateNoqa = getFunctionNoqa(rootCreateParamNames);
    if (hasProtectedParam(rootCreateParamNames))
    {
      lines.push(...getNoinspectionLines());
    }
    lines.push(`def ${createFnName}(${rootCreateArgs.join(", ")}) -> ${root.name}:${rootCreateNoqa}`);
    lines.push(`    return ${root.name}(`);
    for (const p of rootReqProps)
    {
      const pyName = toSnakeCase(p.name);
      lines.push(`        ${pyName}=${pyName},`);
    }
    for (const p of rootNonTypeProps.filter((p) => !rootReqProps.includes(p)))
    {
      const pyName = toSnakeCase(p.name);
      if (p.type.kind === "array" && !p.optional)
      {
        lines.push(`        ${pyName}=list(${pyName}) if ${pyName} is not None else [],`);
      }
      else if (p.type.kind === "array" && p.optional)
      {
        lines.push(`        ${pyName}=list(${pyName}) if ${pyName} is not None else None,`);
      }
      else
      {
        lines.push(`        ${pyName}=${pyName},`);
      }
    }
    const lastRootCreateIdx = lines.length - 1;
    lines[lastRootCreateIdx] = lines[lastRootCreateIdx].replace(/,$/, "");
    lines.push("    )");
    lines.push("");
  }

  // 9. Generate Functional DSL Factory Helpers for all models from AST
  lines.push("# --- Functional DSL Factory Helpers ---");
  lines.push("");

  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model === spec.rootModel || model.isDslIgnored)
    {
      continue;
    }
    const factoryLines = generatePythonModelFactory(model);
    lines.push(...factoryLines);
  }

  return lines.join("\n");
}

function propHasDefault(prop: GrammarProperty): boolean
{
  return prop.defaultValue !== undefined;
}
