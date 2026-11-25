import { TFunction } from "i18next";
import {
  CaptionInstruction,
  EligibleTagsInstruction,
  EmbeddingInstruction,
  Extension,
  ExtensionActivity,
  ExtensionActivityState,
  ExtensionAiModel,
  ExtensionAndManual,
  ExtensionApi,
  ExtensionApiExtensionChangeStateRequest,
  ExtensionApiExtensionGenerateRequest,
  ExtensionApiExtensionGetCaptionInstructionsRequest,
  ExtensionApiExtensionGetEligibleTagsInstructionsRequest,
  ExtensionApiExtensionGetEmbeddingInstructionsRequest,
  ExtensionApiExtensionGetRequest,
  ExtensionApiExtensionGetSettingsRequest,
  ExtensionApiExtensionInstallRequest,
  ExtensionApiExtensionResetSettingsRequest,
  ExtensionApiExtensionRunImageCommandRequest,
  ExtensionApiExtensionRunProcessCommandRequest,
  ExtensionApiExtensionSetCaptionInstructionsRequest,
  ExtensionApiExtensionSetEligibleTagsInstructionsRequest,
  ExtensionApiExtensionSetEmbeddingInstructionsRequest,
  ExtensionApiExtensionSetSettingsRequest,
  ExtensionApiExtensionSynchronizeRequest,
  ExtensionApiExtensionUninstallRequest,
  ExtensionApiExtensionUpdateRequest,
  ExtensionCategory,
  ExtensionsConfiguration,
  ExtensionSettings,
  ExtensionState,
  Manifest,
  ManifestCapability,
  ManifestCapabilityId,
  ManifestExtensionCommand,
  ManifestExtensionCommandSpecification,
  ManifestImageFeaturesCapability,
  ManifestImageTagsCapability,
  MarketplaceExtension
} from "@picteus/ws-client";

import { ExtensionsSortCriterionType, ManualSection } from "types";
import { BASE_PATH, extractMarkdownParagraph, isPlainRecord } from "utils";


const extensionApi = new ExtensionApi();

async function fetchAll(): Promise<{
  extensions: Extension[];
  extensionsConfiguration: ExtensionsConfiguration;
}>
{
  const extensions = await extensionApi.extensionList();
  const extensionsConfiguration = await extensionApi.extensionGetConfiguration();
  return { extensions, extensionsConfiguration };
}

async function get(parameters: ExtensionApiExtensionGetRequest): Promise<ExtensionAndManual>
{
  return extensionApi.extensionGet(parameters);
}

async function install(parameters: ExtensionApiExtensionInstallRequest): Promise<Extension>
{
  return extensionApi.extensionInstall(parameters);
}

async function startOrStop(parameters: ExtensionApiExtensionChangeStateRequest): Promise<void>
{
  return extensionApi.extensionChangeState(parameters);
}

async function update(parameters: ExtensionApiExtensionUpdateRequest): Promise<Extension>
{
  return extensionApi.extensionUpdate(parameters);
}

async function uninstall(parameters: ExtensionApiExtensionUninstallRequest): Promise<void>
{
  return extensionApi.extensionUninstall(parameters);
}

async function getSettings(parameters: ExtensionApiExtensionGetSettingsRequest): Promise<ExtensionSettings>
{
  return extensionApi.extensionGetSettings(parameters);
}

async function setSettings(parameters: ExtensionApiExtensionSetSettingsRequest): Promise<void>
{
  return extensionApi.extensionSetSettings(parameters);
}

async function resetSettings(parameters: ExtensionApiExtensionResetSettingsRequest): Promise<ExtensionSettings>
{
  return extensionApi.extensionResetSettings(parameters);
}

async function activities(): Promise<ExtensionActivity[]>
{
  return extensionApi.extensionActivities();
}

async function runImageCommand(parameters: ExtensionApiExtensionRunImageCommandRequest): Promise<void>
{
  return extensionApi.extensionRunImageCommand(parameters);
}

async function runProcessCommand(parameters: ExtensionApiExtensionRunProcessCommandRequest): Promise<void>
{
  return extensionApi.extensionRunProcessCommand(parameters);
}

async function synchronize(requestParameters: ExtensionApiExtensionSynchronizeRequest): Promise<void>
{
  return extensionApi.extensionSynchronize(requestParameters);
}

async function generate(parameters: ExtensionApiExtensionGenerateRequest): Promise<Blob>
{
  return extensionApi.extensionGenerate(parameters);
}

async function listAiModels(): Promise<ExtensionAiModel[]>
{
  return extensionApi.extensionListAiModels();
}

async function getCaptionInstructions(parameters: ExtensionApiExtensionGetCaptionInstructionsRequest): Promise<CaptionInstruction[]>
{
  return extensionApi.extensionGetCaptionInstructions(parameters);
}

async function setCaptionInstructions(parameters: ExtensionApiExtensionSetCaptionInstructionsRequest): Promise<CaptionInstruction[]>
{
  return extensionApi.extensionSetCaptionInstructions(parameters);
}

async function getEligibleTagsInstructions(parameters: ExtensionApiExtensionGetEligibleTagsInstructionsRequest): Promise<EligibleTagsInstruction[]>
{
  return extensionApi.extensionGetEligibleTagsInstructions(parameters);
}

async function setEligibleTagsInstructions(parameters: ExtensionApiExtensionSetEligibleTagsInstructionsRequest): Promise<EligibleTagsInstruction[]>
{
  return extensionApi.extensionSetEligibleTagsInstructions(parameters);
}

async function getEmbeddingInstructions(parameters: ExtensionApiExtensionGetEmbeddingInstructionsRequest): Promise<EmbeddingInstruction[]>
{
  return extensionApi.extensionGetEmbeddingInstructions(parameters);
}

async function setEmbeddingInstructions(parameters: ExtensionApiExtensionSetEmbeddingInstructionsRequest): Promise<EmbeddingInstruction[]>
{
  return extensionApi.extensionSetEmbeddingInstructions(parameters);
}

function buildUiURL(extensionId: string, url: string): string
{
  return `${BASE_PATH}/ui/extension/${extensionId}${url}`;
}

function getIconURL(extensionIdOrExtension: string | Extension): string
{
  return buildUiURL(typeof extensionIdOrExtension === "string" ? extensionIdOrExtension : (extensionIdOrExtension as Extension).manifest.id, "/icon");
}

function getCommandIconURL(extensionId: string, uri: string): string
{
  return buildUiURL(extensionId, uri);
}

export const synchronizationCapabilityIds: ManifestCapabilityId[] =
  [
    ManifestCapabilityId.ImageTags,
    ManifestCapabilityId.ImageFeatures,
    ManifestCapabilityId.ImageEmbeddings
  ];

export type EligibleExtensionType = {
  readonly extension: Extension;
  readonly capabilities: ManifestCapability[];
};

function computeCapabilities(
  extension?: Extension,
  targetCapabilityIds: ManifestCapabilityId[] = synchronizationCapabilityIds
): ManifestCapability[]
{
  if (extension === undefined)
  {
    return [];
  }

  // We gather the capabilities the extension declares, deduplicated and kept in the canonical order
  const capabilitiesById = new Map<string, ManifestCapability>();
  for (const instructions of extension.manifest.instructions)
  {
    for (const capability of instructions.capabilities ?? [])
    {
      if (targetCapabilityIds.indexOf(capability.id) !== -1)
      {
        capabilitiesById.set(capability.id, capability);
      }
    }
  }
  return targetCapabilityIds
    .map((capabilityId) => capabilitiesById.get(capabilityId))
    .filter((capability): capability is ManifestCapability => capability !== undefined);
}

function computeEligibleExtensions(
  extensions?: Extension[],
  extensionsConfiguration?: ExtensionsConfiguration,
  capabilityIds: ManifestCapabilityId[] = synchronizationCapabilityIds
): EligibleExtensionType[]
{
  if (extensions === undefined || extensionsConfiguration === undefined)
  {
    return [];
  }

  // We gather, per extension, the capabilities it supports, keeping the canonical capability order
  const capabilitiesByExtensionId = new Map<string, ManifestCapability[]>();
  for (const capabilityId of capabilityIds)
  {
    const configurationCapability = extensionsConfiguration.capabilities.find((entity) => entity.capability.id === capabilityId);
    if (configurationCapability === undefined)
    {
      continue;
    }
    for (const extensionId of configurationCapability.extensionIds)
    {
      const capabilities = capabilitiesByExtensionId.get(extensionId) ?? [];
      capabilities.push(configurationCapability.capability);
      capabilitiesByExtensionId.set(extensionId, capabilities);
    }
  }

  return extensions
    .filter((extension) => extension.state === ExtensionState.Enabled && capabilitiesByExtensionId.has(extension.manifest.id))
    .sort((first, second) => first.manifest.name.localeCompare(second.manifest.name))
    .map((extension) => (
      {
        extension,
        capabilities: capabilitiesByExtensionId.get(extension.manifest.id) ?? []
      }
    ));
}

export type ExtensionInstructionCapabilitiesType =
  {
    readonly hasCaptionCapability: boolean;
    readonly hasEligibleTagsCapability: boolean;
    readonly hasEmbeddingsCapability: boolean;
    readonly hasAnyInstructionCapability: boolean;
  };

function computeInstructionCapabilities(extension?: Extension): ExtensionInstructionCapabilitiesType
{
  if (extension === undefined)
  {
    return {
      hasCaptionCapability: false,
      hasEligibleTagsCapability: false,
      hasEmbeddingsCapability: false,
      hasAnyInstructionCapability: false
    };
  }

  let hasCaptionCapability = false;
  let hasEligibleTagsCapability = false;
  let hasEmbeddingsCapability = false;
  for (const instructions of extension.manifest.instructions)
  {
    if (instructions.capabilities !== undefined)
    {
      for (const capability of instructions.capabilities)
      {
        if (capability.id === ManifestCapabilityId.ImageFeatures)
        {
          const featureDetails = (capability as ManifestImageFeaturesCapability).details;
          if (featureDetails !== undefined && featureDetails.caption !== false)
          {
            hasCaptionCapability = true;
          }
        }
        else if (capability.id === ManifestCapabilityId.ImageTags)
        {
          const tagDetails = (capability as ManifestImageTagsCapability).details;
          if (tagDetails !== undefined && tagDetails.eligibleTags !== false)
          {
            hasEligibleTagsCapability = true;
          }
        }
        else if (capability.id === ManifestCapabilityId.ImageEmbeddings)
        {
          hasEmbeddingsCapability = true;
        }
      }
    }
  }
  return {
    hasCaptionCapability,
    hasEligibleTagsCapability,
    hasEmbeddingsCapability,
    hasAnyInstructionCapability: hasCaptionCapability || hasEligibleTagsCapability || hasEmbeddingsCapability
  };
}

export type CommandManualSectionsType =
  {
    readonly summary: string | undefined;
    readonly details: string | undefined;
    readonly full: string | undefined;
  };

function extractManifestCommands(manifest: Manifest): ManifestExtensionCommand[]
{
  const commandsById = new Map<string, ManifestExtensionCommand>();
  for (const instructions of manifest.instructions ?? [])
  {
    for (const command of instructions.commands ?? [])
    {
      if (commandsById.has(command.id) === false)
      {
        commandsById.set(command.id, command);
      }
    }
  }
  return Array.from(commandsById.values());
}

function findCommandSpecification(
  specifications: ManifestExtensionCommandSpecification[],
  language: string
): ManifestExtensionCommandSpecification | undefined
{
  const baseLocale = language.split("-")[0];
  return (
    specifications.find(specification => specification.locale === language) ??
    specifications.find(specification => specification.locale === baseLocale) ??
    specifications.find(specification => specification.locale === "en") ??
    specifications[0]
  );
}

function findManifestCommandSpecification(
  manifest: Manifest | undefined,
  commandId: string | undefined,
  language: string
): ManifestExtensionCommandSpecification | undefined
{
  if (manifest === undefined || commandId === undefined)
  {
    return undefined;
  }
  const manifestCommand = extractManifestCommands(manifest).find(
    (candidateCommand) => candidateCommand.id === commandId
  );
  if (manifestCommand === undefined)
  {
    return undefined;
  }
  return findCommandSpecification(manifestCommand.specifications, language);
}

function resolveCommandLabel(
  commandId: string | undefined,
  specification?: ManifestExtensionCommandSpecification,
  explicitLabel?: string
): string
{
  return explicitLabel?.trim() || specification?.label?.trim() || commandId || "";
}

function extractCommandManualSections(
  manualInstructions: string | undefined,
  commandId: string | undefined
): CommandManualSectionsType
{
  if (commandId === undefined || manualInstructions === undefined || manualInstructions.trim().length === 0)
  {
    return {
      summary: undefined,
      details: undefined,
      full: undefined
    };
  }

  const summary = extractMarkdownParagraph(manualInstructions, [ ManualSection.Commands, commandId ], false)?.trim();
  const details = extractMarkdownParagraph(manualInstructions, [ ManualSection.Commands, commandId, "Details" ], true)?.trim();
  const full = extractMarkdownParagraph(manualInstructions, [ ManualSection.Commands, commandId ], true)?.trim();

  return {
    summary: summary !== undefined && summary.length > 0 ? summary : undefined,
    details: details !== undefined && details.length > 0 ? details : undefined,
    full: full !== undefined && full.length > 0 ? full : undefined
  };
}

export type ExtensionDerivedStatusType =
  | "running"
  | "starting"
  | "paused"
  | "error"
  | "notInstalled"
  | "installing"
  | "updating";

export type ExtensionFilterableStatusType = "running" | "starting" | "paused" | "error";

export type UnifiedExtensionItemType = {
  readonly id: string;
  readonly manifest: Manifest;
  readonly extension?: Extension;
  readonly marketplaceExtension?: MarketplaceExtension;
  readonly activity?: ExtensionActivity;
  readonly isInstalled: boolean;
  readonly status: ExtensionDerivedStatusType;
  readonly availableUpdateVersion?: string;
};

export const allExtensionCategories: readonly ExtensionCategory[] = Object.values(ExtensionCategory);

export const filterableExtensionStatuses: readonly ExtensionFilterableStatusType[] = [
  "running",
  "starting",
  "paused",
  "error"
] as const;

const statusSortOrder: Record<ExtensionDerivedStatusType, number> = {
  error: 0,
  updating: 1,
  installing: 2,
  starting: 3,
  running: 4,
  paused: 5,
  notInstalled: 6
};

function deriveStatus(
  extension: Extension | undefined,
  activity: ExtensionActivity | undefined,
  isInstalling: boolean,
  isUpdating: boolean
): ExtensionDerivedStatusType
{
  if (isInstalling === true)
  {
    return "installing";
  }
  if (isUpdating === true)
  {
    return "updating";
  }
  if (extension === undefined)
  {
    return "notInstalled";
  }
  if (extension.state === ExtensionState.Paused)
  {
    return "paused";
  }
  if (activity?.isInError === true)
  {
    return "error";
  }
  if (
    activity !== undefined &&
    activity.process === ExtensionActivityState.Started &&
    activity.connection === ExtensionActivityState.Started
  )
  {
    return "running";
  }
  return "starting";
}

function parseSemver(version: string): { core: number[]; prerelease: string[] }
{
  const sanitized = version.trim().replace(/^v/i, "").split("+")[0];
  const [ corePart, ...prereleaseParts ] = sanitized.split("-");
  const core = corePart.split(".").map(segment =>
  {
    const parsed = Number.parseInt(segment, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  });
  const prerelease = prereleaseParts.length > 0 ? prereleaseParts.join("-").split(".") : [];
  return { core, prerelease };
}

function compareSemver(versionA: string, versionB: string): number
{
  const parsedA = parseSemver(versionA);
  const parsedB = parseSemver(versionB);
  const maxLength = Math.max(parsedA.core.length, parsedB.core.length);

  for (let index = 0; index < maxLength; index++)
  {
    const partA = parsedA.core[index] ?? 0;
    const partB = parsedB.core[index] ?? 0;
    if (partA !== partB)
    {
      return partA > partB ? 1 : -1;
    }
  }

  // A release version has higher precedence than a prerelease with the same core numbers
  const hasPrereleaseA = parsedA.prerelease.length > 0;
  const hasPrereleaseB = parsedB.prerelease.length > 0;
  if (hasPrereleaseA === false && hasPrereleaseB === false)
  {
    return 0;
  }
  if (hasPrereleaseA === false)
  {
    return 1;
  }
  if (hasPrereleaseB === false)
  {
    return -1;
  }

  const maxPreLength = Math.max(parsedA.prerelease.length, parsedB.prerelease.length);
  for (let index = 0; index < maxPreLength; index++)
  {
    const preA = parsedA.prerelease[index];
    const preB = parsedB.prerelease[index];
    if (preA === undefined)
    {
      return -1;
    }
    if (preB === undefined)
    {
      return 1;
    }
    if (preA === preB)
    {
      continue;
    }
    const isNumericA = /^\d+$/.test(preA);
    const isNumericB = /^\d+$/.test(preB);
    if (isNumericA === true && isNumericB === true)
    {
      return Number(preA) > Number(preB) ? 1 : -1;
    }
    if (isNumericA === true)
    {
      return -1;
    }
    if (isNumericB === true)
    {
      return 1;
    }
    return preA.localeCompare(preB);
  }

  return 0;
}

function findMarketplaceUpdateVersion(
  extension: Extension | undefined,
  marketplaceExtension: MarketplaceExtension | undefined
): string | undefined
{
  if (extension === undefined || marketplaceExtension === undefined)
  {
    return undefined;
  }
  return compareSemver(marketplaceExtension.manifest.version, extension.manifest.version) > 0
    ? marketplaceExtension.manifest.version
    : undefined;
}

function matchesSearch(manifest: Manifest, normalizedSearch: string): boolean
{
  if (normalizedSearch.length === 0)
  {
    return true;
  }
  const searchableFields = [
    manifest.id,
    manifest.name,
    manifest.description,
    manifest.author ?? ""
  ];
  return searchableFields.some(field => field.toLowerCase().includes(normalizedSearch));
}

function compareItems(
  firstItem: UnifiedExtensionItemType,
  secondItem: UnifiedExtensionItemType,
  sortCriterion: ExtensionsSortCriterionType,
  isSortAscending: boolean
): number
{
  const direction = isSortAscending === true ? 1 : -1;
  if (sortCriterion === "status")
  {
    const statusDelta = statusSortOrder[firstItem.status] - statusSortOrder[secondItem.status];
    if (statusDelta !== 0)
    {
      return direction * statusDelta;
    }
    return firstItem.manifest.name.localeCompare(secondItem.manifest.name);
  }
  return direction * firstItem.manifest.name.localeCompare(secondItem.manifest.name);
}

const settingsPropertiesKey = "properties";

function hasSettings(extension: Extension): boolean
{
  const settingsProperties = extension.manifest.settings?.[settingsPropertiesKey];
  return settingsProperties !== undefined && Object.keys(settingsProperties).length > 0;
}

function hasMissingRequiredSettings(manifest: Manifest, settingsValue: unknown): boolean
{
  const schema = manifest.settings as { required?: unknown } | undefined;
  const requiredFields = schema?.required;
  if (Array.isArray(requiredFields) === false || requiredFields.length === 0)
  {
    return false;
  }

  const record = isPlainRecord(settingsValue) === true
    ? settingsValue
    : undefined;

  for (const fieldKey of requiredFields)
  {
    if (typeof fieldKey !== "string")
    {
      continue;
    }
    const fieldValue = record?.[fieldKey];
    if (fieldValue === undefined || fieldValue === null)
    {
      return true;
    }
    if (typeof fieldValue === "string" && fieldValue.trim().length === 0)
    {
      return true;
    }
  }

  return false;
}

function hasSynchronizationCapabilities(extension: Extension): boolean
{
  return computeCapabilities(extension).length > 0;
}

function formatExtensionSubtitle(manifest: Manifest, t: TFunction): string
{
  const author = manifest.author?.trim();
  return author !== undefined && author.length > 0
    ? t("extension.byAuthorVersion", { author, version: manifest.version })
    : t("extension.versionOnly", { version: manifest.version });
}

export default {
  synchronizationCapabilityIds,
  allExtensionCategories,
  filterableExtensionStatuses,
  computeCapabilities,
  computeEligibleExtensions,
  computeInstructionCapabilities,
  extractManifestCommands,
  findCommandSpecification,
  findManifestCommandSpecification,
  resolveCommandLabel,
  extractCommandManualSections,
  formatExtensionSubtitle,
  deriveStatus,
  findMarketplaceUpdateVersion,
  matchesSearch,
  compareItems,
  hasSettings,
  hasMissingRequiredSettings,
  hasSynchronizationCapabilities,
  fetchAll,
  get,
  install,
  buildUiURL,
  getIconURL,
  getCommandIconURL,
  update,
  uninstall,
  synchronize,
  generate,
  startOrStop,
  getSettings,
  setSettings,
  resetSettings,
  listAiModels,
  getCaptionInstructions,
  setCaptionInstructions,
  getEligibleTagsInstructions,
  setEligibleTagsInstructions,
  getEmbeddingInstructions,
  setEmbeddingInstructions,
  runImageCommand,
  runProcessCommand,
  activities
};
