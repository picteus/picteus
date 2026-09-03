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
    rawLines.push(
      ...summaryLines.map(
        (line) =>
        {
          return line.trim();
        }
      )
    );
  }

  if (options.remarks)
  {
    if (rawLines.length > 0)
    {
      rawLines.push("");
    }
    rawLines.push("@remarks");
    const remarkLines = options.remarks.trim().split("\n");
    rawLines.push(
      ...remarkLines.map(
        (line) =>
        {
          return line.trim();
        }
      )
    );
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
    for (const parameter of options.params)
    {
      const description = parameter.description ? ` - ${parameter.description.trim()}` : "";
      rawLines.push(`@param ${parameter.name}${description}`);
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

  const formattedLines = rawLines.map(
    (line) =>
    {
      return line === "" ? `${indent} *` : `${indent} * ${line}`;
    }
  );
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

function capitalizeText(text: string): string
{
  return text.charAt(0).toUpperCase() + text.slice(1);
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

  const nonTypeProperties = model.properties.filter(
    (property) =>
    {
      return property.name !== "type";
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

  const parameters: string[] = [];
  const docParameters: TsDocParam[] = [];

  for (const property of requiredProperties)
  {
    parameters.push(`${property.name}: ${resolveTsType(property.type)}`);
    docParameters.push({ name: property.name, description: property.doc });
  }

  if (optionalProperties.length > 0)
  {
    const optionalFields = optionalProperties
      .map(
        (property) =>
        {
          return `${property.name}?: ${resolveTsType(property.type)}`;
        }
      )
      .join("; ");
    parameters.push(`options?: { ${optionalFields} }`);

    const optionalDescriptions = optionalProperties
      .map(
        (property) =>
        {
          const defaultValueSuffix = property.defaultValue !== undefined ? ` (defaults to \`${property.defaultValue}\`)` : "";
          return `${property.name}${defaultValueSuffix}`;
        }
      )
      .join(", ");
    docParameters.push(
      {
        name: "options",
        description: `Optional settings (${optionalDescriptions}).`
      }
    );
  }

  const allNames = Array.from(new Set([ primary, ...aliases ]));

  for (const functionName of allNames)
  {
    lines.push(
      formatTsDoc(
        {
          summary: `Creates a \`${model.name}\` component instance.`,
          remarks: model.doc,
          params: docParameters,
          returns: `A strongly-typed \`${model.name}\` object.`
        }
      )
    );
    lines.push(`export function ${functionName}(${parameters.join(", ")}): ${model.name}`);
    lines.push("{");
    lines.push("  return {");

    if (model.discriminatorValue)
    {
      lines.push(`    type: "${model.discriminatorValue}",`);
    }

    for (const property of requiredProperties)
    {
      if (property.type.kind === "array")
      {
        lines.push(`    ${property.name}: [ ...${property.name} ],`);
      }
      else
      {
        lines.push(`    ${property.name},`);
      }
    }

    for (const property of optionalProperties)
    {
      if (property.defaultValue !== undefined)
      {
        let defaultValueString: string;
        if (property.type.kind === "enum")
        {
          defaultValueString = `${property.type.name}.${property.defaultValue}`;
        }
        else if (property.type.kind === "string" || typeof property.defaultValue === "string")
        {
          defaultValueString = `"${property.defaultValue}"`;
        }
        else if (typeof property.defaultValue === "boolean")
        {
          defaultValueString = property.defaultValue ? "true" : "false";
        }
        else
        {
          defaultValueString = String(property.defaultValue);
        }
        lines.push(`    ${property.name}: options?.${property.name} ?? ${defaultValueString},`);
      }
      else
      {
        if (property.type.kind === "array")
        {
          lines.push(`    ${property.name}: options?.${property.name} ? [ ...options.${property.name} ] : undefined,`);
        }
        else
        {
          lines.push(`    ${property.name}: options?.${property.name},`);
        }
      }
    }

    const lastIndex = lines.length - 1;
    lines[lastIndex] = lines[lastIndex].replace(/,$/, "");

    lines.push("  };");
    lines.push("}");
    lines.push("");
  }

  return lines;
}

function generateModelClass(model: GrammarModel, polymorphicRootNames: ReadonlySet<string>): string[]
{
  const lines: string[] = [];
  const className = `${model.name}Class`;
  const baseClass = (model.baseModelName && polymorphicRootNames.has(model.baseModelName))
    ? `Base${model.baseModelName}<${model.name}>`
    : `GrammarNode<${model.name}>`;

  const nonTypeProperties = model.properties.filter(
    (property) =>
    {
      return property.name !== "type";
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

  lines.push(
    formatTsDoc(
      {
        summary: `Class implementation of the \`${model.name}\` interface.`,
        remarks: model.doc
      }
    )
  );
  lines.push(`export class ${className} extends ${baseClass} implements ${model.name}`);
  lines.push("{");

  if (model.discriminatorValue)
  {
    lines.push(
      formatTsDoc(
        {
          summary: "The discriminator type tag.",
          defaultValue: `"${model.discriminatorValue}"`,
          indent: "  "
        }
      )
    );
    lines.push(`  readonly type = "${model.discriminatorValue}" as const;`);
  }

  for (const property of requiredProperties)
  {
    lines.push(formatTsDoc({ summary: property.doc, indent: "  " }));
    lines.push(`  readonly ${property.name}: ${resolveTsType(property.type)};`);
  }

  for (const property of optionalProperties)
  {
    const defaultValueString = property.defaultValue !== undefined
      ? (property.type.kind === "enum" ? `${property.type.name}.${property.defaultValue}` : JSON.stringify(property.defaultValue))
      : undefined;
    lines.push(formatTsDoc({ summary: property.doc, defaultValue: defaultValueString, indent: "  " }));
    const optional = property.optional ? "?" : "";
    lines.push(`  readonly ${property.name}${optional}: ${resolveTsType(property.type)};`);
  }
  lines.push("");

  const constructorParameters: string[] = [];
  const constructorDocParameters: TsDocParam[] = [];

  for (const property of requiredProperties)
  {
    constructorParameters.push(`${property.name}: ${resolveTsType(property.type)}`);
    constructorDocParameters.push({ name: property.name, description: property.doc });
  }
  if (optionalProperties.length > 0)
  {
    const optionalFields = optionalProperties
      .map(
        (property) =>
        {
          return `${property.name}?: ${resolveTsType(property.type)}`;
        }
      )
      .join("; ");
    constructorParameters.push(`options?: { ${optionalFields} }`);
    constructorDocParameters.push({ name: "options", description: "Optional property overrides." });
  }

  lines.push(
    formatTsDoc(
      {
        summary: `Initializes a new \`${className}\` instance.`,
        params: constructorDocParameters,
        indent: "  "
      }
    )
  );
  lines.push(`  constructor(${constructorParameters.join(", ")})`);
  lines.push("  {");
  lines.push("    super();");

  for (const property of requiredProperties)
  {
    if (property.type.kind === "array")
    {
      lines.push(`    this.${property.name} = ${property.name} ? [ ...${property.name} ] : [];`);
    }
    else
    {
      lines.push(`    this.${property.name} = ${property.name};`);
    }
  }

  for (const property of optionalProperties)
  {
    if (property.defaultValue !== undefined)
    {
      let defaultValueString: string;
      if (property.type.kind === "enum")
      {
        defaultValueString = `${property.type.name}.${property.defaultValue}`;
      }
      else if (property.type.kind === "string" || typeof property.defaultValue === "string")
      {
        defaultValueString = `"${property.defaultValue}"`;
      }
      else if (typeof property.defaultValue === "boolean")
      {
        defaultValueString = property.defaultValue ? "true" : "false";
      }
      else
      {
        defaultValueString = String(property.defaultValue);
      }
      lines.push(`    this.${property.name} = options?.${property.name} ?? ${defaultValueString};`);
    }
    else
    {
      if (property.type.kind === "array")
      {
        lines.push(`    this.${property.name} = options?.${property.name} ? [ ...options.${property.name} ] : undefined;`);
      }
      else
      {
        lines.push(`    this.${property.name} = options?.${property.name};`);
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
  const polymorphicRootNames = new Set(
    spec.polymorphicRoots.map(
      (root) =>
      {
        return root.name;
      }
    )
  );

  lines.push("// ---------------------------------------------------------------------------");
  lines.push("// Auto-generated by @picteus/feature-view-grammar emitter. Do not edit directly.");
  lines.push("// ---------------------------------------------------------------------------");
  lines.push("");

  // We define the generic base serialization class
  lines.push(
    formatTsDoc(
      {
        summary: "Generic base class providing recursive JSON serialization for all model instances."
      }
    )
  );
  lines.push("export abstract class GrammarNode<T = unknown>");
  lines.push("{");
  lines.push(
    formatTsDoc(
      {
        summary: "Serializes this model instance into a strongly-typed, JSON-compatible plain object.",
        returns: "The plain object representation conforming to interface `T`.",
        indent: "  "
      }
    )
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
  lines.push("          result[key] = value.map(");
  lines.push("            (item) =>");
  lines.push("            {");
  lines.push("              return item && typeof item === \"object\" && typeof (item as { toJSON?: () => unknown }).toJSON === \"function\"");
  lines.push("                ? (item as { toJSON: () => unknown }).toJSON()");
  lines.push("                : item;");
  lines.push("            }");
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
  lines.push("");
  lines.push("  /**");
  lines.push("   * Returns the compact JSON string representation of this model instance with no indentation.");
  lines.push("   *");
  lines.push("   * @returns Compact JSON string without indentation.");
  lines.push("   */");
  lines.push("  toString(): string");
  lines.push("  {");
  lines.push("    return JSON.stringify(this.toJSON());");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  // 1. We generate Enums from AST
  for (const grammarEnum of spec.enums)
  {
    lines.push(formatTsDoc({ summary: grammarEnum.doc }));
    lines.push(`export enum ${grammarEnum.name}`);
    lines.push("{");
    for (const member of grammarEnum.members)
    {
      lines.push(formatTsDoc({ summary: member.doc, indent: "  " }));
      lines.push(`  ${member.name} = "${member.value}",`);
    }
    if (grammarEnum.members.length > 0)
    {
      const lastIndex = lines.length - 1;
      lines[lastIndex] = lines[lastIndex].replace(/,$/, "");
    }
    lines.push("}");
    lines.push("");
  }

  // 2. We generate Base Interfaces and Abstract Base Classes for Polymorphic Roots
  for (const root of spec.polymorphicRoots)
  {
    const rootModel = spec.models.find(
      (model) =>
      {
        return model.name === root.name;
      }
    );
    lines.push(
      formatTsDoc(
        {
          summary: root.doc ?? `Base structural contract for all \`${root.name}\` visual element models.`
        }
      )
    );
    lines.push(`export interface ${root.name}Base`);
    lines.push("{");
    lines.push(
      formatTsDoc(
        {
          summary: "The polymorphic discriminator type tag.",
          indent: "  "
        }
      )
    );
    lines.push(`  readonly ${root.discriminatorProperty}: string;`);
    if (rootModel)
    {
      for (const property of rootModel.properties)
      {
        if (property.name !== root.discriminatorProperty)
        {
          lines.push(formatTsDoc({ summary: property.doc, indent: "  " }));
          const optional = property.optional ? "?" : "";
          lines.push(`  readonly ${property.name}${optional}: ${resolveTsType(property.type)};`);
        }
      }
    }
    lines.push("}");
    lines.push("");

    lines.push(
      formatTsDoc(
        {
          summary: `Abstract base class for all \`${root.name}\` models.`
        }
      )
    );
    lines.push(`export abstract class Base${root.name}<T = ${root.name}> extends GrammarNode<T> implements ${root.name}Base`);
    lines.push("{");
    lines.push(`  abstract readonly ${root.discriminatorProperty}: string;`);
    if (rootModel)
    {
      for (const property of rootModel.properties)
      {
        if (property.name !== root.discriminatorProperty)
        {
          const optional = property.optional ? "?" : "";
          lines.push(`  abstract readonly ${property.name}${optional}: ${resolveTsType(property.type)};`);
        }
      }
    }
    lines.push("}");
    lines.push("");
  }

  // 3. We generate Interfaces for all concrete models with materialized inheritance
  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslIgnored)
    {
      continue;
    }
    const extendsClause = model.baseModelName
      ? (polymorphicRootNames.has(model.baseModelName) ? ` extends ${model.baseModelName}Base` : ` extends ${model.baseModelName}`)
      : "";
    lines.push(formatTsDoc({ summary: model.doc }));
    lines.push(`export interface ${model.name}${extendsClause}`);
    lines.push("{");
    for (const property of model.properties)
    {
      let defaultValueString: string | undefined;
      if (property.name === "type" && model.discriminatorValue)
      {
        defaultValueString = `"${model.discriminatorValue}"`;
      }
      else if (property.defaultValue !== undefined)
      {
        defaultValueString = property.type.kind === "enum"
          ? `${property.type.name}.${property.defaultValue}`
          : (typeof property.defaultValue === "string" ? `"${property.defaultValue}"` : String(property.defaultValue));
      }
      lines.push(formatTsDoc({ summary: property.doc, defaultValue: defaultValueString, indent: "  " }));
      const optional = property.optional ? "?" : "";
      const tsType = resolveTsType(property.type);
      lines.push(`  readonly ${property.name}${optional}: ${tsType};`);
    }
    lines.push("}");
    lines.push("");
  }

  // 4. We generate Discriminated Union Types dynamically from AST polymorphic roots
  for (const root of spec.polymorphicRoots)
  {
    const unionTypes = root.derivedModels
      .map(
        (derivedModel) =>
        {
          return derivedModel.name;
        }
      )
      .join(" | ");
    lines.push(
      formatTsDoc(
        {
          summary: root.doc ?? `Polymorphic discriminated union of all concrete \`${root.name}\` models.`
        }
      )
    );
    lines.push(`export type ${root.name} = ${unionTypes};`);
    lines.push("");
  }

  // 5. We generate Classes implementing the Interfaces
  lines.push("// --- Concrete Model Classes Implementing Interfaces ---");
  lines.push("");
  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslIgnored)
    {
      continue;
    }
    const classLines = generateModelClass(model, polymorphicRootNames);
    lines.push(...classLines);
  }

  // 6. We generate Model-Driven Fluent Builders for all @dslRoot models
  const rootModels = spec.rootModels.length > 0 ? spec.rootModels : (spec.rootModel ? [ spec.rootModel ] : []);
  for (const root of rootModels)
  {
    const builderClassName = `${root.name}Builder`;
    const rootNonTypeProperties = root.properties.filter(
      (property) =>
      {
        return property.name !== "type" && property.name !== "schemaVersion";
      }
    );
    const rootRequiredProperties = rootNonTypeProperties.filter(
      (property) =>
      {
        return !property.optional && property.type.kind !== "array" && property.defaultValue === undefined;
      }
    );
    const rootOptionalProperties = rootNonTypeProperties.filter(
      (property) =>
      {
        return (property.optional || property.defaultValue !== undefined) && property.type.kind !== "array";
      }
    );
    const rootArrayProperties = rootNonTypeProperties.filter(
      (property) =>
      {
        return property.type.kind === "array";
      }
    );

    lines.push(
      formatTsDoc(
        {
          summary: `Fluent builder for constructing strongly-typed \`${root.name}\` instances.`,
          remarks: root.doc
        }
      )
    );
    lines.push(`export class ${builderClassName}`);
    lines.push("{");

    for (const property of rootRequiredProperties)
    {
      lines.push(`  private readonly _${property.name}: ${resolveTsType(property.type)};`);
    }
    for (const property of rootOptionalProperties)
    {
      lines.push(`  private _${property.name}?: ${resolveTsType(property.type)};`);
    }
    for (const property of rootArrayProperties)
    {
      const elementType = resolveTsType(property.type.elementType ?? { kind: "unknown", name: "unknown" });
      lines.push(`  private readonly _${property.name}: ${elementType}[] = [];`);
    }
    if (rootRequiredProperties.length > 0 || rootOptionalProperties.length > 0 || rootArrayProperties.length > 0)
    {
      lines.push("");
    }

    const constructorArguments = rootRequiredProperties
      .map(
        (property) =>
        {
          return `${property.name}: ${resolveTsType(property.type)}`;
        }
      )
      .join(", ");
    const constructorDocParameters: TsDocParam[] = rootRequiredProperties.map(
      (property) =>
      {
        return { name: property.name, description: property.doc };
      }
    );

    lines.push(
      formatTsDoc(
        {
          summary: `Initializes a new \`${builderClassName}\`.`,
          params: constructorDocParameters,
          indent: "  "
        }
      )
    );
    lines.push(`  constructor(${constructorArguments})`);
    lines.push("  {");
    for (const property of rootRequiredProperties)
    {
      lines.push(`    this._${property.name} = ${property.name};`);
    }
    lines.push("  }");
    lines.push("");

    // We generate setters for scalar optional properties
    for (const property of rootOptionalProperties)
    {
      lines.push(
        formatTsDoc(
          {
            summary: `Sets the \`${property.name}\` property on this builder.`,
            params: [ { name: property.name, description: property.doc } ],
            returns: "This builder instance for method chaining.",
            indent: "  "
          }
        )
      );
      lines.push(`  ${property.name}(${property.name}: ${resolveTsType(property.type)}): this`);
      lines.push("  {");
      lines.push(`    this._${property.name} = ${property.name};`);
      lines.push("    return this;");
      lines.push("  }");
      lines.push("");
    }

    // We generate collection adders for array properties
    for (const property of rootArrayProperties)
    {
      const elementType = resolveTsType(property.type.elementType ?? { kind: "unknown", name: "unknown" });
      const singularName = property.name.endsWith("s") ? property.name.slice(0, -1) : property.name;
      const addMethodName = `add${capitalizeText(singularName)}`;
      const addAllMethodName = `add${capitalizeText(property.name)}`;

      if (property.name === "elements")
      {
        lines.push(
          formatTsDoc(
            {
              summary: "Appends a visual element.",
              params: [ { name: "element", description: "The visual UI element component to add." } ],
              returns: "This builder instance for method chaining.",
              indent: "  "
            }
          )
        );
        lines.push(`  add(element: ${elementType}): this`);
        lines.push("  {");
        lines.push(`    this._${property.name}.push(element);`);
        lines.push("    return this;");
        lines.push("  }");
        lines.push("");
      }

      lines.push(
        formatTsDoc(
          {
            summary: `Appends multiple ${property.name} items.`,
            params: [ { name: "items", description: `The \`${elementType}\` items to add.` } ],
            returns: "This builder instance for method chaining.",
            indent: "  "
          }
        )
      );
      lines.push(`  ${addAllMethodName}(...items: ${elementType}[]): this`);
      lines.push("  {");
      lines.push(`    this._${property.name}.push(...items);`);
      lines.push("    return this;");
      lines.push("  }");
      lines.push("");

      if (property.name !== "elements")
      {
        lines.push(
          formatTsDoc(
            {
              summary: `Appends a single ${singularName}.`,
              params: [ { name: "item", description: `The \`${elementType}\` item to add.` } ],
              returns: "This builder instance for method chaining.",
              indent: "  "
            }
          )
        );
        lines.push(`  ${addMethodName}(item: ${elementType}): this`);
        lines.push("  {");
        lines.push(`    this._${property.name}.push(item);`);
        lines.push("    return this;");
        lines.push("  }");
        lines.push("");
      }
    }

    // We generate shortcut methods for every model in spec.uiElements
    for (const uiModel of spec.uiElements)
    {
      if (uiModel.isDslIgnored)
      {
        continue;
      }
      const { primary, aliases } = getFactoryNames(uiModel);
      const allNames = Array.from(new Set([ primary, ...aliases ]));

      const nonTypeProperties = uiModel.properties.filter(
        (property) =>
        {
          return property.name !== "type";
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

      const parameters: string[] = [];
      const callArguments: string[] = [];
      const methodDocParameters: TsDocParam[] = [];

      for (const property of requiredProperties)
      {
        parameters.push(`${property.name}: ${resolveTsType(property.type)}`);
        callArguments.push(property.name);
        methodDocParameters.push({ name: property.name, description: property.doc });
      }

      if (optionalProperties.length > 0)
      {
        const optionalFields = optionalProperties
          .map(
            (property) =>
            {
              return `${property.name}?: ${resolveTsType(property.type)}`;
            }
          )
          .join("; ");
        parameters.push(`options?: { ${optionalFields} }`);
        callArguments.push("options");
        methodDocParameters.push({ name: "options", description: "Optional component settings." });
      }

      for (const functionName of allNames)
      {
        const methodName = `add${capitalizeText(functionName)}`;
        lines.push(
          formatTsDoc(
            {
              summary: `Appends a \`${uiModel.name}\` component.`,
              remarks: uiModel.doc,
              params: methodDocParameters,
              returns: "This builder instance for method chaining.",
              indent: "  "
            }
          )
        );
        lines.push(`  ${methodName}(${parameters.join(", ")}): this`);
        lines.push("  {");
        lines.push(`    return this.add(${functionName}(${callArguments.join(", ")}));`);
        lines.push("  }");
        lines.push("");
      }
    }

    const className = `${root.name}Class`;
    lines.push(
      formatTsDoc(
        {
          summary: `Finalizes and returns the complete strongly-typed \`${className}\` instance.`,
          returns: `The constructed \`${className}\` instance.`,
          indent: "  "
        }
      )
    );
    lines.push(`  build(): ${className}`);
    lines.push("  {");
    const buildArgs: string[] = [];
    for (const property of rootRequiredProperties)
    {
      buildArgs.push(`this._${property.name}`);
    }
    for (const property of rootArrayProperties.filter((property) => !property.optional))
    {
      buildArgs.push(`this._${property.name}`);
    }
    const buildOptEntries: string[] = [];
    for (const property of rootOptionalProperties)
    {
      buildOptEntries.push(`${property.name}: this._${property.name}`);
    }
    for (const property of rootArrayProperties.filter((property) => property.optional))
    {
      buildOptEntries.push(`${property.name}: this._${property.name}.length > 0 ? this._${property.name} : undefined`);
    }
    if (buildOptEntries.length > 0)
    {
      buildArgs.push(`{\n        ${buildOptEntries.join(",\n        ")}\n      }`);
    }
    lines.push(`    return new ${className}(`);
    lines.push(`      ${buildArgs.join(",\n      ")}`);
    lines.push("    );");
    lines.push("  }");
    lines.push("");
    lines.push(
      formatTsDoc(
        {
          summary: `Serializes this builder into a strongly-typed, JSON-compatible plain object conforming to interface \`${root.name}\`.`,
          returns: `The plain object representation conforming to interface \`${root.name}\`.`,
          indent: "  "
        }
      )
    );
    lines.push(`  toJSON(): ${root.name}`);
    lines.push("  {");
    lines.push("    return this.build().toJSON();");
    lines.push("  }");
    lines.push("");
    lines.push(
      formatTsDoc(
        {
          summary: `Returns the compact JSON string representation of the built \`${className}\` instance with no indentation.`,
          returns: "Compact JSON string without indentation.",
          indent: "  "
        }
      )
    );
    lines.push("  toString(): string");
    lines.push("  {");
    lines.push("    return this.build().toString();");
    lines.push("  }");
    lines.push("}");
    lines.push("");

    // 7. We generate Static Root Model Helpers
    lines.push(
      formatTsDoc(
        {
          summary: `Static helper factory object for \`${root.name}\`.`
        }
      )
    );
    lines.push(`export const ${root.name} =`);
    lines.push("{");
    lines.push(
      formatTsDoc(
        {
          summary: `Creates a new fluent builder for constructing a \`${root.name}\`.`,
          params: constructorDocParameters,
          returns: `A new \`${builderClassName}\` instance.`,
          indent: "  "
        }
      )
    );
    lines.push(`  builder(${constructorArguments}): ${builderClassName}`);
    lines.push("  {");
    const builderCallArguments = rootRequiredProperties
      .map(
        (property) =>
        {
          return property.name;
        }
      )
      .join(", ");
    lines.push(`    return new ${builderClassName}(${builderCallArguments});`);
    lines.push("  },");
    lines.push("");

    const createParameters = rootNonTypeProperties
      .map(
        (property) =>
        {
          return `${property.name}${property.optional ? "?" : ""}: ${resolveTsType(property.type)}`;
        }
      )
      .join("; ");
    lines.push(
      formatTsDoc(
        {
          summary: `Creates a \`${className}\` directly from a properties object.`,
          params: [ { name: "params", description: "Configuration properties." } ],
          returns: `A completed \`${className}\` instance.`,
          indent: "  "
        }
      )
    );
    lines.push(`  create(params: { ${createParameters} }): ${className}`);
    lines.push("  {");
    const createArgs: string[] = [];
    for (const property of rootRequiredProperties)
    {
      createArgs.push(`params.${property.name}`);
    }
    for (const property of rootArrayProperties.filter((property) => !property.optional))
    {
      createArgs.push(`params.${property.name}`);
    }
    const createOptEntries: string[] = [];
    for (const property of rootOptionalProperties)
    {
      createOptEntries.push(`${property.name}: params.${property.name}`);
    }
    for (const property of rootArrayProperties.filter((property) => property.optional))
    {
      createOptEntries.push(`${property.name}: params.${property.name}`);
    }
    if (createOptEntries.length > 0)
    {
      createArgs.push(`{\n        ${createOptEntries.join(",\n        ")}\n      }`);
    }
    lines.push(`    return new ${className}(`);
    lines.push(`      ${createArgs.join(",\n      ")}`);
    lines.push("    );");
    lines.push("  },");
    lines.push("");
    lines.push(
      formatTsDoc(
        {
          summary: `Parses a JSON string or raw object into a validated \`${className}\` instance.`,
          params: [ { name: "json", description: "JSON string or parsed JavaScript object to validate and hydrate." } ],
          returns: `A strongly-typed \`${className}\` instance.`,
          remarks: `Throws an \`Error\` if the input does not conform to the \`${root.name}\` schema.`,
          indent: "  "
        }
      )
    );
    lines.push(`  parse(json: string | unknown): ${className}`);
    lines.push("  {");
    lines.push("    const data: unknown = typeof json === \"string\" ? JSON.parse(json) : json;");
    lines.push(`    if (!is${root.name}(data))`);
    lines.push("    {");
    lines.push(`      throw new Error("Invalid JSON: value does not match the \`${root.name}\` schema.");`);
    lines.push("    }");
    lines.push(`    return ${root.name}.create(data);`);
    lines.push("  }");
    lines.push("};");
    lines.push("");

    // 8. We generate create<RootModel> and parse<RootModel> Functional Factories
    const createFunctionName = `create${root.name}`;
    const rootOptionalCreateFields = rootNonTypeProperties
      .filter(
        (property) =>
        {
          return !rootRequiredProperties.includes(property);
        }
      )
      .map(
        (property) =>
        {
          return `${property.name}?: ${resolveTsType(property.type)}`;
        }
      )
      .join("; ");
    lines.push(
      formatTsDoc(
        {
          summary: `Functional helper to create a \`${className}\` instance directly.`,
          remarks: root.doc,
          params: [
            ...constructorDocParameters,
            ...(rootOptionalCreateFields.length > 0 ? [ {
              name: "options",
              description: "Optional configuration (description, elements, actions)."
            } ] : [])
          ],
          returns: `A strongly-typed \`${className}\` instance.`
        }
      )
    );
    const optionsParameter = rootOptionalCreateFields.length > 0
      ? (rootRequiredProperties.length > 0 ? `, options?: { ${rootOptionalCreateFields} }` : `options?: { ${rootOptionalCreateFields} }`)
      : "";
    lines.push(`export function ${createFunctionName}(${constructorArguments}${optionsParameter}): ${className}`);
    lines.push("{");
    const helperArgs: string[] = [];
    for (const property of rootRequiredProperties)
    {
      helperArgs.push(property.name);
    }
    for (const property of rootArrayProperties.filter((property) => !property.optional))
    {
      helperArgs.push(`options?.${property.name} ?? []`);
    }
    const helperOptEntries: string[] = [];
    for (const property of rootOptionalProperties)
    {
      helperOptEntries.push(`${property.name}: options?.${property.name}`);
    }
    for (const property of rootArrayProperties.filter((property) => property.optional))
    {
      helperOptEntries.push(`${property.name}: options?.${property.name}`);
    }
    if (helperOptEntries.length > 0)
    {
      helperArgs.push(`{\n      ${helperOptEntries.join(",\n      ")}\n    }`);
    }
    lines.push(`  return new ${className}(`);
    lines.push(`    ${helperArgs.join(",\n    ")}`);
    lines.push("  );");
    lines.push("}");
    lines.push("");

    const parseFunctionName = `parse${root.name}`;
    lines.push(
      formatTsDoc(
        {
          summary: `Parses a JSON string or raw object into a validated \`${className}\` instance.`,
          remarks: root.doc,
          params: [ { name: "json", description: "JSON string or parsed JavaScript object to validate and hydrate." } ],
          returns: `A strongly-typed \`${className}\` instance.`
        }
      )
    );
    lines.push(`export function ${parseFunctionName}(json: string | unknown): ${className}`);
    lines.push("{");
    lines.push(`  return ${root.name}.parse(json);`);
    lines.push("}");
    lines.push("");
  }

  // 9. We generate Functional DSL Factories for all models from AST
  lines.push("// --- Functional DSL Factory Helpers ---");
  lines.push("");

  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslRoot || spec.rootModels.includes(model) || model.isDslIgnored)
    {
      continue;
    }
    const factoryLines = generateModelFactory(model);
    lines.push(...factoryLines);
  }

  // 10. We generate Type Guards dynamically from AST polymorphic roots
  lines.push("// --- Type Guards ---");
  lines.push("");

  for (const root of spec.polymorphicRoots)
  {
    lines.push(
      formatTsDoc(
        {
          summary: `Type guard predicate verifying whether an unknown value conforms to \`${root.name}\`.`,
          params: [ { name: "value", description: "The value to inspect." } ],
          returns: `\`true\` if the value is a valid \`${root.name}\`, otherwise \`false\`.`
        }
      )
    );
    lines.push(`export function is${root.name}(value: unknown): value is ${root.name}`);
    lines.push("{");
    lines.push(`  return typeof value === "object" && value !== null && "${root.discriminatorProperty}" in value && typeof (value as { ${root.discriminatorProperty}: unknown }).${root.discriminatorProperty} === "string";`);
    lines.push("}");
    lines.push("");

    for (const derivedModel of root.derivedModels)
    {
      if (derivedModel.discriminatorValue && !derivedModel.isDslIgnored)
      {
        const guardName = `is${derivedModel.name}`;
        lines.push(
          formatTsDoc(
            {
              summary: `Type guard predicate narrowing a \`${root.name}\` to \`${derivedModel.name}\`.`,
              params: [ { name: "element", description: `The \`${root.name}\` instance to inspect.` } ],
              returns: `\`true\` if the element is a \`${derivedModel.name}\` (type = "${derivedModel.discriminatorValue}"), otherwise \`false\`.`
            }
          )
        );
        lines.push(`export function ${guardName}(element: ${root.name}): element is ${derivedModel.name}`);
        lines.push("{");
        lines.push(`  return element.${root.discriminatorProperty} === "${derivedModel.discriminatorValue}";`);
        lines.push("}");
        lines.push("");
      }
    }
  }

  for (const root of rootModels)
  {
    lines.push(
      formatTsDoc(
        {
          summary: `Type guard predicate verifying whether an unknown value conforms to \`${root.name}\`.`,
          params: [ { name: "value", description: "The value to inspect." } ],
          returns: `\`true\` if the value is a valid \`${root.name}\`, otherwise \`false\`.`
        }
      )
    );
    lines.push(`export function is${root.name}(value: unknown): value is ${root.name}`);
    lines.push("{");
    const conditions: string[] = [
      `typeof value === "object"`,
      `value !== null`
    ];
    if (root.properties.some((property) => property.name === "schemaVersion"))
    {
      conditions.push(`"schemaVersion" in value`);
      conditions.push(`(value as { schemaVersion: unknown }).schemaVersion === "1.0"`);
    }
    for (const property of root.properties.filter((property) => !property.optional && property.defaultValue === undefined))
    {
      if (property.name === "type")
      {
        continue;
      }
      conditions.push(`"${property.name}" in value`);
      if (property.type.kind === "array")
      {
        conditions.push(`Array.isArray((value as { ${property.name}: unknown }).${property.name})`);
      }
      else if (property.type.kind === "string")
      {
        conditions.push(`typeof (value as { ${property.name}: unknown }).${property.name} === "string"`);
      }
    }
    lines.push(`  return ${conditions.join(" && ")};`);
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
}
