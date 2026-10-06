import { createGeneratedFileHeader, DocumentationType, getDocumentationText } from "../common.js";
import { CodeWriter } from "../codeWriter.js";
import {
  INTENT_TOKEN,
  IntentEnum,
  IntentModel,
  IntentProperty,
  IntentSpec,
  IntentType,
  IntentUnion
} from "./intentsModel.js";


function getPublicIntentName(item: { readonly name: string; readonly isIntent?: boolean }): string
{
  return item.isIntent || item.name.endsWith(INTENT_TOKEN) ? item.name : `${INTENT_TOKEN}${item.name}`;
}


function resolveZodTypeExpression(type: IntentType, property?: IntentProperty): string
{
  switch (type.kind)
  {
    case "string":
    {
      if (property?.format === "url")
      {
        return "z.url()";
      }
      let expression = "z.string()";
      if (property?.minLength !== undefined)
      {
        expression += `.min(${property.minLength})`;
      }
      if (property?.maxLength !== undefined)
      {
        expression += `.max(${property.maxLength})`;
      }
      if (property?.pattern !== undefined)
      {
        expression += `.regex(new RegExp(${JSON.stringify(property.pattern)}))`;
      }
      return expression;
    }

    case "number":
    {
      let expression = type.name === "int" || type.name === "int32" || type.name === "integer" || type.name === "int64"
        ? "z.int32()"
        : "z.number()";
      if (property?.minValue !== undefined)
      {
        expression += `.min(${property.minValue})`;
      }
      if (property?.maxValue !== undefined)
      {
        expression += `.max(${property.maxValue})`;
      }
      return expression;
    }

    case "boolean":
      return "z.boolean()";

    case "bytes":
      return "z.instanceof(Buffer)";

    case "literal":
      return `z.literal(${JSON.stringify(type.literalValue)})`;

    case "enum":
      return `zod${type.name}`;

    case "model":
      return `zod${type.name}`;

    case "record":
      return "z.record(z.string(), z.unknown())";

    case "array":
    {
      const elementExpression = resolveZodTypeExpression(type.elementType ?? { kind: "string", name: "string" });
      let expression = `z.array(${elementExpression})`;
      if (property?.minItems !== undefined)
      {
        expression += `.min(${property.minItems})`;
      }
      if (property?.maxItems !== undefined)
      {
        expression += `.max(${property.maxItems})`;
      }
      return expression;
    }

    case "union":
    {
      const variants = type.unionTypes ?? [];
      const isAllStringLiterals = variants.length > 0 && variants.every((variant) =>
      {
        return variant.kind === "literal" && typeof variant.literalValue === "string";
      });

      if (isAllStringLiterals)
      {
        const literalValues = variants.map((variant) => JSON.stringify(variant.literalValue));
        return `z.enum([ ${literalValues.join(", ")} ])`;
      }

      if (variants.length === 1)
      {
        return resolveZodTypeExpression(variants[0]);
      }

      const variantExpressions = variants.map((variant) => resolveZodTypeExpression(variant));
      return `z.union([ ${variantExpressions.join(", ")} ])`;
    }
  }
}

function formatZodPropertyDefinition(property: IntentProperty): string
{
  const baseExpression = resolveZodTypeExpression(property.type, property);
  const optionalExpression = property.optional ? `${baseExpression}.optional()` : baseExpression;
  const documentedExpression = appendSchemaDocumentation(optionalExpression, property);
  return `${property.name}: ${documentedExpression}`;
}

function getSchemaDocumentation(documentation: DocumentationType): string | undefined
{
  return getDocumentationText(documentation);
}

function appendSchemaDocumentation(expression: string, documentation: DocumentationType): string
{
  const text = getSchemaDocumentation(documentation);
  return text ? `${expression}.describe(${JSON.stringify(text)})` : expression;
}

interface DeclarationItem
{

  readonly kind: "model" | "union";
  readonly name: string;
  readonly model?: IntentModel;
  readonly union?: IntentUnion;
  readonly dependencies: Set<string>;

}

function collectTypeDependencies(type: IntentType, dependencies: Set<string>): void
{
  if (type.kind === "model")
  {
    dependencies.add(type.name);
  }
  else if (type.kind === "union")
  {
    for (const variant of type.unionTypes ?? [])
    {
      collectTypeDependencies(variant, dependencies);
    }
  }
  else if (type.kind === "array" && type.elementType)
  {
    collectTypeDependencies(type.elementType, dependencies);
  }
}

function orderDeclarationsTopologically(spec: IntentSpec): DeclarationItem[]
{
  const items: DeclarationItem[] = [];

  for (const intentUnion of spec.unions)
  {
    const dependencies = new Set<string>();
    for (const variant of intentUnion.variants)
    {
      collectTypeDependencies(variant, dependencies);
    }
    items.push({
      kind: "union",
      name: intentUnion.name,
      union: intentUnion,
      dependencies
    });
  }

  for (const model of spec.models)
  {
    const dependencies = new Set<string>();
    if (model.baseModelName)
    {
      dependencies.add(model.baseModelName);
    }
    for (const property of model.properties)
    {
      collectTypeDependencies(property.type, dependencies);
    }
    items.push({
      kind: "model",
      name: model.name,
      model,
      dependencies
    });
  }

  const resolved = new Set<string>();
  for (const intentEnum of spec.enums)
  {
    resolved.add(intentEnum.name);
  }

  const sorted: DeclarationItem[] = [];
  const remaining = [ ...items ];

  let progress = true;
  while (remaining.length > 0 && progress)
  {
    progress = false;
    for (let index = 0; index < remaining.length; index++)
    {
      const candidate = remaining[index];
      const hasUnresolvedDependency = [ ...candidate.dependencies ].some((dependencyName) =>
      {
        return !resolved.has(dependencyName) && items.some((item) => item.name === dependencyName);
      });

      if (!hasUnresolvedDependency)
      {
        sorted.push(candidate);
        resolved.add(candidate.name);
        remaining.splice(index, 1);
        progress = true;
        break;
      }
    }
  }

  if (remaining.length > 0)
  {
    sorted.push(...remaining);
  }

  return sorted;
}

function writeZodEnum(intentEnum: IntentEnum, writer: CodeWriter): void
{
  const memberValues = intentEnum.members.map((member) => JSON.stringify(member.value));
  const documentedSchema = appendSchemaDocumentation(
    `z.enum([ ${memberValues.join(", ")} ])`,
    intentEnum
  );
  writer.writeLine(`export const zod${intentEnum.name} = ${documentedSchema};`);
  writer.writeLine(`export type zod${intentEnum.name} = typeof zod${intentEnum.name};`);
  writer.blankLine();

  const publicName = getPublicIntentName(intentEnum);
  if (publicName !== intentEnum.name)
  {
    writer.writeLine(`export const zod${publicName} = zod${intentEnum.name};`);
    writer.writeLine(`export type zod${publicName} = typeof zod${intentEnum.name};`);
    writer.blankLine();
  }
}

function writeZodUnion(intentUnion: IntentUnion, writer: CodeWriter): void
{
  const variantExpressions = intentUnion.variants.map((variant) => resolveZodTypeExpression(variant));
  writer.writeLine(`export const zod${intentUnion.name} = z.union([`);
  writer.indent(() =>
  {
    for (let index = 0; index < variantExpressions.length; index++)
    {
      const isLast = index === variantExpressions.length - 1;
      writer.writeLine(`${variantExpressions[index]}${isLast ? "" : ","}`);
    }
  });
  const unionDocumentation = getSchemaDocumentation(intentUnion);
  writer.writeLine(`])${unionDocumentation ? `.describe(${JSON.stringify(unionDocumentation)})` : ""};`);
  writer.writeLine(`export type zod${intentUnion.name} = typeof zod${intentUnion.name};`);
  writer.blankLine();

  const publicName = getPublicIntentName(intentUnion);
  if (publicName !== intentUnion.name)
  {
    writer.writeLine(`export const zod${publicName} = zod${intentUnion.name};`);
    writer.writeLine(`export type zod${publicName} = typeof zod${intentUnion.name};`);
    writer.blankLine();
  }
}

function writeZodModel(model: IntentModel, writer: CodeWriter): void
{
  const modelDocumentation = getSchemaDocumentation(model);
  if (model.baseModelName)
  {
    if (model.properties.length === 0)
    {
      writer.writeLine(`export const zod${model.name} = ${appendSchemaDocumentation(`zod${model.baseModelName}`, model)};`);
    }
    else
    {
      writer.writeLine(`export const zod${model.name} = zod${model.baseModelName}.extend({`);
      writer.indent(() =>
      {
        for (let index = 0; index < model.properties.length; index++)
        {
          const property = model.properties[index];
          const isLast = index === model.properties.length - 1;
          const propertyLine = formatZodPropertyDefinition(property);
          writer.writeLine(`${propertyLine}${isLast ? "" : ","}`);
        }
      });
      writer.writeLine(`})${modelDocumentation ? `.describe(${JSON.stringify(modelDocumentation)})` : ""};`);
    }
  }
  else
  {
    if (model.properties.length === 0)
    {
      writer.writeLine(`export const zod${model.name} = z.object({})${modelDocumentation ? `.describe(${JSON.stringify(modelDocumentation)})` : ""};`);
    }
    else
    {
      writer.writeLine(`export const zod${model.name} = z.object({`);
      writer.indent(() =>
      {
        for (let index = 0; index < model.properties.length; index++)
        {
          const property = model.properties[index];
          const isLast = index === model.properties.length - 1;
          const propertyLine = formatZodPropertyDefinition(property);
          writer.writeLine(`${propertyLine}${isLast ? "" : ","}`);
        }
      });
      writer.writeLine(`})${modelDocumentation ? `.describe(${JSON.stringify(modelDocumentation)})` : ""};`);
    }
  }
  writer.writeLine(`export type zod${model.name} = typeof zod${model.name};`);
  writer.blankLine();

  if (!model.isIntent)
  {
    const publicName = getPublicIntentName(model);
    if (publicName !== model.name)
    {
      writer.writeLine(`export const zod${publicName} = zod${model.name};`);
      writer.writeLine(`export type zod${publicName} = typeof zod${model.name};`);
      writer.blankLine();
    }
  }
}

export function generateZodIntentsTypeScriptCode(spec: IntentSpec): string
{
  const writer = new CodeWriter({ indentSize: 2 });

  writer.writeLines(createGeneratedFileHeader("//"));
  writer.writeLine("import { Buffer } from \"node:buffer\";");
  writer.writeLine("import { z } from \"zod\";");
  writer.writeLine();
  writer.blankLine();

  for (const intentEnum of spec.enums)
  {
    writeZodEnum(intentEnum, writer);
  }

  const orderedDeclarations = orderDeclarationsTopologically(spec);

  for (const declaration of orderedDeclarations)
  {
    if (declaration.kind === "union" && declaration.union)
    {
      writeZodUnion(declaration.union, writer);
    }
    else if (declaration.kind === "model" && declaration.model)
    {
      writeZodModel(declaration.model, writer);
    }
  }

  return `${writer.toString().trimEnd()}\n`;
}
