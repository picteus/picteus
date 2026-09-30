import { CodeWriter, TsDocParam } from "../codeWriter.js";
import {
  capitalizeText,
  computeBaseModelProperties,
  computeFactoryNames,
  DISCRIMINATOR_PROPERTY,
  ELEMENTS_PROPERTY,
  partitionProperties,
  SCHEMA_VERSION_PROPERTY,
  SCHEMA_VERSION_VALUE
} from "./codegenModel.js";
import { GrammarSpec, ViewKitModel, ViewKitProperty, ViewKitType } from "./typespecModel.js";
import { createGeneratedFileHeader } from "../common.js";


const RECORD_TYPE = "Record<string, unknown>";
const BUILDER_RETURN_DESCRIPTION = "This builder instance for method chaining.";
const COMPACT_JSON_RETURN_DESCRIPTION = "Compact JSON string without indentation.";

const CONCRETE_CLASSES_SECTION_HEADER = "// --- Concrete Model Classes Implementing Interfaces ---";
const FUNCTIONAL_FACTORIES_SECTION_HEADER = "// --- Functional DSL Factory Helpers ---";
const TYPE_GUARDS_SECTION_HEADER = "// --- Type Guards ---";

function formatTsDefaultValue(property: ViewKitProperty): string | undefined
{
  if (property.defaultValue === undefined)
  {
    return undefined;
  }
  if (property.type.kind === "enum")
  {
    return `${property.type.name}.${property.defaultValue}`;
  }
  if (property.type.kind === "string" || typeof property.defaultValue === "string")
  {
    return `"${property.defaultValue}"`;
  }
  if (typeof property.defaultValue === "boolean")
  {
    return property.defaultValue ? "true" : "false";
  }
  return String(property.defaultValue);
}

function resolveTsType(type: ViewKitType): string
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
      return RECORD_TYPE;
    case "union":
      return type.unionTypes?.map(resolveTsType).join(" | ") ?? type.name;
    default:
      return "unknown";
  }
}

function formatOptionsParameter(
  optionalProperties: ViewKitProperty[],
  docDescription = "Optional component settings."
): { parameter: string; docParam?: TsDocParam }
{
  if (optionalProperties.length === 0)
  {
    return { parameter: "" };
  }
  const optionalFields = optionalProperties
    .map(
      (property) =>
      {
        return `${property.name}?: ${resolveTsType(property.type)}`;
      }
    )
    .join("; ");

  const optionalDescriptions = optionalProperties
    .map(
      (property) =>
      {
        const defaultValueSuffix = property.defaultValue !== undefined ? ` (defaults to \`${property.defaultValue}\`)` : "";
        return `${property.name}${defaultValueSuffix}`;
      }
    )
    .join(", ");

  return {
    parameter: `options?: { ${optionalFields} }`,
    docParam: {
      name: "options",
      description: docDescription.includes("(") ? docDescription : `${docDescription} (${optionalDescriptions}).`
    }
  };
}

function formatClassInvocationArgs(
  requiredProperties: ViewKitProperty[],
  arrayProperties: ViewKitProperty[],
  optionalProperties: ViewKitProperty[],
  mode: "builder" | "params" | "helper"
): string[]
{
  const invocationArgs: string[] = [];
  const requiredArrays = arrayProperties.filter((property) => !property.optional);
  const optionalArrays = arrayProperties.filter((property) => property.optional);

  for (const property of requiredProperties)
  {
    if (mode === "builder")
    {
      invocationArgs.push(`this._${property.name}`);
    }
    else if (mode === "params")
    {
      invocationArgs.push(`params.${property.name}`);
    }
    else
    {
      invocationArgs.push(property.name);
    }
  }

  for (const property of requiredArrays)
  {
    if (mode === "builder")
    {
      invocationArgs.push(`this._${property.name}`);
    }
    else if (mode === "params")
    {
      invocationArgs.push(`params.${property.name}`);
    }
    else
    {
      invocationArgs.push(`options?.${property.name} ?? []`);
    }
  }

  const optEntries: string[] = [];
  for (const property of optionalProperties)
  {
    if (mode === "builder")
    {
      optEntries.push(`${property.name}: this._${property.name}`);
    }
    else if (mode === "params")
    {
      optEntries.push(`${property.name}: params.${property.name}`);
    }
    else
    {
      optEntries.push(`${property.name}: options?.${property.name}`);
    }
  }

  for (const property of optionalArrays)
  {
    if (mode === "builder")
    {
      optEntries.push(`${property.name}: this._${property.name}.length > 0 ? this._${property.name} : undefined`);
    }
    else if (mode === "params")
    {
      optEntries.push(`${property.name}: params.${property.name}`);
    }
    else
    {
      optEntries.push(`${property.name}: options?.${property.name}`);
    }
  }

  if (optEntries.length > 0)
  {
    const indent = mode === "helper" ? "      " : "        ";
    invocationArgs.push(`{\n${indent}${optEntries.join(`,\n${indent}`)}\n${mode === "helper" ? "    " : "      "}}`);
  }

  return invocationArgs;
}

function generateModelPropertyChecks(
  properties: ViewKitProperty[],
  spec: GrammarSpec,
  targetVariable: string = "element"
): string[]
{
  const propertyChecks: string[] = [];
  for (const property of properties)
  {
    if (property.name === DISCRIMINATOR_PROPERTY || property.name === SCHEMA_VERSION_PROPERTY)
    {
      continue;
    }
    const check = generateDeepTypeCheck(`${targetVariable}.${property.name}`, property.type, spec);
    if (property.optional || property.defaultValue !== undefined)
    {
      propertyChecks.push(`(${targetVariable}.${property.name} === undefined || ${check})`);
    }
    else
    {
      propertyChecks.push(`("${property.name}" in value && ${check})`);
    }
  }
  return propertyChecks;
}

function generateModelFactory(model: ViewKitModel, writer: CodeWriter): void
{
  const { primary, aliases } = computeFactoryNames(model);
  const { requiredProperties, optionalProperties } = partitionProperties(model.properties);

  const parameters: string[] = [];
  const docParameters: TsDocParam[] = [];

  for (const property of requiredProperties)
  {
    parameters.push(`${property.name}: ${resolveTsType(property.type)}`);
    docParameters.push({ name: property.name, description: property.doc });
  }

  const {
    parameter: optionsParam,
    docParam: optionsDocParam
  } = formatOptionsParameter(optionalProperties, "Optional settings");
  if (optionsParam)
  {
    parameters.push(optionsParam);
    if (optionsDocParam)
    {
      docParameters.push(optionsDocParam);
    }
  }

  const allNames = Array.from(new Set([ primary, ...aliases ]));

  for (const functionName of allNames)
  {
    writer.writeTsDoc(
      {
        summary: `Creates a \`${model.name}\` component instance.`,
        remarks: model.doc,
        params: docParameters,
        returns: `A strongly-typed \`${model.name}\` object.`
      }
    );
    writer.allmanBlock(`export function ${functionName}(${parameters.join(", ")}): ${model.name}`, () =>
    {
      writer.writeLine("return {");
      writer.indent(() =>
      {
        const entries: string[] = [];
        if (model.discriminatorValue)
        {
          entries.push(`${DISCRIMINATOR_PROPERTY}: "${model.discriminatorValue}"`);
        }

        for (const property of requiredProperties)
        {
          if (property.type.kind === "array")
          {
            entries.push(`${property.name}: [ ...${property.name} ]`);
          }
          else
          {
            entries.push(property.name);
          }
        }

        for (const property of optionalProperties)
        {
          const defaultValue = formatTsDefaultValue(property);
          if (defaultValue !== undefined)
          {
            entries.push(`${property.name}: options?.${property.name} ?? ${defaultValue}`);
          }
          else if (property.type.kind === "array")
          {
            entries.push(`${property.name}: options?.${property.name} ? [ ...options.${property.name} ] : undefined`);
          }
          else
          {
            entries.push(`${property.name}: options?.${property.name}`);
          }
        }

        for (let index = 0; index < entries.length; index++)
        {
          writer.writeLine(index < entries.length - 1 ? `${entries[index]},` : entries[index]);
        }
      });
      writer.writeLine("};");
    });
    writer.blankLine();
  }
}

function generateModelClass(
  model: ViewKitModel,
  polymorphicRootNames: ReadonlySet<string>,
  writer: CodeWriter
): void
{
  const className = `${model.name}Class`;
  const baseClass = (model.baseModelName && polymorphicRootNames.has(model.baseModelName))
    ? `Base${model.baseModelName}<${model.name}>`
    : `ViewKitNode<${model.name}>`;

  const { requiredProperties, optionalProperties } = partitionProperties(model.properties);

  writer.writeTsDoc(
    {
      summary: `Class implementation of the \`${model.name}\` interface.`,
      remarks: model.doc
    }
  );
  writer.classBlock(`export class ${className} extends ${baseClass} implements ${model.name}`, () =>
  {
    if (model.discriminatorValue)
    {
      writer.writeTsDoc(
        {
          summary: `Discriminator identifier for \`${model.name}\`.`,
          defaultValue: `"${model.discriminatorValue}"`
        }
      );
      writer.writeLine(`readonly ${DISCRIMINATOR_PROPERTY} = "${model.discriminatorValue}";`);
    }

    for (const property of requiredProperties)
    {
      writer.writeTsDoc({ summary: property.doc });
      writer.writeLine(`readonly ${property.name}: ${resolveTsType(property.type)};`);
    }

    for (const property of optionalProperties)
    {
      writer.writeTsDoc(
        {
          summary: property.doc,
          defaultValue: formatTsDefaultValue(property)
        }
      );
      const optionalMarker = property.optional ? "?" : "";
      writer.writeLine(`readonly ${property.name}${optionalMarker}: ${resolveTsType(property.type)};`);
    }
    writer.blankLine();

    const constructorParams: string[] = [];
    const constructorDocParams: TsDocParam[] = [];

    for (const property of requiredProperties)
    {
      constructorParams.push(`${property.name}: ${resolveTsType(property.type)}`);
      constructorDocParams.push({ name: property.name, description: property.doc });
    }

    const {
      parameter: optionsParam,
      docParam: optionsDocParam
    } = formatOptionsParameter(optionalProperties);
    if (optionsParam)
    {
      constructorParams.push(optionsParam);
      if (optionsDocParam)
      {
        constructorDocParams.push(optionsDocParam);
      }
    }

    writer.writeTsDoc(
      {
        summary: `Constructs a new \`${className}\` instance.`,
        params: constructorDocParams
      }
    );
    writer.allmanBlock(`constructor(${constructorParams.join(", ")})`, () =>
    {
      writer.writeLine("super();");

      for (const property of requiredProperties)
      {
        if (property.type.kind === "array")
        {
          writer.writeLine(`this.${property.name} = ${property.name} ? [ ...${property.name} ] : [];`);
        }
        else
        {
          writer.writeLine(`this.${property.name} = ${property.name};`);
        }
      }

      for (const property of optionalProperties)
      {
        const defaultValue = formatTsDefaultValue(property);
        if (defaultValue !== undefined)
        {
          writer.writeLine(`this.${property.name} = options?.${property.name} ?? ${defaultValue};`);
        }
        else if (property.type.kind === "array")
        {
          writer.writeLine(`this.${property.name} = options?.${property.name} ? [ ...options.${property.name} ] : undefined;`);
        }
        else
        {
          writer.writeLine(`this.${property.name} = options?.${property.name};`);
        }
      }
    });
  });
  writer.blankLine();
}

function shouldEmitInterfaceProperty(
  property: ViewKitProperty,
  model: ViewKitModel,
  baseProperties: ReadonlyMap<string, ViewKitProperty>
): boolean
{
  const baseProperty = baseProperties.get(property.name);
  if (!baseProperty)
  {
    return true;
  }

  // We always emit the discriminator property if it is narrowed with a concrete literal value
  if (property.name === DISCRIMINATOR_PROPERTY && model.discriminatorValue)
  {
    return true;
  }

  const propertyTsType = resolveTsType(property.type);
  const baseTsType = resolveTsType(baseProperty.type);

  // If the property is narrowed or changed from the base definition, we re-declare it
  return propertyTsType !== baseTsType || property.optional !== baseProperty.optional;

}

export function generateTypeScriptCode(spec: GrammarSpec): string
{
  const writer = new CodeWriter({ indentSize: 2 });
  const polymorphicRootNames = new Set(
    spec.polymorphicRoots.map(
      (root) =>
      {
        return root.name;
      }
    )
  );

  writer.writeLines(createGeneratedFileHeader("//"));
  writer.blankLine();

  // We define the generic base serialization class
  writer.writeTsDoc(
    {
      summary: "Generic base class providing recursive JSON serialization for all model instances."
    }
  );
  writer.classBlock("export abstract class ViewKitNode<T = unknown>", () =>
  {
    writer.writeTsDoc(
      {
        summary: "Serializes this model instance into a strongly-typed, JSON-compatible plain object.",
        returns: "The plain object representation conforming to interface `T`."
      }
    );
    writer.allmanBlock("toJSON(): T", () =>
    {
      writer.writeLine("const result: Record<string, unknown> = {};");
      writer.allmanBlock("for (const [key, value] of Object.entries(this))", () =>
      {
        writer.allmanBlock("if (value !== undefined)", () =>
        {
          writer.allmanBlock("if (Array.isArray(value))", () =>
          {
            writer.writeLine("result[key] = value.map(");
            writer.indent(() =>
            {
              writer.allmanBlock("(item) =>", () =>
              {
                writer.writeLine("return item && typeof item === \"object\" && typeof (item as { toJSON?: () => unknown }).toJSON === \"function\"");
                writer.writeLine("  ? (item as { toJSON: () => unknown }).toJSON()");
                writer.writeLine("  : item;");
              });
            });
            writer.writeLine(");");
          });
          writer.allmanBlock("else if (value && typeof value === \"object\" && typeof (value as { toJSON?: () => unknown }).toJSON === \"function\")", () =>
          {
            writer.writeLine("result[key] = (value as { toJSON: () => unknown }).toJSON();");
          });
          writer.allmanBlock("else", () =>
          {
            writer.writeLine("result[key] = value;");
          });
        });
      });
      writer.writeLine("return result as T;");
    });
    writer.blankLine();

    writer.writeTsDoc(
      {
        summary: "Returns the compact JSON string representation of this model instance with no indentation.",
        returns: COMPACT_JSON_RETURN_DESCRIPTION
      }
    );
    writer.allmanBlock("toString(): string", () =>
    {
      writer.writeLine("return JSON.stringify(this.toJSON());");
    });
  });
  writer.blankLine();

  // 1. We generate Enums from AST
  for (const viewKitEnum of spec.enums)
  {
    writer.writeTsDoc({ summary: viewKitEnum.doc });
    writer.allmanBlock(`export enum ${viewKitEnum.name}`, () =>
    {
      for (let index = 0; index < viewKitEnum.members.length; index++)
      {
        const member = viewKitEnum.members[index];
        if (member.doc)
        {
          writer.writeLine(`// ${member.doc}`);
        }
        const isLast = index === viewKitEnum.members.length - 1;
        writer.writeLine(`${member.name} = "${member.value}"${isLast ? "" : ","}`);
      }
    });
    writer.blankLine();
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
    writer.writeTsDoc(
      {
        summary: root.doc ?? `Base structural contract for all \`${root.name}\` visual element models.`
      }
    );
    writer.interfaceBlock(`export interface ${root.name}Base`, () =>
    {
      writer.writeTsDoc(
        {
          summary: "The polymorphic discriminator type tag."
        }
      );
      writer.writeLine(`readonly ${root.discriminatorProperty}: string;`);
      if (rootModel)
      {
        for (const property of rootModel.properties)
        {
          if (property.name !== root.discriminatorProperty)
          {
            writer.writeTsDoc({ summary: property.doc });
            const optional = property.optional ? "?" : "";
            writer.writeLine(`readonly ${property.name}${optional}: ${resolveTsType(property.type)};`);
          }
        }
      }
    });
    writer.blankLine();

    writer.writeTsDoc(
      {
        summary: `Abstract base class for all \`${root.name}\` models.`
      }
    );
    writer.classBlock(`export abstract class Base${root.name}<T = ${root.name}> extends ViewKitNode<T> implements ${root.name}Base`, () =>
    {
      writer.writeLine(`abstract readonly ${root.discriminatorProperty}: string;`);
      if (rootModel)
      {
        for (const property of rootModel.properties)
        {
          if (property.name !== root.discriminatorProperty)
          {
            const optional = property.optional ? "?" : "";
            writer.writeLine(`abstract readonly ${property.name}${optional}: ${resolveTsType(property.type)};`);
          }
        }
      }
    });
    writer.blankLine();
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
    const baseProperties = computeBaseModelProperties(model, spec);

    writer.writeTsDoc({ summary: model.doc });
    writer.interfaceBlock(`export interface ${model.name}${extendsClause}`, () =>
    {
      for (const property of model.properties)
      {
        if (!shouldEmitInterfaceProperty(property, model, baseProperties))
        {
          continue;
        }

        let defaultValueString: string | undefined;
        if (property.name === DISCRIMINATOR_PROPERTY && model.discriminatorValue)
        {
          defaultValueString = `"${model.discriminatorValue}"`;
        }
        else if (property.defaultValue !== undefined)
        {
          defaultValueString = formatTsDefaultValue(property);
        }
        writer.writeTsDoc({ summary: property.doc, defaultValue: defaultValueString });
        const optional = property.optional ? "?" : "";
        const tsType = resolveTsType(property.type);
        writer.writeLine(`readonly ${property.name}${optional}: ${tsType};`);
      }
    });
    writer.blankLine();
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
    writer.writeTsDoc(
      {
        summary: root.doc ?? `Polymorphic discriminated union of all concrete \`${root.name}\` models.`
      }
    );
    writer.writeLine(`export type ${root.name} = ${unionTypes};`);
    writer.blankLine();
  }

  // 5. We generate Classes implementing the Interfaces
  writer.writeLine(CONCRETE_CLASSES_SECTION_HEADER);
  writer.blankLine();
  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslIgnored)
    {
      continue;
    }
    generateModelClass(model, polymorphicRootNames, writer);
  }

  // 6. We generate Model-Driven Fluent Builders for all @dslRoot models
  for (const root of spec.rootModels)
  {
    const builderClassName = `${root.name}Builder`;
    const {
      nonTypeProperties: rootNonTypeProperties,
      scalarRequiredProperties: rootRequiredProperties,
      scalarOptionalProperties: rootOptionalProperties,
      arrayProperties: rootArrayProperties
    } = partitionProperties(root.properties, { excludeSchemaVersion: true });

    writer.writeTsDoc(
      {
        summary: `Fluent builder for constructing strongly-typed \`${root.name}\` instances.`,
        remarks: root.doc
      }
    );
    writer.classBlock(`export class ${builderClassName}`, () =>
    {
      for (const property of rootRequiredProperties)
      {
        writer.writeLine(`private readonly _${property.name}: ${resolveTsType(property.type)};`);
      }
      for (const property of rootOptionalProperties)
      {
        writer.writeLine(`private _${property.name}?: ${resolveTsType(property.type)};`);
      }
      for (const property of rootArrayProperties)
      {
        const elementType = resolveTsType(property.type.elementType ?? { kind: "unknown", name: "unknown" });
        writer.writeLine(`private readonly _${property.name}: ${elementType}[] = [];`);
      }
      if (rootRequiredProperties.length > 0 || rootOptionalProperties.length > 0 || rootArrayProperties.length > 0)
      {
        writer.blankLine();
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

      writer.writeTsDoc(
        {
          summary: `Initializes a new \`${builderClassName}\`.`,
          params: constructorDocParameters
        }
      );
      writer.allmanBlock(`constructor(${constructorArguments})`, () =>
      {
        for (const property of rootRequiredProperties)
        {
          writer.writeLine(`this._${property.name} = ${property.name};`);
        }
      });
      writer.blankLine();

      // We generate setters for scalar optional properties
      for (const property of rootOptionalProperties)
      {
        writer.writeTsDoc(
          {
            summary: `Sets the \`${property.name}\` property on this builder.`,
            params: [ { name: property.name, description: property.doc } ],
            returns: BUILDER_RETURN_DESCRIPTION
          }
        );
        writer.allmanBlock(`${property.name}(${property.name}: ${resolveTsType(property.type)}): this`, () =>
        {
          writer.writeLine(`this._${property.name} = ${property.name};`);
          writer.writeLine("return this;");
        });
        writer.blankLine();
      }

      // We generate collection adders for array properties
      for (const property of rootArrayProperties)
      {
        const elementType = resolveTsType(property.type.elementType ?? { kind: "unknown", name: "unknown" });
        const singularName = property.name.endsWith("s") ? property.name.slice(0, -1) : property.name;
        const addMethodName = `add${capitalizeText(singularName)}`;
        const addAllMethodName = `add${capitalizeText(property.name)}`;

        if (property.name === ELEMENTS_PROPERTY)
        {
          writer.writeTsDoc(
            {
              summary: "Appends a visual element.",
              params: [ { name: "element", description: "The visual UI element component to add." } ],
              returns: BUILDER_RETURN_DESCRIPTION
            }
          );
          writer.allmanBlock(`add(element: ${elementType}): this`, () =>
          {
            writer.writeLine(`this._${property.name}.push(element);`);
            writer.writeLine("return this;");
          });
          writer.blankLine();
        }

        writer.writeTsDoc(
          {
            summary: `Appends multiple ${property.name} items.`,
            params: [ { name: "items", description: `The \`${elementType}\` items to add.` } ],
            returns: BUILDER_RETURN_DESCRIPTION
          }
        );
        writer.allmanBlock(`${addAllMethodName}(...items: ${elementType}[]): this`, () =>
        {
          writer.writeLine(`this._${property.name}.push(...items);`);
          writer.writeLine("return this;");
        });
        writer.blankLine();

        if (property.name !== ELEMENTS_PROPERTY)
        {
          writer.writeTsDoc(
            {
              summary: `Appends a single ${singularName}.`,
              params: [ { name: "item", description: `The \`${elementType}\` item to add.` } ],
              returns: BUILDER_RETURN_DESCRIPTION
            }
          );
          writer.allmanBlock(`${addMethodName}(item: ${elementType}): this`, () =>
          {
            writer.writeLine(`this._${property.name}.push(item);`);
            writer.writeLine("return this;");
          });
          writer.blankLine();
        }
      }

      // We generate shortcut methods for every model in spec.uiElements
      for (const uiModel of spec.uiElements)
      {
        if (uiModel.isDslIgnored)
        {
          continue;
        }
        const { primary, aliases } = computeFactoryNames(uiModel);
        const allNames = Array.from(new Set([ primary, ...aliases ]));
        const { requiredProperties, optionalProperties } = partitionProperties(uiModel.properties);

        const parameters: string[] = [];
        const callArguments: string[] = [];
        const methodDocParameters: TsDocParam[] = [];

        for (const property of requiredProperties)
        {
          parameters.push(`${property.name}: ${resolveTsType(property.type)}`);
          callArguments.push(property.name);
          methodDocParameters.push({ name: property.name, description: property.doc });
        }

        const {
          parameter: optionsParam,
          docParam: optionsDocParam
        } = formatOptionsParameter(optionalProperties, "Optional component settings");
        if (optionsParam)
        {
          parameters.push(optionsParam);
          callArguments.push("options");
          if (optionsDocParam)
          {
            methodDocParameters.push(optionsDocParam);
          }
        }

        for (const functionName of allNames)
        {
          const methodName = `add${capitalizeText(functionName)}`;
          writer.writeTsDoc(
            {
              summary: `Appends a \`${uiModel.name}\` component.`,
              remarks: uiModel.doc,
              params: methodDocParameters,
              returns: BUILDER_RETURN_DESCRIPTION
            }
          );
          writer.allmanBlock(`${methodName}(${parameters.join(", ")}): this`, () =>
          {
            writer.writeLine(`return this.add(${functionName}(${callArguments.join(", ")}));`);
          });
          writer.blankLine();
        }
      }

      const className = `${root.name}Class`;
      writer.writeTsDoc(
        {
          summary: `Finalizes and returns the complete strongly-typed \`${className}\` instance.`,
          returns: `The constructed \`${className}\` instance.`
        }
      );
      writer.allmanBlock(`build(): ${className}`, () =>
      {
        const buildArgs = formatClassInvocationArgs(rootRequiredProperties, rootArrayProperties, rootOptionalProperties, "builder");
        writer.writeLine(`return new ${className}(`);
        writer.indent(() =>
        {
          for (let index = 0; index < buildArgs.length; index++)
          {
            writer.writeLine(index < buildArgs.length - 1 ? `${buildArgs[index]},` : buildArgs[index]);
          }
        });
        writer.writeLine(");");
      });
      writer.blankLine();

      writer.writeTsDoc(
        {
          summary: `Serializes this builder into a strongly-typed, JSON-compatible plain object conforming to interface \`${root.name}\`.`,
          returns: `The plain object representation conforming to interface \`${root.name}\`.`
        }
      );
      writer.allmanBlock(`toJSON(): ${root.name}`, () =>
      {
        writer.writeLine("return this.build().toJSON();");
      });
      writer.blankLine();

      writer.writeTsDoc(
        {
          summary: `Returns the compact JSON string representation of the built \`${className}\` instance with no indentation.`,
          returns: COMPACT_JSON_RETURN_DESCRIPTION
        }
      );
      writer.allmanBlock("toString(): string", () =>
      {
        writer.writeLine("return this.build().toString();");
      });
    });
    writer.blankLine();

    // 7. We generate Static Root Model Helpers
    const className = `${root.name}Class`;
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

    writer.writeTsDoc(
      {
        summary: `Static helper factory object for \`${root.name}\`.`
      }
    );
    writer.allmanBlock(`export const ${root.name} =`, () =>
    {
      writer.writeTsDoc(
        {
          summary: `Creates a new fluent builder for constructing a \`${root.name}\`.`,
          params: constructorDocParameters,
          returns: `A new \`${builderClassName}\` instance.`
        }
      );
      const builderCallArguments = rootRequiredProperties
        .map(
          (property) =>
          {
            return property.name;
          }
        )
        .join(", ");
      writer.allmanBlock(`builder(${constructorArguments}): ${builderClassName}`, () =>
      {
        writer.writeLine(`return new ${builderClassName}(${builderCallArguments});`);
      }, ",");
      writer.blankLine();

      const createParameters = rootNonTypeProperties
        .map(
          (property) =>
          {
            return `${property.name}${property.optional ? "?" : ""}: ${resolveTsType(property.type)}`;
          }
        )
        .join("; ");
      writer.writeTsDoc(
        {
          summary: `Creates a \`${className}\` directly from a properties object.`,
          params: [ { name: "params", description: "Configuration properties." } ],
          returns: `A completed \`${className}\` instance.`
        }
      );
      writer.allmanBlock(`create(params: { ${createParameters} }): ${className}`, () =>
      {
        const createArgs = formatClassInvocationArgs(rootRequiredProperties, rootArrayProperties, rootOptionalProperties, "params");
        writer.writeLine(`return new ${className}(`);
        writer.indent(() =>
        {
          for (let index = 0; index < createArgs.length; index++)
          {
            writer.writeLine(index < createArgs.length - 1 ? `${createArgs[index]},` : createArgs[index]);
          }
        });
        writer.writeLine(");");
      }, ",");
      writer.blankLine();

      writer.writeTsDoc(
        {
          summary: `Parses a JSON string or raw object into a validated \`${className}\` instance.`,
          params: [
            { name: "json", description: "JSON string or parsed JavaScript object to validate and hydrate." },
            { name: "withDeepValidation", description: "Whether to recursively validate all nested child entities." }
          ],
          returns: `A strongly-typed \`${className}\` instance.`,
          remarks: `Throws an \`Error\` if the input does not conform to the \`${root.name}\` schema.`
        }
      );
      writer.allmanBlock(`parse(json: string | unknown, withDeepValidation = true): ${className}`, () =>
      {
        writer.writeLine("const data: unknown = typeof json === \"string\" ? JSON.parse(json) : json;");
        writer.allmanBlock(`if (!is${root.name}(data, withDeepValidation))`, () =>
        {
          writer.writeLine(`throw new Error("Invalid JSON: value does not match the \`${root.name}\` schema.");`);
        });
        writer.writeLine(`return ${root.name}.create(data);`);
      });
    }, ";");
    writer.blankLine();

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
    writer.writeTsDoc(
      {
        summary: `Functional helper to create a \`${className}\` instance directly.`,
        remarks: root.doc,
        params: [
          ...constructorDocParameters,
          ...(rootOptionalCreateFields.length > 0 ? [ {
            name: "options",
            description: "Optional configuration properties."
          } ] : [])
        ],
        returns: `A strongly-typed \`${className}\` instance.`
      }
    );
    const optionsParameter = rootOptionalCreateFields.length > 0
      ? (rootRequiredProperties.length > 0 ? `, options?: { ${rootOptionalCreateFields} }` : `options?: { ${rootOptionalCreateFields} }`)
      : "";
    writer.allmanBlock(`export function ${createFunctionName}(${constructorArguments}${optionsParameter}): ${className}`, () =>
    {
      const helperArgs = formatClassInvocationArgs(rootRequiredProperties, rootArrayProperties, rootOptionalProperties, "helper");
      writer.writeLine(`return new ${className}(`);
      writer.indent(() =>
      {
        for (let index = 0; index < helperArgs.length; index++)
        {
          writer.writeLine(index < helperArgs.length - 1 ? `${helperArgs[index]},` : helperArgs[index]);
        }
      });
      writer.writeLine(");");
    });
    writer.blankLine();

    const parseFunctionName = `parse${root.name}`;
    writer.writeTsDoc(
      {
        summary: `Parses a JSON string or raw object into a validated \`${className}\` instance.`,
        remarks: root.doc,
        params: [
          { name: "json", description: "JSON string or parsed JavaScript object to validate and hydrate." },
          { name: "withDeepValidation", description: "Whether to recursively validate all nested child entities." }
        ],
        returns: `A strongly-typed \`${className}\` instance.`
      }
    );
    writer.allmanBlock(`export function ${parseFunctionName}(json: string | unknown, withDeepValidation = true): ${className}`, () =>
    {
      writer.writeLine(`return ${root.name}.parse(json, withDeepValidation);`);
    });
    writer.blankLine();
  }

  // 9. We generate Functional DSL Factories for all models from AST
  writer.writeLine(FUNCTIONAL_FACTORIES_SECTION_HEADER);
  writer.blankLine();

  for (const model of spec.models)
  {
    if (polymorphicRootNames.has(model.name) || model.isDslRoot || spec.rootModels.includes(model) || model.isDslIgnored)
    {
      continue;
    }
    generateModelFactory(model, writer);
  }

  // 10. We generate Type Guards dynamically from AST polymorphic roots, supporting models, and root models
  writer.writeLine(TYPE_GUARDS_SECTION_HEADER);
  writer.blankLine();

  const supportingModels = spec.models.filter(
    (model) =>
    {
      return (
        !polymorphicRootNames.has(model.name) &&
        (!model.baseModelName || !polymorphicRootNames.has(model.baseModelName)) &&
        !model.isDslRoot &&
        !spec.rootModels.includes(model) &&
        !model.isDslIgnored
      );
    }
  );

  for (const model of supportingModels)
  {
    writer.writeTsDoc(
      {
        summary: `Type guard predicate verifying whether an unknown value conforms to \`${model.name}\`.`,
        params: [
          { name: "value", description: "The value to inspect." },
          { name: "withDeepValidation", description: "Whether to recursively validate all properties." }
        ],
        returns: `\`true\` if the value conforms to \`${model.name}\`, otherwise \`false\`.`
      }
    );
    writer.allmanBlock(`export function is${model.name}(value: unknown, withDeepValidation = false): value is ${model.name}`, () =>
    {
      writer.allmanBlock("if (typeof value !== \"object\" || value === null)", () =>
      {
        writer.writeLine("return false;");
      });
      writer.allmanBlock("if (!withDeepValidation)", () =>
      {
        writer.writeLine("return true;");
      });
      writer.writeLine(`const element = value as ${model.name};`);
      const propertyChecks = generateModelPropertyChecks(model.properties, spec, "element");
      if (propertyChecks.length === 0)
      {
        writer.writeLine("return true;");
      }
      else
      {
        writer.writeLine(`return ${propertyChecks.join(" &&\n    ")};`);
      }
    });
    writer.blankLine();
  }

  for (const root of spec.polymorphicRoots)
  {
    writer.writeTsDoc(
      {
        summary: `Type guard predicate verifying whether an unknown value conforms to \`${root.name}\`.`,
        params: [
          { name: "value", description: "The value to inspect." },
          { name: "withDeepValidation", description: "Whether to recursively validate all properties." }
        ],
        returns: `\`true\` if the value is a valid \`${root.name}\`, otherwise \`false\`.`
      }
    );
    writer.allmanBlock(`export function is${root.name}(value: unknown, withDeepValidation = false): value is ${root.name}`, () =>
    {
      writer.allmanBlock(`if (typeof value !== "object" || value === null || !("${root.discriminatorProperty}" in value) || typeof (value as { ${root.discriminatorProperty}: unknown }).${root.discriminatorProperty} !== "string")`, () =>
      {
        writer.writeLine("return false;");
      });
      writer.allmanBlock("if (!withDeepValidation)", () =>
      {
        writer.writeLine("return true;");
      });
      writer.writeLine(`const element = value as ${root.name};`);
      writer.allmanBlock(`switch (element.${root.discriminatorProperty})`, () =>
      {
        for (const derivedModel of root.derivedModels)
        {
          if (derivedModel.discriminatorValue && !derivedModel.isDslIgnored)
          {
            writer.writeLine(`case "${derivedModel.discriminatorValue}":`);
            writer.indent(() =>
            {
              writer.writeLine(`return is${derivedModel.name}(element, true);`);
            });
          }
        }
        writer.writeLine("default:");
        writer.indent(() =>
        {
          writer.writeLine("return false;");
        });
      });
    });
    writer.blankLine();

    for (const derivedModel of root.derivedModels)
    {
      if (derivedModel.discriminatorValue && !derivedModel.isDslIgnored)
      {
        const guardName = `is${derivedModel.name}`;
        writer.writeTsDoc(
          {
            summary: `Type guard predicate narrowing a value to \`${derivedModel.name}\`.`,
            params: [
              { name: "value", description: "The value to inspect." },
              { name: "withDeepValidation", description: "Whether to recursively validate all properties." }
            ],
            returns: `\`true\` if the value is a \`${derivedModel.name}\` (type = "${derivedModel.discriminatorValue}"), otherwise \`false\`.`
          }
        );
        writer.allmanBlock(`export function ${guardName}(value: unknown, withDeepValidation = false): value is ${derivedModel.name}`, () =>
        {
          writer.allmanBlock(`if (typeof value !== "object" || value === null || !("${root.discriminatorProperty}" in value) || (value as { ${root.discriminatorProperty}: unknown }).${root.discriminatorProperty} !== "${derivedModel.discriminatorValue}")`, () =>
          {
            writer.writeLine("return false;");
          });
          writer.allmanBlock("if (!withDeepValidation)", () =>
          {
            writer.writeLine("return true;");
          });
          writer.writeLine(`const element = value as ${derivedModel.name};`);
          const propertyChecks = generateModelPropertyChecks(derivedModel.properties, spec, "element");
          if (propertyChecks.length === 0)
          {
            writer.writeLine("return true;");
          }
          else
          {
            writer.writeLine(`return ${propertyChecks.join(" &&\n    ")};`);
          }
        });
        writer.blankLine();
      }
    }
  }

  for (const root of spec.rootModels)
  {
    writer.writeTsDoc(
      {
        summary: `Type guard predicate verifying whether an unknown value conforms to \`${root.name}\`.`,
        params: [
          { name: "value", description: "The value to inspect." },
          { name: "withDeepValidation", description: "Whether to recursively validate all properties." }
        ],
        returns: `\`true\` if the value is a valid \`${root.name}\`, otherwise \`false\`.`
      }
    );
    writer.allmanBlock(`export function is${root.name}(value: unknown, withDeepValidation = false): value is ${root.name}`, () =>
    {
      writer.allmanBlock("if (typeof value !== \"object\" || value === null)", () =>
      {
        writer.writeLine("return false;");
      });
      const shallowConditions: string[] = [];
      if (root.properties.some((property) => property.name === SCHEMA_VERSION_PROPERTY))
      {
        shallowConditions.push(`!("${SCHEMA_VERSION_PROPERTY}" in value) || (value as { ${SCHEMA_VERSION_PROPERTY}: unknown }).${SCHEMA_VERSION_PROPERTY} !== "${SCHEMA_VERSION_VALUE}"`);
      }
      for (const property of root.properties.filter((property) => !property.optional && property.defaultValue === undefined && property.name !== DISCRIMINATOR_PROPERTY && property.name !== SCHEMA_VERSION_PROPERTY))
      {
        shallowConditions.push(`!("${property.name}" in value)`);
      }
      if (shallowConditions.length > 0)
      {
        writer.allmanBlock(`if (${shallowConditions.join(" || ")})`, () =>
        {
          writer.writeLine("return false;");
        });
      }
      writer.allmanBlock("if (!withDeepValidation)", () =>
      {
        writer.writeLine("return true;");
      });
      writer.writeLine(`const element = value as ${root.name};`);
      const propertyChecks = generateModelPropertyChecks(root.properties, spec, "element");
      if (propertyChecks.length === 0)
      {
        writer.writeLine("return true;");
      }
      else
      {
        writer.writeLine(`return ${propertyChecks.join(" &&\n    ")};`);
      }
    });
    writer.blankLine();
  }

  return writer.toString();
}

function generateDeepTypeCheck(access: string, type: ViewKitType, spec: GrammarSpec): string
{
  switch (type.kind)
  {
    case "string":
      return `typeof ${access} === "string"`;
    case "number":
      return `typeof ${access} === "number"`;
    case "boolean":
      return `typeof ${access} === "boolean"`;
    case "literal":
      return `${access} === ${type.name}`;
    case "enum":
      return `Object.values(${type.name}).includes(${access} as ${type.name})`;
    case "model":
    {
      const targetModel = spec.models.find((candidate) => candidate.name === type.name);
      if (targetModel && !targetModel.isDslIgnored)
      {
        return `is${targetModel.name}(${access}, true)`;
      }
      return `(typeof ${access} === "object" && ${access} !== null)`;
    }
    case "array":
    {
      if (type.elementType)
      {
        const itemCheck = generateDeepTypeCheck("item", type.elementType, spec);
        return `(Array.isArray(${access}) && ${access}.every((item) => ${itemCheck}))`;
      }
      return `Array.isArray(${access})`;
    }
    case "record":
      return `(typeof ${access} === "object" && ${access} !== null)`;
    case "union":
    {
      if (type.unionTypes && type.unionTypes.length > 0)
      {
        const unionChecks = type.unionTypes.map((unionType: ViewKitType) => generateDeepTypeCheck(access, unionType, spec));
        return `(${unionChecks.join(" || ")})`;
      }
      return "true";
    }
    default:
      return "true";
  }
}
