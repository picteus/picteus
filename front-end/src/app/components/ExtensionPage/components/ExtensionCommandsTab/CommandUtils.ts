import { CommandEntity, ManifestExtensionCommand } from "@picteus/ws-client";

import { isPlainRecord } from "utils";
import { ExtensionsService } from "app/services";


export type CommandScopeFilterType = "all" | CommandEntity;

const COMMAND_ENTITY_ORDER: readonly CommandEntity[] = [
  CommandEntity.Process,
  CommandEntity.Image,
  CommandEntity.Images
] as const;

export type ResolvedCommandItemType =
  {
    readonly command: ManifestExtensionCommand;
    readonly entity: CommandEntity;
    readonly label: string;
    readonly name: string | undefined;
    readonly description: string | undefined;
    readonly parameterLabels: readonly string[];
    readonly parameterKeys: readonly string[];
    readonly manualMarkdown: string | undefined;
  };

export type CommandGroupType =
  {
    readonly entity: CommandEntity;
    readonly items: readonly ResolvedCommandItemType[];
  };

function extractCommandParameterMetadata(
  command: ManifestExtensionCommand,
  formatOptionalLabel: (name: string) => string
): { readonly labels: readonly string[]; readonly keys: readonly string[] }
{
  const parameters = command.parameters as {
    readonly properties?: unknown;
    readonly required?: unknown;
  } | undefined;

  if (parameters === undefined || isPlainRecord(parameters.properties) === false)
  {
    return { labels: [], keys: [] };
  }

  const requiredKeys = new Set<string>(
    Array.isArray(parameters.required) === true
      ? parameters.required.filter((item): item is string => typeof item === "string")
      : []
  );

  const labels: string[] = [];
  const keys: string[] = [];
  const entries = Object.entries(parameters.properties);

  for (const [ propertyKey, rawProperty ] of entries)
  {
    keys.push(propertyKey);
    const propertyRecord = isPlainRecord(rawProperty) === true
      ? rawProperty as { readonly title?: unknown }
      : undefined;
    const rawTitle = typeof propertyRecord?.title === "string" ? propertyRecord.title.trim() : "";
    const displayName = rawTitle.length > 0 ? rawTitle : propertyKey;
    labels.push(requiredKeys.has(propertyKey) === true ? displayName : formatOptionalLabel(displayName));
  }

  return { labels, keys };
}

export function resolveCommandItems(
  commands: readonly ManifestExtensionCommand[],
  language: string,
  manualMarkdown: string | undefined,
  formatOptionalLabel: (name: string) => string
): ResolvedCommandItemType[]
{
  return commands.map(command =>
  {
    const specification = ExtensionsService.findCommandSpecification(command.specifications ?? [], language);
    const trimmedName = specification?.name?.trim() ?? "";
    const trimmedDescription = specification?.description?.trim() ?? "";
    const manualSections = ExtensionsService.extractCommandManualSections(manualMarkdown, command.id);
    const { labels, keys } = extractCommandParameterMetadata(command, formatOptionalLabel);

    return {
      command,
      entity: command.on.entity,
      label: ExtensionsService.resolveCommandLabel(command.id, specification),
      name: trimmedName.length > 0 ? trimmedName : undefined,
      description: trimmedDescription.length > 0 ? trimmedDescription : manualSections.summary,
      parameterLabels: labels,
      parameterKeys: keys,
      manualMarkdown: manualSections.full
    };
  });
}

export function collectAvailableScopes(items: readonly ResolvedCommandItemType[]): CommandEntity[]
{
  const presentScopes = new Set<CommandEntity>(items.map(item => item.entity));
  return COMMAND_ENTITY_ORDER.filter(entity => presentScopes.has(entity) === true);
}

function matchesCommandSearch(
  item: ResolvedCommandItemType,
  normalizedQuery: string
): boolean
{
  if (normalizedQuery.length === 0)
  {
    return true;
  }

  const searchableFields: string[] = [
    item.command.id,
    item.label,
    item.name ?? "",
    item.description ?? "",
    ...item.parameterLabels,
    ...item.parameterKeys
  ];

  return searchableFields.some(field => field.toLowerCase().includes(normalizedQuery));
}

export function filterAndGroupCommands(
  items: readonly ResolvedCommandItemType[],
  searchQuery: string,
  selectedScope: CommandScopeFilterType
): CommandGroupType[]
{
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = items.filter(item =>
  {
    if (selectedScope !== "all" && item.entity !== selectedScope)
    {
      return false;
    }
    return matchesCommandSearch(item, normalizedQuery);
  });

  const groups: CommandGroupType[] = [];
  for (const entity of COMMAND_ENTITY_ORDER)
  {
    const groupItems = filteredItems
      .filter(item => item.entity === entity)
      .sort((firstItem, secondItem) =>
      {
        const labelDelta = firstItem.label.localeCompare(secondItem.label);
        if (labelDelta !== 0)
        {
          return labelDelta;
        }
        return firstItem.command.id.localeCompare(secondItem.command.id);
      });

    if (groupItems.length > 0)
    {
      groups.push({ entity, items: groupItems });
    }
  }

  return groups;
}
