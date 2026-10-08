import { IntentEnum, IntentModel, IntentSpec, IntentType, IntentUnion } from "./intents/intentsModel.js";
import { GrammarSpec, ViewKitEnum, ViewKitModel, ViewKitType } from "./viewkit/typespecModel.js";
import { DslAliasName } from "./viewkit/decorators.js";
import { DocumentationType, getDocumentationText } from "./common.js";


interface MarkdownProperty extends DocumentationType
{

  readonly name: string;
  readonly optional: boolean;
  readonly type: IntentType | ViewKitType;
  readonly defaultValue?: string | number | boolean;
  readonly attributes?: readonly string[];

}

interface MarkdownModel extends DocumentationType
{

  readonly name: string;
  readonly baseModelName?: string;
  readonly properties: readonly MarkdownProperty[];
  readonly metadata?: readonly string[];

}

interface MarkdownEnum extends DocumentationType
{

  readonly name: string;
  readonly members: readonly (DocumentationType & {
    readonly name: string;
    readonly value: string;
  })[];

}

function createAnchor(name: string): string
{
  return name.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-");
}

function escapeMarkdownCell(value: string): string
{
  return value
    .replace(/\|/g, "\\|")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n+/g, " ");
}

function renderSummaryAndDoc(documentation: DocumentationType): string
{
  return getDocumentationText(documentation) ?? "";
}

function renderType(type: IntentType | ViewKitType): string
{
  if (type.kind === "array")
  {
    const elementType = type.elementType ? renderType(type.elementType) : "unknown";
    return `${elementType}[]`;
  }

  if (type.kind === "union")
  {
    return (type.unionTypes ?? []).map(renderType).join(" | ");
  }

  if (type.kind === "literal")
  {
    const literalValue = type.literalValue ?? type.name;
    return typeof literalValue === "string" ? JSON.stringify(literalValue) : String(literalValue);
  }

  if (type.kind === "record")
  {
    return "Record<string, unknown>";
  }

  if (type.kind === "model" || type.kind === "enum")
  {
    const targetName = type.name;
    return `[${targetName}](#${createAnchor(targetName)})`;
  }

  if (type.kind === "bytes")
  {
    return "bytes";
  }

  return type.name;
}

function renderProperties(properties: readonly MarkdownProperty[]): string
{
  if (properties.length === 0)
  {
    return "_No properties._\n";
  }

  const lines = [
    "| Property | Type | Required | Default | Details |",
    "| --- | --- | --- | --- | --- |"
  ];

  for (const property of properties)
  {
    const details = [
      renderSummaryAndDoc(property),
      ...(property.attributes ?? [])
    ].filter(Boolean).join(" — ");
    const defaultValue = property.defaultValue === undefined
      ? ""
      : `\`${escapeMarkdownCell(String(property.defaultValue))}\``;
    lines.push(
      `| \`${escapeMarkdownCell(property.name)}\` | ${escapeMarkdownCell(renderType(property.type))} | ${property.optional ? "No" : "Yes"} | ${defaultValue} | ${escapeMarkdownCell(details)} |`
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderModels(title: string, models: readonly MarkdownModel[]): string
{
  if (models.length === 0)
  {
    return "";
  }

  const lines = [ `## ${title}`, "" ];

  for (const model of models)
  {
    lines.push(`### ${model.name}`, "");
    const description = renderSummaryAndDoc(model);
    if (description)
    {
      lines.push(description, "");
    }
    if (model.baseModelName)
    {
      lines.push(`Extends [${model.baseModelName}](#${createAnchor(model.baseModelName)}).`, "");
    }
    for (const metadata of model.metadata ?? [])
    {
      lines.push(`- ${metadata}`);
    }
    if (model.metadata && model.metadata.length > 0)
    {
      lines.push("");
    }
    lines.push(renderProperties(model.properties), "");
  }

  return lines.join("\n");
}

function renderEnums(title: string, enums: readonly MarkdownEnum[]): string
{
  if (enums.length === 0)
  {
    return "";
  }

  const lines = [ `## ${title}`, "" ];
  for (const enumType of enums)
  {
    lines.push(`### ${enumType.name}`, "");
    const description = renderSummaryAndDoc(enumType);
    if (description)
    {
      lines.push(description, "");
    }
    lines.push("| Member | Value | Description |", "| --- | --- | --- |");
    for (const member of enumType.members)
    {
      lines.push(
        `| \`${escapeMarkdownCell(member.name)}\` | \`${escapeMarkdownCell(member.value)}\` | ${escapeMarkdownCell(renderSummaryAndDoc(member))} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderUnions(unions: readonly IntentUnion[]): string
{
  if (unions.length === 0)
  {
    return "";
  }

  const lines = [ "## Unions", "" ];
  for (const unionType of unions)
  {
    lines.push(`### ${unionType.name}`, "");
    const description = renderSummaryAndDoc(unionType);
    if (description)
    {
      lines.push(description, "");
    }
    lines.push("| Variant | Type |", "| --- | --- |");
    for (const [ index, variant ] of unionType.variants.entries())
    {
      lines.push(`| ${index + 1} | ${escapeMarkdownCell(renderType(variant))} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function mapIntentModel(model: IntentModel): MarkdownModel
{
  const properties = model.properties.map(
    (property): MarkdownProperty =>
    {
      const propertyAttributes: string[] = [];
      if (property.format)
      {
        propertyAttributes.push(`Format: \`${property.format}\``);
      }
      if (property.minLength !== undefined || property.maxLength !== undefined)
      {
        propertyAttributes.push(`Length: ${property.minLength ?? 0}–${property.maxLength ?? "unbounded"}`);
      }
      if (property.minValue !== undefined || property.maxValue !== undefined)
      {
        propertyAttributes.push(`Range: ${property.minValue ?? "unbounded"}–${property.maxValue ?? "unbounded"}`);
      }
      if (property.pattern)
      {
        propertyAttributes.push(`Pattern: \`${property.pattern}\``);
      }
      if (property.minItems !== undefined || property.maxItems !== undefined)
      {
        propertyAttributes.push(`Items: ${property.minItems ?? 0}–${property.maxItems ?? "unbounded"}`);
      }

      return {
        name: property.name,
        summary: property.summary,
        doc: property.doc,
        optional: property.optional,
        type: property.type,
        attributes: propertyAttributes
      };
    }
  );

  return {
    name: model.name,
    summary: model.summary,
    doc: model.doc,
    baseModelName: model.baseModelName,
    properties
  };
}

function mapIntentEnum(enumType: IntentEnum): MarkdownEnum
{
  return {
    name: enumType.name,
    summary: enumType.summary,
    doc: enumType.doc,
    members: enumType.members
  };
}

function renderIntentIndex(
  title: string,
  models: readonly IntentModel[],
  documentation?: DocumentationType
): string
{
  if (models.length === 0)
  {
    return "";
  }

  const lines = [ `## ${title}`, "" ];
  const introduction = documentation ? renderSummaryAndDoc(documentation) : "";
  if (introduction)
  {
    lines.push(introduction, "");
  }
  lines.push("| Intent model | Description | Base model |", "| --- | --- | --- |");
  for (const model of models)
  {
    lines.push(
      `| [${model.name}](#${createAnchor(model.name)}) | ${escapeMarkdownCell(renderSummaryAndDoc(model))} | ${model.baseModelName ? `[${model.baseModelName}](#${createAnchor(model.baseModelName)})` : ""} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function generateIntentsMarkdown(spec: IntentSpec): string
{
  const intentModels = spec.models.filter((model): boolean => model.isIntent === true);
  const frontEndIntents = intentModels.filter((model): boolean => model.audience === "frontEnd");
  const backEndIntents = intentModels.filter((model): boolean => model.audience === "backEnd");
  const otherIntents = intentModels.filter((model): boolean => model.audience === undefined);
  const sharedModels = spec.models.filter((model): boolean => model.isIntent !== true);

  const content = [
    "# Intent models",
    "",
    renderSummaryAndDoc({ summary: spec.namespaceSummary, doc: spec.namespaceDoc }),
    "",
    renderIntentIndex("Front-end intents", frontEndIntents, spec.frontEndIntentDocumentation),
    renderModels("Front-end intent details", frontEndIntents.map(mapIntentModel)),
    renderIntentIndex("Back-end intents", backEndIntents, spec.backEndIntentDocumentation),
    renderModels("Back-end intent details", backEndIntents.map(mapIntentModel)),
    renderIntentIndex("Other intent models", otherIntents),
    renderModels("Other intent details", otherIntents.map(mapIntentModel)),
    renderModels("Shared payload models", sharedModels.map(mapIntentModel)),
    renderEnums("Enums", spec.enums.map(mapIntentEnum)),
    renderUnions(spec.unions)
  ];

  return `${content.filter(Boolean).map((section): string => section.trim()).join("\n\n")}\n`;
}

function mapViewKitModel(model: ViewKitModel): MarkdownModel
{
  const metadata: string[] = [];
  if (model.uiLayout)
  {
    metadata.push(`Layout: \`${model.uiLayout}\``);
  }
  if (model.uiWidget)
  {
    metadata.push(`Widget: \`${model.uiWidget}\``);
  }
  if (model.aliases.length > 0)
  {
    metadata.push(`Aliases: ${model.aliases.map((alias: DslAliasName): string => `\`${alias}\``).join(", ")}`);
  }
  if (model.isCustomRenderer)
  {
    metadata.push("Uses a custom renderer.");
  }

  return {
    name: model.name,
    summary: model.summary,
    doc: model.doc,
    baseModelName: model.baseModelName,
    metadata,
    properties: model.properties.map(
      (property): MarkdownProperty =>
      {
        const attributes: string[] = [];
        if (property.isUiLabel)
        {
          attributes.push("UI label");
        }
        if (property.isUiValue)
        {
          attributes.push("UI value");
        }
        if (property.isUiModifiers)
        {
          attributes.push("UI modifiers");
        }
        if (property.uiMeterBound)
        {
          attributes.push(`Meter bound: \`${property.uiMeterBound}\``);
        }
        if (property.uiDivider)
        {
          attributes.push(`Divider: \`${property.uiDivider.orientation ?? "horizontal"}\``);
        }

        return {
          name: property.name,
          summary: property.summary,
          doc: property.doc,
          optional: property.optional,
          type: property.type,
          defaultValue: property.defaultValue,
          attributes
        };
      }
    )
  };
}

function mapViewKitEnum(enumType: ViewKitEnum): MarkdownEnum
{
  return {
    name: enumType.name,
    summary: enumType.summary,
    doc: enumType.doc,
    members: enumType.members
  };
}

function renderViewKitGroup(title: string, models: readonly ViewKitModel[]): string
{
  return renderModels(title, models.map(mapViewKitModel));
}

export function generateViewKitMarkdown(spec: GrammarSpec): string
{
  const documentedModelNames = new Set<string>();
  const modelGroups = [
    { title: "Root models", models: spec.rootModels },
    { title: "UI elements", models: spec.uiElements },
    { title: "Action elements", models: spec.actionElements }
  ];
  const content = [
    "# ViewKit model reference",
    "",
    renderSummaryAndDoc({ summary: spec.namespaceSummary, doc: spec.namespaceDoc }),
    ""
  ];

  for (const group of modelGroups)
  {
    for (const model of group.models)
    {
      documentedModelNames.add(model.name);
    }
    content.push(renderViewKitGroup(group.title, group.models));
  }

  const supportingModels = spec.models.filter(
    (model): boolean =>
    {
      return !documentedModelNames.has(model.name) && !model.isDslIgnored;
    }
  );
  for (const model of supportingModels)
  {
    documentedModelNames.add(model.name);
  }
  content.push(renderViewKitGroup("Supporting models", supportingModels));
  content.push(renderEnums("Enums", spec.enums.map(mapViewKitEnum)));

  for (const root of spec.polymorphicRoots)
  {
    content.push(`## ${root.name} variants`, "");
    const description = renderSummaryAndDoc(root);
    if (description)
    {
      content.push(description, "");
    }
    content.push(`Discriminator property: \`${root.discriminatorProperty}\`.`, "");
    content.push("| Model | Discriminator value | Description |", "| --- | --- | --- |");
    for (const derivedModel of root.derivedModels)
    {
      content.push(
        `| [${derivedModel.name}](#${createAnchor(derivedModel.name)}) | \`${escapeMarkdownCell(derivedModel.discriminatorValue ?? "")}\` | ${escapeMarkdownCell(renderSummaryAndDoc(derivedModel))} |`
      );
    }
    content.push("");
  }

  return `${content.filter(Boolean).map((section): string => section.trim()).join("\n\n")}\n`;
}
