import {
  AiModelModality,
  CaptionInstruction,
  EligibleTagsInstruction,
  EmbeddingInstruction,
  ExtensionAiModel,
  TagsPlaceholder
} from "@picteus/ws-client";


const TAGS_PLACEHOLDER = TagsPlaceholder.Tags;

const DEFAULT_CAPTION_QUESTION =
  "Describe in detail what you see in this image. Do not output Markdown but plain text.";

const DEFAULT_ELIGIBLE_TAGS_QUESTION =
  `Pick the tags that best fit the image from this list: ${TAGS_PLACEHOLDER}.`;

const DEFAULT_ELIGIBLE_TAGS: readonly string[] = [
  "animal",
  "insect",
  "mammal",
  "vegetal",
  "mineral",
  "architecture",
  "food",
  "landscape",
  "portrait",
  "vehicle",
  "art",
  "fashion"
] as const;

const QUESTION_CHARACTERS_MAXIMUM = 1_024;

export type AiModelInstructionFormEntryType =
  {
    readonly technicalId: string;
    readonly name: string;
    readonly comment?: string;
    readonly modalities?: AiModelModality[];
    captionEnabled: boolean;
    captionIsAuto: boolean;
    captionQuestion: string;
    eligibleTagsEnabled: boolean;
    eligibleTagsIsAuto: boolean;
    eligibleTagsQuestion: string;
    eligibleTags: string[];
    embeddingEnabled: boolean;
    embeddingIsAuto: boolean;
  };

type ModelSupportedCapabilitiesType =
  {
    readonly supportsCaptions: boolean;
    readonly supportsEligibleTags: boolean;
    readonly supportsEmbeddings: boolean;
  };

type EligibleTagsQuestionErrorKindType = "empty" | "missingPlaceholder" | undefined;

type ConfiguredInstructionModelsSummaryType =
  {
    readonly configuredIds: ReadonlySet<string>;
    readonly autoIds: ReadonlySet<string>;
  };

function modelSupportsModality(
  modalities: readonly AiModelModality[] | undefined,
  modality: AiModelModality
): boolean
{
  return modalities === undefined || modalities.length === 0 || modalities.includes(modality);
}

function getModelSupportedCapabilities(
  modalities: readonly AiModelModality[] | undefined,
  capabilities: {
    readonly hasCaptionCapability: boolean;
    readonly hasEligibleTagsCapability: boolean;
    readonly hasEmbeddingsCapability: boolean;
  }
): ModelSupportedCapabilitiesType
{
  return {
    supportsCaptions: capabilities.hasCaptionCapability === true &&
      modelSupportsModality(modalities, AiModelModality.ImageCaptions),
    supportsEligibleTags: capabilities.hasEligibleTagsCapability === true &&
      modelSupportsModality(modalities, AiModelModality.ImageEligibleTags),
    supportsEmbeddings: capabilities.hasEmbeddingsCapability === true &&
      modelSupportsModality(modalities, AiModelModality.ImageEmbeddings)
  };
}

function buildModelInstructionEntries(
  extensionModels: readonly ExtensionAiModel[],
  captionInstructions: readonly CaptionInstruction[],
  eligibleTagsInstructions: readonly EligibleTagsInstruction[],
  embeddingInstructions: readonly EmbeddingInstruction[]
): AiModelInstructionFormEntryType[]
{
  const captionMap = new Map<string, CaptionInstruction>(
    captionInstructions.map(instruction => [ instruction.aiModelTechnicalId, instruction ])
  );
  const tagsMap = new Map<string, EligibleTagsInstruction>(
    eligibleTagsInstructions.map(instruction => [ instruction.aiModelTechnicalId, instruction ])
  );
  const embeddingMap = new Map<string, EmbeddingInstruction>(
    embeddingInstructions.map(instruction => [ instruction.aiModelTechnicalId, instruction ])
  );

  const configuredModels = extensionModels.filter(model =>
    captionMap.has(model.technicalId) || tagsMap.has(model.technicalId) || embeddingMap.has(model.technicalId)
  );

  return configuredModels.map(model =>
  {
    const captionInstruction = captionMap.get(model.technicalId);
    const tagsInstruction = tagsMap.get(model.technicalId);
    const embeddingInstruction = embeddingMap.get(model.technicalId);

    return {
      technicalId: model.technicalId,
      name: model.name,
      comment: model.comment,
      modalities: model.modalities,
      captionEnabled: captionInstruction?.enabled ?? false,
      captionIsAuto: captionInstruction?.isAuto ?? false,
      captionQuestion: captionInstruction?.question ?? DEFAULT_CAPTION_QUESTION,
      eligibleTagsEnabled: tagsInstruction?.enabled ?? false,
      eligibleTagsIsAuto: tagsInstruction?.isAuto ?? false,
      eligibleTagsQuestion: tagsInstruction?.question ?? DEFAULT_ELIGIBLE_TAGS_QUESTION,
      eligibleTags: tagsInstruction?.tags ? [ ...tagsInstruction.tags ] : [ ...DEFAULT_ELIGIBLE_TAGS ],
      embeddingEnabled: embeddingInstruction?.enabled ?? false,
      embeddingIsAuto: embeddingInstruction?.isAuto ?? false
    };
  });
}

function cloneInstructionEntries(
  entries: readonly AiModelInstructionFormEntryType[]
): AiModelInstructionFormEntryType[]
{
  return entries.map(entry => ({
    ...entry,
    eligibleTags: [ ...entry.eligibleTags ]
  }));
}

function countInstructionChanges(
  currentEntries: readonly AiModelInstructionFormEntryType[],
  initialEntries: readonly AiModelInstructionFormEntryType[],
  hasCaptionCapability: boolean,
  hasEligibleTagsCapability: boolean,
  hasEmbeddingsCapability: boolean
): number
{
  const initialMap = new Map<string, AiModelInstructionFormEntryType>(
    initialEntries.map(entry => [ entry.technicalId, entry ])
  );
  const currentMap = new Map<string, AiModelInstructionFormEntryType>(
    currentEntries.map(entry => [ entry.technicalId, entry ])
  );

  let changes = 0;

  for (const initial of initialEntries)
  {
    if (currentMap.has(initial.technicalId) === false)
    {
      changes += 1;
    }
  }

  for (const current of currentEntries)
  {
    const initial = initialMap.get(current.technicalId);
    if (initial === undefined)
    {
      changes += 1;
      continue;
    }
    if (hasCaptionCapability === true)
    {
      if (current.captionEnabled !== initial.captionEnabled)
      {
        changes += 1;
      }
      if (current.captionIsAuto !== initial.captionIsAuto)
      {
        changes += 1;
      }
      if (current.captionQuestion !== initial.captionQuestion)
      {
        changes += 1;
      }
    }
    if (hasEligibleTagsCapability === true)
    {
      if (current.eligibleTagsEnabled !== initial.eligibleTagsEnabled)
      {
        changes += 1;
      }
      if (current.eligibleTagsIsAuto !== initial.eligibleTagsIsAuto)
      {
        changes += 1;
      }
      if (current.eligibleTagsQuestion !== initial.eligibleTagsQuestion)
      {
        changes += 1;
      }
      if (
        current.eligibleTags.length !== initial.eligibleTags.length ||
        current.eligibleTags.some((tag, index) => tag !== initial.eligibleTags[index])
      )
      {
        changes += 1;
      }
    }
    if (hasEmbeddingsCapability === true)
    {
      if (current.embeddingEnabled !== initial.embeddingEnabled)
      {
        changes += 1;
      }
      if (current.embeddingIsAuto !== initial.embeddingIsAuto)
      {
        changes += 1;
      }
    }
  }

  return changes;
}

function areInstructionEntriesValid(
  entries: readonly AiModelInstructionFormEntryType[],
  hasEligibleTagsCapability: boolean
): boolean
{
  for (const entry of entries)
  {
    if (entry.captionEnabled === true && entry.captionQuestion.trim().length === 0)
    {
      return false;
    }
    if (
      hasEligibleTagsCapability === true &&
      entry.eligibleTagsEnabled === true &&
      (entry.eligibleTagsQuestion.trim().length === 0 || entry.eligibleTagsQuestion.includes(TAGS_PLACEHOLDER) === false)
    )
    {
      return false;
    }
  }
  return true;
}

function validateEligibleTagsQuestion(
  question: string,
  isEnabled: boolean
): EligibleTagsQuestionErrorKindType
{
  if (isEnabled === false)
  {
    return undefined;
  }
  if (question.trim().length === 0)
  {
    return "empty";
  }
  if (question.includes(TAGS_PLACEHOLDER) === false)
  {
    return "missingPlaceholder";
  }
  return undefined;
}

function collectConfiguredInstructionModels(
  instructionsData:
    | {
      readonly captionInstructions: readonly CaptionInstruction[];
      readonly eligibleTagsInstructions: readonly EligibleTagsInstruction[];
      readonly embeddingInstructions: readonly EmbeddingInstruction[];
    }
    | undefined
): ConfiguredInstructionModelsSummaryType
{
  const configuredIds = new Set<string>();
  const autoIds = new Set<string>();

  if (instructionsData === undefined)
  {
    return { configuredIds, autoIds };
  }

  const allInstructions: readonly { readonly aiModelTechnicalId: string; readonly enabled: boolean; readonly isAuto: boolean }[] = [
    ...instructionsData.captionInstructions,
    ...instructionsData.eligibleTagsInstructions,
    ...instructionsData.embeddingInstructions
  ];

  for (const instruction of allInstructions)
  {
    configuredIds.add(instruction.aiModelTechnicalId);
    if (instruction.enabled === true && instruction.isAuto === true)
    {
      autoIds.add(instruction.aiModelTechnicalId);
    }
  }

  return { configuredIds, autoIds };
}

export default {
  TAGS_PLACEHOLDER,
  DEFAULT_CAPTION_QUESTION,
  DEFAULT_ELIGIBLE_TAGS_QUESTION,
  DEFAULT_ELIGIBLE_TAGS,
  QUESTION_CHARACTERS_MAXIMUM,
  modelSupportsModality,
  getModelSupportedCapabilities,
  buildModelInstructionEntries,
  cloneInstructionEntries,
  countInstructionChanges,
  areInstructionEntriesValid,
  validateEligibleTagsQuestion,
  collectConfiguredInstructionModels
};
