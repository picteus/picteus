import { GrammarModel, GrammarSpec, GrammarType } from "./typespecModel.js";


export interface TsDocParam
{
  name: string;
  description?: string;
}

export interface TsDocOptions
{
  summary?: string;
  remarks?: string;
  params?: TsDocParam[];
  returns?: string;
  defaultValue?: string;
  example?: string;
  indent?: string;
}

function formatTsDoc(options: TsDocOptions): string
{
  const indent = options.indent ?? "";
  const rawLines: string[] = [];

  if (options.summary)
  {
    const summaryLines = options.summary.trim().split("\n");
    rawLines.push(...summaryLines.map((l) => l.trim()));
  }

  if (options.remarks)
  {
    if (rawLines.length > 0)
    {
      rawLines.push("");
    }
    rawLines.push("@remarks");
    const remarkLines = options.remarks.trim().split("\n");
    rawLines.push(...remarkLines.map((l) => l.trim()));
  }

  if (options.defaultValue !== undefined)
  {
    if (rawLines.length > 0)
    {
      rawLines.push("");
    }
    rawLines.push(`@defaultValue ${options.defaultValue}`);
  }

  if (options.params && options.params.length > 0)
  {
    if (rawLines.length > 0)
    {
      rawLines.push("");
    }
    for (const p of options.params)
    {
      const desc = p.description ? ` - ${p.description.trim()}` : "";
      rawLines.push(`@param ${p.name}${desc}`);
    }
  }

  if (options.returns)
  {
    if (rawLines.length > 0 && (!options.params || options.params.length === 0))
    {
      rawLines.push("");
    }
    rawLines.push(`@returns ${options.returns}`);
  }

  if (options.example)
  {
    if (rawLines.length > 0)
    {
      rawLines.push("");
    }
    rawLines.push("@example", "```typescript", options.example.trim(), "```");
  }

  if (rawLines.length === 0)
  {
    return "";
  }

  if (rawLines.length === 1 && !rawLines[0].startsWith("@"))
  {
    return `${indent}/** ${rawLines[0]} */`;
  }

  const formattedLines = rawLines.map((l) => (l === "" ? `${indent} *` : `${indent} * ${l}`));
  return `${indent}/**\n${formattedLines.join("\n")}\n${indent} */`;
}

function resolveTsType(type: GrammarType): string
{
  switch (type.kind)
  {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "literal":
      return type.name;
    case "enum":
      return type.name;
    case "model":
      return type.name;
    case "array":
    {
      const element = resolveTsType(type.elementType ?? { kind: "unknown", name: "unknown" });
      return type.elementType?.kind === "union" ? `(${element})[]` : `${element}[]`;
    }
    case "record":
      return "Record<string, unknown>";
    case "union":
      return type.unionTypes?.map(resolveTsType).join(" | ") ?? type.name;
    default:
      return "unknown";
  }
}

function capitalize(string: string): string
{
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getFactoryNames(model: GrammarModel): { primary: string; aliases: string[] }
{
  let baseName = model.name;
  if (baseName.endsWith("Element"))
  {
    baseName = baseName.slice(0, -"Element".length);
  }
  const primary = baseName.charAt(0).toLowerCase() + baseName.slice(1);
  return { primary, aliases: model.aliases ?? [] };
}

function generateModelFactory(model: GrammarModel): string[]
{
  const lines: string[] = [];
  const { primary, aliases } = getFactoryNames(model);

  const nonTypeProperties = model.properties.filter((property) => property.name !== "type");
  const requiredProperties = nonTypeProperties.filter((property) => !property.optional && property.defaultValue === undefined);
  const optionalProperties = nonTypeProperties.filter((property) => property.optional || property.defaultValue !== undefined);

  const parameters: string[] = [];
  const docParams: TsDocParam[] = [];

  for (const property of requiredProperties)
  {
    parameters.push(`${property.name}: ${resolveTsType(property.type)}`);
    docParams.push({ name: property.name, description: property.doc });
  }

  if (optionalProperties.length > 0)
  {
    const optionalFields = optionalProperties
      .map((property) => `${property.name}?: ${resolveTsType(property.type)}`)
      .join("; ");
    parameters.push(`options?: { ${optionalFields} }`);

    const optionalDescriptions = optionalProperties
      .map((p) =>
      {
        const def = p.defaultValue !== undefined ? ` (defaults to \`${p.defaultValue}\`)` : "";
        return `${p.name}${def}`;
      })
      .join(", ");
    docParams.push({
      name: "options",
      description: `Optional settings (${optionalDescriptions}).`
    });
  }

  const allNames = [ primary, ...aliases ];

  for (const fnName of allNames)
  {
    lines.push(
      formatTsDoc({
        summary: `Creates a \`${model.name}\` component instance.`,
        remarks: model.doc,
        params: docParams,
        returns: `A strongly-typed \`${model.name}\` object.`
      })
    );
    lines.push(`export function ${fnName}(${parameters.join(", ")}): ${model.name}`);
    lines.push("{");
    lines.push("  return {");

    if (model.discriminatorValue)
    {
      lines.push(`    type: "${model.discriminatorValue}",`);
    }

    for (const prop of requiredProperties)
    {
      if (prop.type.kind === "array")
      {
        lines.push(`    ${prop.name}: [ ...${prop.name} ],`);
      }
      else
      {
        lines.push(`    ${prop.name},`);
      }
    }

    for (const prop of optionalProperties)
    {
      if (prop.defaultValue !== undefined)
      {
        let defaultVal: string;
        if (prop.type.kind === "enum")
        {
          defaultVal = `${prop.type.name}.${prop.defaultValue}`;
        }
        else if (prop.type.kind === "string" || typeof prop.defaultValue === "string")
        {
          defaultVal = `"${prop.defaultValue}"`;
        }
        else if (typeof prop.defaultValue === "boolean")
        {
          defaultVal = prop.defaultValue ? "true" : "false";
        }
        else
        {
          defaultVal = String(prop.defaultValue);
        }
        lines.push(`    ${prop.name}: options?.${prop.name} ?? ${defaultVal},`);
      }
      else
      {
        if (prop.type.kind === "array")
        {
          lines.push(`    ${prop.name}: options?.${prop.name} ? [ ...options.${prop.name} ] : undefined,`);
        }
        else
        {
          lines.push(`    ${prop.name}: options?.${prop.name},`);
        }
      }
    }

    const lastIdx = lines.length - 1;
    lines[lastIdx] = lines[lastIdx].replace(/,$/, "");

    lines.push("  };");
    lines.push("}");
    lines.push("");
  }

  return lines;
}

function generateModelClass(model: GrammarModel): string[]
{
  const lines: string[] = [];
  const className = `${model.name}Class`;
  const baseClass = model.baseModelName ? `Base${model.baseModelName}<${model.name}>` : `GrammarNode<${model.name}>`;

  const nonTypeProps = model.properties.filter((p) => p.name !== "type");
  const requiredProps = nonTypeProps.filter((p) => !p.optional && p.defaultValue === undefined);
  const optionalProps = nonTypeProps.filter((p) => p.optional || p.defaultValue !== undefined);

  lines.push(
    formatTsDoc({
      summary: `Class implementation of the \`${model.name}\` interface.`,
      remarks: model.doc
    })
  );
  lines.push(`export class ${className} extends ${baseClass} implements ${model.name}`);
  lines.push("{");

  if (model.discriminatorValue)
  {
    lines.push(
      formatTsDoc({
        summary: "The discriminator type tag.",
        defaultValue: `"${model.discriminatorValue}"`,
        indent: "  "
      })
    );
    lines.push(`  readonly type = "${model.discriminatorValue}" as const;`);
  }

  for (const prop of requiredProps)
  {
    lines.push(formatTsDoc({ summary: prop.doc, indent: "  " }));
    lines.push(`  readonly ${prop.name}: ${resolveTsType(prop.type)};`);
  }

  for (const prop of optionalProps)
  {
    const defVal = prop.defaultValue !== undefined
      ? (prop.type.kind === "enum" ? `${prop.type.name}.${prop.defaultValue}` : JSON.stringify(prop.defaultValue))
      : undefined;
    lines.push(formatTsDoc({ summary: prop.doc, defaultValue: defVal, indent: "  " }));
    lines.push(`  readonly ${prop.name}?: ${resolveTsType(prop.type)};`);
  }
  lines.push("");

  const ctorParams: string[] = [];
  const ctorDocParams: TsDocParam[] = [];

  for (const prop of requiredProps)
  {
    ctorParams.push(`${prop.name}: ${resolveTsType(prop.type)}`);
    ctorDocParams.push({ name: prop.name, description: prop.doc });
  }
  if (optionalProps.length > 0)
  {
    const optFields = optionalProps.map((p) => `${p.name}?: ${resolveTsType(p.type)}`).join("; ");
    ctorParams.push(`options?: { ${optFields} }`);
    ctorDocParams.push({ name: "options", description: "Optional property overrides." });
  }

  lines.push(
    formatTsDoc({
      summary: `Initializes a new \`${className}\` instance.`,
      params: ctorDocParams,
      indent: "  "
    })
  );
  lines.push(`  constructor(${ctorParams.join(", ")})`);
  lines.push("  {");
  lines.push("    super();");

  for (const prop of requiredProps)
  {
    if (prop.type.kind === "array")
    {
      lines.push(`    this.${prop.name} = [ ...${prop.name} ];`);
    }
    else
    {
      lines.push(`    this.${prop.name} = ${prop.name};`);
    }
  }

  for (const prop of optionalProps)
  {
    if (prop.defaultValue !== undefined)
    {
      let defaultVal: string;
      if (prop.type.kind === "enum")
      {
        defaultVal = `${prop.type.name}.${prop.defaultValue}`;
      }
      else if (prop.type.kind === "string" || typeof prop.defaultValue === "string")
      {
        defaultVal = `"${prop.defaultValue}"`;
      }
      else if (typeof prop.defaultValue === "boolean")
      {
        defaultVal = prop.defaultValue ? "true" : "false";
      }
      else
      {
        defaultVal = String(prop.defaultValue);
      }
      lines.push(`    this.${prop.name} = options?.${prop.name} ?? ${defaultVal};`);
    }
    else
    {
      if (prop.type.kind === "array")
      {
        lines.push(`    this.${prop.name} = options?.${prop.name} ? [ ...options.${prop.name} ] : undefined;`);
      }
      else
      {
        lines.push(`    this.${prop.name} = options?.${prop.name};`);
      }
    }
  }
  lines.push("  }");
  lines.push("}");
  lines.push("");

  return lines;
}

export function generateTypeScriptCode(spec: GrammarSpec): string
{
  const lines: string[] = [];
  const polymorphicRootNames = new Set(spec.polymorphicRoots.map((r) => r.name));

  lines.push("// ---------------------------------------------------------------------------");
  lines.push("// Auto-generated by @picteus/feature-view-grammar emitter. Do not edit directly.");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("");

  // Generic Base Serialization Class
  lines.push(
    formatTsDoc({
      summary: "Generic base class providing recursive JSON serialization for all model instances."
    })
  );
  lines.push("export abstract class GrammarNode<T = unknown>");
  lines.push("{");
  lines.push(
    formatTsDoc({
      summary: "Serializes this model instance into a strongly-typed, JSON-compatible plain object.",
      returns: "The plain object representation conforming to interface `T`.",
      indent: "  "
    })
  );
  lines.push("  toJSON(): T");
  lines.push("  {");
  lines.push("    const result: Record<string, unknown> = {};");
  lines.push("    for (const [key, value] of Object.entries(this))");
  lines.push("    {");
  lines.push("      if (value !== undefined)");
  lines.push("      {");
  lines.push("        if (Array.isArray(value))");
  lines.push("        {");
  lines.push("          result[key] = value.map((item) =>");
  lines.push("            item && typeof item === \"object\" && typeof (item as { toJSON?: () => unknown }).toJSON === \"function\"");
  lines.push("              ? (item as { toJSON: () => unknown }).toJSON()");
  lines.push("              : item");
  lines.push("          );");
  lines.push("        }");
  lines.push("        else if (value && typeof value === \"object\" && typeof (value as { toJSON?: () => unknown }).toJSON === \"function\")");
  lines.push("        {");
  lines.push("          result[key] = (value as { toJSON: () => unknown }).toJSON();");
  lines.push("        }");
  lines.push("        else");
  lines.push("        {");
  lines.push("          result[key] = value;");
  lines.push("        }");
  lines.push("      }");
  lines.push("    }");
  lines.push("    return result as T;");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  // 1. Generate Enums from AST
  for (const en of spec.enums)
  {
    lines.push(formatTsDoc({ summary: en.doc }));
    lines.push(`export enum ${en.name}`);
    lines.push("{");
    for (const member of en.members)
    {
      lines.push(formatTsDoc({ summary: member.doc, indent: "  " }));
      lines.push(`  ${member.name} = "${member.value}",`);
    }
    if (en.members.length > 0)
    {
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx].replace(/,$/, "");
    }
    lines.push("}");
    lines.push("");
  }

  // 2. Generate Base Interfaces and Abstract Base Classes for Polymorphic Roots
  for (const root of spec.polymorphicRoots)
  {
    const rootModel = spec.models.find((m) => m.name === root.name);
    lines.push(
      formatTsDoc({
        summary: root.doc ?? `Base structural contract for all \`${root.name}\` visual element models.`
      })
    );
    lines.push(`export interface ${root.name}Base`);
    lines.push("{");
    lines.push(
      formatTsDoc({
        summary: "The polymorphic discriminator type tag.",
        indent: "  "
      })
    );
    lines.push(`  readonly ${root.discriminatorProperty}: string;`);
    if (rootModel)
    {
      for (const prop of rootModel.properties)
      {
        if (prop.name !== root.discriminatorProperty)
        {
          lines.push(formatTsDoc({ summary: prop.doc, indent: "  " }));
          const optional = prop.optional ? "?" : "";
          lines.push(`  readonly ${prop.name}${optional}: ${resolveTsType(prop.type)};`);
        }
      }
    }
    lines.push("}");
    lines.push("");

    lines.push(
      formatTsDoc({
        summary: `Abstract base class for all \`${root.name}\` models.`
      })
    );
    lines.push(`export abstract class Base${root.name}<T = ${root.name}> extends GrammarNode<T> implements ${root.name}Base`);
    lines.push("{");
    lines.push(`  abstract readonly ${root.discriminatorProperty}: string;`);
    if (rootModel)
    {
      for (const prop of rootModel.properties)
      {
        if (prop.name !== root.discriminatorProperty)
        {
          const optional = prop.optional ? "?" : "";
          lines.push(`  abstract readonly ${prop.name}${optional}: ${resolveTsType(prop.type)};`);
        }
      }
    }
    lines.push("}");
    lines.push("");
  }

  // 3. Generate Interfaces for all concrete models with materialized inheritance
  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslIgnored)
    {
      continue;
    }
    const extendsClause = model.baseModelName ? ` extends ${model.baseModelName}Base` : "";
    lines.push(formatTsDoc({ summary: model.doc }));
    lines.push(`export interface ${model.name}${extendsClause}`);
    lines.push("{");
    for (const prop of model.properties)
    {
      let defaultValStr: string | undefined;
      if (prop.name === "type" && model.discriminatorValue)
      {
        defaultValStr = `"${model.discriminatorValue}"`;
      }
      else if (prop.defaultValue !== undefined)
      {
        defaultValStr = prop.type.kind === "enum"
          ? `${prop.type.name}.${prop.defaultValue}`
          : (typeof prop.defaultValue === "string" ? `"${prop.defaultValue}"` : String(prop.defaultValue));
      }
      lines.push(formatTsDoc({ summary: prop.doc, defaultValue: defaultValStr, indent: "  " }));
      const optional = prop.optional ? "?" : "";
      const tsType = resolveTsType(prop.type);
      lines.push(`  readonly ${prop.name}${optional}: ${tsType};`);
    }
    lines.push("}");
    lines.push("");
  }

  // 4. Generate Discriminated Union Types dynamically from AST polymorphic roots
  for (const root of spec.polymorphicRoots)
  {
    const unionTypes = root.derivedModels.map((m) => m.name).join(" | ");
    lines.push(
      formatTsDoc({
        summary: root.doc ?? `Polymorphic discriminated union of all concrete \`${root.name}\` models.`
      })
    );
    lines.push(`export type ${root.name} = ${unionTypes};`);
    lines.push("");
  }

  // 5. Generate Classes implementing the Interfaces
  lines.push("// --- Concrete Model Classes Implementing Interfaces ---");
  lines.push("");
  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.name === "FeatureBlock" || model.isDslIgnored)
    {
      continue;
    }
    const classLines = generateModelClass(model);
    lines.push(...classLines);
  }

  // 6. Generate Model-Driven Fluent Builder for @dslRoot (or fallback rootModel)
  const root = spec.rootModel;
  if (root)
  {
    const builderClassName = `${root.name}Builder`;
    const rootNonTypeProps = root.properties.filter((p) => p.name !== "type" && p.name !== "schemaVersion");
    const rootReqProps = rootNonTypeProps.filter((p) => !p.optional && p.type.kind !== "array" && p.defaultValue === undefined);
    const rootOptProps = rootNonTypeProps.filter((p) => (p.optional || p.defaultValue !== undefined) && p.type.kind !== "array");
    const rootArrayProps = rootNonTypeProps.filter((p) => p.type.kind === "array");

    lines.push(
      formatTsDoc({
        summary: `Fluent builder for constructing strongly-typed \`${root.name}\` card instances.`,
        remarks: root.doc
      })
    );
    lines.push(`export class ${builderClassName}`);
    lines.push("{");

    for (const p of rootReqProps)
    {
      lines.push(`  private readonly _${p.name}: ${resolveTsType(p.type)};`);
    }
    for (const p of rootOptProps)
    {
      lines.push(`  private _${p.name}?: ${resolveTsType(p.type)};`);
    }
    for (const p of rootArrayProps)
    {
      const elemType = resolveTsType(p.type.elementType ?? { kind: "unknown", name: "unknown" });
      lines.push(`  private readonly _${p.name}: ${elemType}[] = [];`);
    }
    lines.push("");

    const ctorArgs = rootReqProps.map((p) => `${p.name}: ${resolveTsType(p.type)}`).join(", ");
    const ctorDocParams: TsDocParam[] = rootReqProps.map((p) => ({ name: p.name, description: p.doc }));

    lines.push(
      formatTsDoc({
        summary: `Initializes a new \`${builderClassName}\` with mandatory card properties.`,
        params: ctorDocParams,
        indent: "  "
      })
    );
    lines.push(`  constructor(${ctorArgs})`);
    lines.push("  {");
    for (const p of rootReqProps)
    {
      lines.push(`    this._${p.name} = ${p.name};`);
    }
    lines.push("  }");
    lines.push("");

    // Setters for scalar optional properties
    for (const p of rootOptProps)
    {
      lines.push(
        formatTsDoc({
          summary: `Sets the \`${p.name}\` property on this card.`,
          params: [ { name: p.name, description: p.doc } ],
          returns: "This builder instance for method chaining.",
          indent: "  "
        })
      );
      lines.push(`  ${p.name}(${p.name}: ${resolveTsType(p.type)}): this`);
      lines.push("  {");
      lines.push(`    this._${p.name} = ${p.name};`);
      lines.push("    return this;");
      lines.push("  }");
      lines.push("");
    }

    // Generic collection adders for array properties
    for (const p of rootArrayProps)
    {
      const elemType = resolveTsType(p.type.elementType ?? { kind: "unknown", name: "unknown" });
      const singularName = p.name.endsWith("s") ? p.name.slice(0, -1) : p.name;
      const addMethodName = `add${capitalize(singularName)}`;
      const addAllMethodName = `add${capitalize(p.name)}`;

      if (p.name === "elements")
      {
        lines.push(
          formatTsDoc({
            summary: "Appends a visual element to the card.",
            params: [ { name: "element", description: "The visual UI element component to add." } ],
            returns: "This builder instance for method chaining.",
            indent: "  "
          })
        );
        lines.push(`  add(element: ${elemType}): this`);
        lines.push("  {");
        lines.push(`    this._${p.name}.push(element);`);
        lines.push("    return this;");
        lines.push("  }");
        lines.push("");
      }

      lines.push(
        formatTsDoc({
          summary: `Appends multiple ${p.name} items to the card.`,
          params: [ { name: "items", description: `The \`${elemType}\` items to add.` } ],
          returns: "This builder instance for method chaining.",
          indent: "  "
        })
      );
      lines.push(`  ${addAllMethodName}(...items: ${elemType}[]): this`);
      lines.push("  {");
      lines.push(`    this._${p.name}.push(...items);`);
      lines.push("    return this;");
      lines.push("  }");
      lines.push("");

      if (p.name !== "elements")
      {
        lines.push(
          formatTsDoc({
            summary: `Appends a single ${singularName} to the card.`,
            params: [ { name: "item", description: `The \`${elemType}\` item to add.` } ],
            returns: "This builder instance for method chaining.",
            indent: "  "
          })
        );
        lines.push(`  ${addMethodName}(item: ${elemType}): this`);
        lines.push("  {");
        lines.push(`    this._${p.name}.push(item);`);
        lines.push("    return this;");
        lines.push("  }");
        lines.push("");
      }
    }

    // Dynamically generated shortcut methods for every model in spec.uiElements
    for (const uiModel of spec.uiElements)
    {
      if (uiModel.isDslIgnored)
      {
        continue;
      }
      const { primary, aliases } = getFactoryNames(uiModel);
      const allNames = [ primary, ...aliases ];

      const nonType = uiModel.properties.filter((p) => p.name !== "type");
      const req = nonType.filter((p) => !p.optional && p.defaultValue === undefined);
      const opt = nonType.filter((p) => p.optional || p.defaultValue !== undefined);

      const params: string[] = [];
      const callArgs: string[] = [];
      const methodDocParams: TsDocParam[] = [];

      for (const p of req)
      {
        params.push(`${p.name}: ${resolveTsType(p.type)}`);
        callArgs.push(p.name);
        methodDocParams.push({ name: p.name, description: p.doc });
      }

      if (opt.length > 0)
      {
        const optFields = opt.map((p) => `${p.name}?: ${resolveTsType(p.type)}`).join("; ");
        params.push(`options?: { ${optFields} }`);
        callArgs.push("options");
        methodDocParams.push({ name: "options", description: "Optional component settings." });
      }

      for (const fnName of allNames)
      {
        const methodName = `add${capitalize(fnName)}`;
        lines.push(
          formatTsDoc({
            summary: `Appends a \`${uiModel.name}\` component to this feature card.`,
            remarks: uiModel.doc,
            params: methodDocParams,
            returns: "This builder instance for method chaining.",
            indent: "  "
          })
        );
        lines.push(`  ${methodName}(${params.join(", ")}): this`);
        lines.push("  {");
        lines.push(`    return this.add(${fnName}(${callArgs.join(", ")}));`);
        lines.push("  }");
        lines.push("");
      }
    }

    lines.push(
      formatTsDoc({
        summary: `Finalizes and returns the complete strongly-typed \`${root.name}\` card object.`,
        returns: `The constructed \`${root.name}\` object.`,
        indent: "  "
      })
    );
    lines.push(`  build(): ${root.name}`);
    lines.push("  {");
    lines.push("    return {");
    lines.push("      schemaVersion: \"1.0\",");
    for (const p of rootReqProps)
    {
      lines.push(`      ${p.name}: this._${p.name},`);
    }
    for (const p of rootOptProps)
    {
      lines.push(`      ${p.name}: this._${p.name},`);
    }
    for (const p of rootArrayProps)
    {
      if (p.optional)
      {
        lines.push(`      ${p.name}: this._${p.name}.length > 0 ? [ ...this._${p.name} ] : undefined,`);
      }
      else
      {
        lines.push(`      ${p.name}: [ ...this._${p.name} ],`);
      }
    }
    const lastBuildIdx = lines.length - 1;
    lines[lastBuildIdx] = lines[lastBuildIdx].replace(/,$/, "");
    lines.push("    };");
    lines.push("  }");
    lines.push("}");
    lines.push("");

    // 7. Generate Static Root Model Helper
    lines.push(
      formatTsDoc({
        summary: `Static helper factory object for \`${root.name}\`.`
      })
    );
    lines.push(`export const ${root.name} =`);
    lines.push("{");
    lines.push(
      formatTsDoc({
        summary: `Creates a new fluent builder for constructing a \`${root.name}\`.`,
        params: ctorDocParams,
        returns: `A new \`${builderClassName}\` instance.`,
        indent: "  "
      })
    );
    lines.push(`  builder(${ctorArgs}): ${builderClassName}`);
    lines.push("  {");
    lines.push(`    return new ${builderClassName}(${rootReqProps.map((p) => p.name).join(", ")});`);
    lines.push("  },");
    lines.push("");

    const createParams = rootNonTypeProps.map((p) => `${p.name}${p.optional ? "?" : ""}: ${resolveTsType(p.type)}`).join("; ");
    lines.push(
      formatTsDoc({
        summary: `Creates a \`${root.name}\` directly from a properties object.`,
        params: [ { name: "params", description: "Card configuration properties." } ],
        returns: `A completed \`${root.name}\` object.`,
        indent: "  "
      })
    );
    lines.push(`  create(params: { ${createParams} }): ${root.name}`);
    lines.push("  {");
    lines.push("    return {");
    lines.push("      schemaVersion: \"1.0\",");
    for (const p of rootNonTypeProps)
    {
      if (p.type.kind === "array" && p.optional)
      {
        lines.push(`      ${p.name}: params.${p.name} ? [ ...params.${p.name} ] : undefined,`);
      }
      else if (p.type.kind === "array")
      {
        lines.push(`      ${p.name}: [ ...params.${p.name} ],`);
      }
      else
      {
        lines.push(`      ${p.name}: params.${p.name},`);
      }
    }
    const lastCreateIdx = lines.length - 1;
    lines[lastCreateIdx] = lines[lastCreateIdx].replace(/,$/, "");
    lines.push("    };");
    lines.push("  }");
    lines.push("};");
    lines.push("");

    // 8. Generate create<RootModel> Functional Factory
    const createFnName = `create${root.name}`;
    const rootOptCreateFields = rootNonTypeProps
      .filter((p) => !rootReqProps.includes(p))
      .map((p) => `${p.name}?: ${resolveTsType(p.type)}`)
      .join("; ");
    lines.push(
      formatTsDoc({
        summary: `Functional helper to create a \`${root.name}\` instance directly.`,
        remarks: root.doc,
        params: [
          ...ctorDocParams,
          { name: "options", description: "Optional card configuration (description, attribution, elements, actions)." }
        ],
        returns: `A strongly-typed \`${root.name}\` card.`
      })
    );
    lines.push(`export function ${createFnName}(${ctorArgs}, options?: { ${rootOptCreateFields} }): ${root.name}`);
    lines.push("{");
    lines.push("  return {");
    lines.push("    schemaVersion: \"1.0\",");
    for (const p of rootReqProps)
    {
      lines.push(`    ${p.name},`);
    }
    for (const p of rootNonTypeProps.filter((p) => !rootReqProps.includes(p)))
    {
      if (p.type.kind === "array" && !p.optional)
      {
        lines.push(`    ${p.name}: options?.${p.name} ? [ ...options.${p.name} ] : [],`);
      }
      else if (p.type.kind === "array" && p.optional)
      {
        lines.push(`    ${p.name}: options?.${p.name} ? [ ...options.${p.name} ] : undefined,`);
      }
      else
      {
        lines.push(`    ${p.name}: options?.${p.name},`);
      }
    }
    const lastFnIdx = lines.length - 1;
    lines[lastFnIdx] = lines[lastFnIdx].replace(/,$/, "");
    lines.push("  };");
    lines.push("}");
    lines.push("");
  }

  // 9. Generate Functional DSL Factories for all models from AST
  lines.push("// --- Functional DSL Factory Helpers ---");
  lines.push("");

  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model === spec.rootModel || model.isDslIgnored)
    {
      continue;
    }
    const factoryLines = generateModelFactory(model);
    lines.push(...factoryLines);
  }

  // 10. Generate Type Guards dynamically from AST polymorphic roots
  lines.push("// --- Type Guards ---");
  lines.push("");

  for (const root of spec.polymorphicRoots)
  {
    lines.push(
      formatTsDoc({
        summary: `Type guard predicate verifying whether an unknown value conforms to \`${root.name}\`.`,
        params: [ { name: "value", description: "The value to inspect." } ],
        returns: `\`true\` if the value is a valid \`${root.name}\`, otherwise \`false\`.`
      })
    );
    lines.push(`export function is${root.name}(value: unknown): value is ${root.name}`);
    lines.push("{");
    lines.push(`  return typeof value === "object" && value !== null && "${root.discriminatorProperty}" in value && typeof (value as { ${root.discriminatorProperty}: unknown }).${root.discriminatorProperty} === "string";`);
    lines.push("}");
    lines.push("");

    for (const derived of root.derivedModels)
    {
      if (derived.discriminatorValue && !derived.isDslIgnored)
      {
        const guardName = `is${derived.name}`;
        lines.push(
          formatTsDoc({
            summary: `Type guard predicate narrowing a \`${root.name}\` to \`${derived.name}\`.`,
            params: [ { name: "element", description: `The \`${root.name}\` instance to inspect.` } ],
            returns: `\`true\` if the element is a \`${derived.name}\` (type = "${derived.discriminatorValue}"), otherwise \`false\`.`
          })
        );
        lines.push(`export function ${guardName}(element: ${root.name}): element is ${derived.name}`);
        lines.push("{");
        lines.push(`  return element.${root.discriminatorProperty} === "${derived.discriminatorValue}";`);
        lines.push("}");
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}
