import React, {
  ForwardedRef,
  forwardRef,
  ReactElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput
} from "@mantine/core";
import { IconCopy, IconInfoCircle, IconPlus, IconSearch } from "@tabler/icons-react";

import {
  CaptionInstruction,
  EligibleTagsInstruction,
  Extension,
  ExtensionAiModel,
  TagsPlaceholder
} from "@picteus/ws-client";

import { ToastService } from "utils";
import { ExtensionsService } from "app/services";
import { Loader } from "app/components";
import ModelInstructionCard, {
  AiModelInstructionFormEntryType
} from "../ModelInstructionCard/ModelInstructionCard.tsx";


const tagsPlaceholder = TagsPlaceholder.Tags;

const defaultCaptionQuestion = "Describe in detail what you see in this image. Do not output Markdown but plain text.";

const defaultEligibleTags =
  [
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
  ];

export type ExtensionAiModelInstructionsRefType =
  {
    save: () => Promise<void>;
    readonly isDirty: boolean;
    readonly isValid: boolean;
  };

export type ExtensionAiModelInstructionsPropsType =
  {
    readonly extension: Extension;
    readonly hasCaptionCapability: boolean;
    readonly hasEligibleTagsCapability: boolean;
    readonly onValidityChange: (isValid: boolean) => void;
    readonly onDirtyChange: (isDirty: boolean) => void;
    readonly onLoadingChange: (isLoading: boolean) => void;
  };

function ExtensionAiModelInstructions(
  {
    extension,
    hasCaptionCapability,
    hasEligibleTagsCapability,
    onValidityChange,
    onDirtyChange,
    onLoadingChange
  }: ExtensionAiModelInstructionsPropsType,
  ref: ForwardedRef<ExtensionAiModelInstructionsRefType>
): ReactElement | null
{
  const [ t ] = useTranslation();

  const [ loading, setLoading ] = useState<boolean>(true);
  const [ saving, setSaving ] = useState<boolean>(false);
  const [ models, setModels ] = useState<ExtensionAiModel[]>([]);
  const [ entries, setEntries ] = useState<AiModelInstructionFormEntryType[]>([]);
  const initialEntriesRef = useRef<AiModelInstructionFormEntryType[]>([]);

  const [ searchQuery, setSearchQuery ] = useState<string>("");
  const [ batchCaptionQuestion, setBatchCaptionQuestion ] = useState<string>("");
  const [ batchEligibleTagsQuestion, setBatchEligibleTagsQuestion ] = useState<string>("");
  const [ batchEligibleTags, setBatchEligibleTags ] = useState<string[]>([]);

  async function load(): Promise<void>
  {
    setLoading(true);
    try
    {
      const [ allModels, captionInstructions, eligibleTagsInstructions ] = await Promise.all([
        ExtensionsService.listAiModels(),
        hasCaptionCapability ? ExtensionsService.getCaptionInstructions({ id: extension.manifest.id }) : Promise.resolve([]),
        hasEligibleTagsCapability ? ExtensionsService.getEligibleTagsInstructions({ id: extension.manifest.id }) : Promise.resolve([])
      ]);
      const extensionModels = allModels.filter((model) => model.extensionId === extension.manifest.id);
      setModels(extensionModels);
      const captionMap = new Map<string, CaptionInstruction>(captionInstructions.map((instruction) => [ instruction.aiModelTechnicalId, instruction ]));
      const tagsMap = new Map<string, EligibleTagsInstruction>(eligibleTagsInstructions.map((instruction) => [ instruction.aiModelTechnicalId, instruction ]));

      // We treat a model as configured if an instruction was previously persisted for it
      const configuredModels = extensionModels.filter((model) => captionMap.has(model.technicalId) || tagsMap.has(model.technicalId));

      const initialEntries: AiModelInstructionFormEntryType[] = configuredModels.map((model) =>
      {
        const captionInstruction = captionMap.get(model.technicalId);
        const tagsInstruction = tagsMap.get(model.technicalId);
        return {
          technicalId: model.technicalId,
          name: model.name,
          comment: model.comment,
          captionEnabled: captionInstruction?.enabled ?? false,
          captionIsAuto: captionInstruction?.isAuto ?? false,
          captionQuestion: captionInstruction?.question ?? defaultCaptionQuestion,
          eligibleTagsEnabled: tagsInstruction?.enabled ?? false,
          eligibleTagsIsAuto: tagsInstruction?.isAuto ?? false,
          eligibleTagsQuestion: tagsInstruction?.question ?? `Pick the tags that best fit the image from this list: ${tagsPlaceholder}.`,
          eligibleTags: tagsInstruction?.tags ? [ ...tagsInstruction.tags ] : defaultEligibleTags
        };
      });

      initialEntriesRef.current = initialEntries.map((entry) => (
        {
          ...entry,
          eligibleTags: [ ...entry.eligibleTags ]
        }
      ));
      setEntries(initialEntries);
    }
    catch (error)
    {
      ToastService.apiCallError(error);
    }
    finally
    {
      setLoading(false);
    }
  }

  useEffect(() =>
  {
    void load();
  }, [ extension.manifest.id ]);

  function handleEntryChange(updatedEntry: AiModelInstructionFormEntryType): void
  {
    setEntries((previousEntries) =>
    {
      return previousEntries.map((entry) =>
      {
        if (entry.technicalId === updatedEntry.technicalId)
        {
          return updatedEntry;
        }
        return entry;
      });
    });
  }

  function handleConfigureModel(model: ExtensionAiModel): void
  {
    const newEntry: AiModelInstructionFormEntryType =
      {
        technicalId: model.technicalId,
        name: model.name,
        comment: model.comment,
        captionEnabled: hasCaptionCapability,
        captionIsAuto: false,
        captionQuestion: batchCaptionQuestion.trim().length > 0 ? batchCaptionQuestion.trim() : defaultCaptionQuestion,
        eligibleTagsEnabled: hasEligibleTagsCapability,
        eligibleTagsIsAuto: false,
        eligibleTagsQuestion: batchEligibleTagsQuestion.trim().length > 0 ? batchEligibleTagsQuestion.trim() : `Pick the tags that best fit the image from this list: ${tagsPlaceholder}.`,
        eligibleTags: batchEligibleTags.length > 0 ? [ ...batchEligibleTags ] : [ ...defaultEligibleTags ]
      };
    setEntries((previousEntries) => [ ...previousEntries, newEntry ]);
  }

  function handleDeleteModel(technicalId: string): void
  {
    setEntries((previousEntries) =>
    {
      return previousEntries.filter((entry) => entry.technicalId !== technicalId);
    });
  }

  function handleApplyBatch(): void
  {
    setEntries((previousEntries) =>
    {
      return previousEntries.map((entry) =>
      {
        const updatedEntry = { ...entry };
        if (hasCaptionCapability && entry.captionEnabled && batchCaptionQuestion.trim().length > 0)
        {
          updatedEntry.captionQuestion = batchCaptionQuestion.trim();
        }
        if (hasEligibleTagsCapability && entry.eligibleTagsEnabled)
        {
          if (batchEligibleTagsQuestion.trim().length > 0)
          {
            updatedEntry.eligibleTagsQuestion = batchEligibleTagsQuestion.trim();
          }
          if (batchEligibleTags.length > 0)
          {
            updatedEntry.eligibleTags = [ ...batchEligibleTags ];
          }
        }
        return updatedEntry;
      });
    });
  }

  const unconfiguredModels = useMemo((): ExtensionAiModel[] =>
  {
    const configuredTechnicalIds = new Set<string>(entries.map((entry) => entry.technicalId));
    return models.filter((model) => configuredTechnicalIds.has(model.technicalId) === false);
  }, [ models, entries ]);

  const filteredUnconfiguredModels = useMemo((): ExtensionAiModel[] =>
  {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery.length === 0)
    {
      return unconfiguredModels;
    }
    return unconfiguredModels.filter((model) =>
    {
      const matchesName = model.name.toLowerCase().includes(trimmedQuery);
      const matchesId = model.technicalId.toLowerCase().includes(trimmedQuery);
      const matchesComment = model.comment ? model.comment.toLowerCase().includes(trimmedQuery) : false;
      return matchesName || matchesId || matchesComment;
    });
  }, [ unconfiguredModels, searchQuery ]);

  function computeIsDirty(currentEntries: AiModelInstructionFormEntryType[]): boolean
  {
    if (currentEntries.length !== initialEntriesRef.current.length)
    {
      return true;
    }

    const initialEntriesMap = new Map<string, AiModelInstructionFormEntryType>(
      initialEntriesRef.current.map((entry) => [ entry.technicalId, entry ])
    );

    for (const current of currentEntries)
    {
      const initial = initialEntriesMap.get(current.technicalId);
      if (!initial)
      {
        return true;
      }
      if (hasCaptionCapability)
      {
        if (current.captionEnabled !== initial.captionEnabled)
        {
          return true;
        }
        if (current.captionIsAuto !== initial.captionIsAuto)
        {
          return true;
        }
        if (current.captionQuestion !== initial.captionQuestion)
        {
          return true;
        }
      }
      if (hasEligibleTagsCapability)
      {
        if (current.eligibleTagsEnabled !== initial.eligibleTagsEnabled)
        {
          return true;
        }
        if (current.eligibleTagsIsAuto !== initial.eligibleTagsIsAuto)
        {
          return true;
        }
        if (current.eligibleTagsQuestion !== initial.eligibleTagsQuestion)
        {
          return true;
        }
        if (current.eligibleTags.length !== initial.eligibleTags.length)
        {
          return true;
        }
        for (let tagIndex = 0; tagIndex < current.eligibleTags.length; tagIndex += 1)
        {
          if (current.eligibleTags[tagIndex] !== initial.eligibleTags[tagIndex])
          {
            return true;
          }
        }
      }
    }
    return false;
  }

  const isValid = useMemo((): boolean =>
  {
    for (const entry of entries)
    {
      if (entry.captionEnabled && entry.captionQuestion.trim().length === 0)
      {
        return false;
      }
      if (hasEligibleTagsCapability && entry.eligibleTagsEnabled && entry.eligibleTagsQuestion.includes(tagsPlaceholder) === false)
      {
        return false;
      }
      if (entry.eligibleTagsEnabled && entry.eligibleTagsQuestion.trim().length === 0)
      {
        return false;
      }
    }
    return true;
  }, [ entries, hasEligibleTagsCapability ]);

  const isDirty = useMemo((): boolean => computeIsDirty(entries), [ entries, hasCaptionCapability, hasEligibleTagsCapability ]);

  useEffect(() => onValidityChange(isValid), [ isValid, onValidityChange ]);

  useEffect(() => onDirtyChange(isDirty), [ isDirty, onDirtyChange ]);

  useEffect(() => onLoadingChange(loading || saving), [ loading, saving, onLoadingChange ]);

  async function handleSave(): Promise<void>
  {
    if (!isValid)
    {
      return;
    }

    setSaving(true);
    try
    {
      const calls: Promise<unknown>[] = [];
      if (hasCaptionCapability)
      {
        const captionPayload: CaptionInstruction[] = entries.map((entry) => (
          {
            aiModelTechnicalId: entry.technicalId,
            enabled: entry.captionEnabled,
            isAuto: entry.captionIsAuto,
            question: entry.captionQuestion.trim()
          }
        ));
        calls.push(ExtensionsService.setCaptionInstructions({
            id: extension.manifest.id,
            captionInstruction: captionPayload
          })
        );
      }

      if (hasEligibleTagsCapability)
      {
        const tagsPayload: EligibleTagsInstruction[] = entries.map((entry) => (
          {
            aiModelTechnicalId: entry.technicalId,
            question: entry.eligibleTagsQuestion.trim(),
            enabled: entry.eligibleTagsEnabled,
            isAuto: entry.eligibleTagsIsAuto,
            tags: entry.eligibleTags
          }
        ));
        calls.push(
          ExtensionsService.setEligibleTagsInstructions({
            id: extension.manifest.id,
            eligibleTagsInstruction: tagsPayload
          })
        );
      }

      await Promise.all(calls);
      initialEntriesRef.current = entries.map((entry) => (
        {
          ...entry,
          eligibleTags: [ ...entry.eligibleTags ]
        }
      ));
    }
    finally
    {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, (): ExtensionAiModelInstructionsRefType =>
    ({
      save: handleSave,
      isDirty,
      isValid
    })
  );

  if (loading)
  {
    return <Loader/>;
  }

  if (models.length === 0)
  {
    return (
      <Alert icon={<IconInfoCircle/>} color="blue" mb="sm">
        {t("extensionConfiguration.instructions.noModels")}
      </Alert>
    );
  }

  const hasBatchContent =
    (hasCaptionCapability && batchCaptionQuestion.trim().length > 0) ||
    (hasEligibleTagsCapability && (batchEligibleTagsQuestion.trim().length > 0 || batchEligibleTags.length > 0));

  return (
    <Stack gap="md">
      <Accordion variant="separated" radius="md">
        <Accordion.Item value="batch">
          <Accordion.Control icon={<IconCopy size={16}/>}>
            <Text fw={500} size="sm">
              {t("extensionConfiguration.instructions.batchTitle")}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                {t("extensionConfiguration.instructions.batchDescription")}
              </Text>

              {hasCaptionCapability && (
                <Textarea
                  label={t("extensionConfiguration.instructions.commonCaptionQuestion")}
                  placeholder={t("extensionConfiguration.instructions.captionQuestionPlaceholder")}
                  value={batchCaptionQuestion}
                  onChange={(event) =>
                  {
                    setBatchCaptionQuestion(event.currentTarget.value);
                  }}
                  autosize
                  minRows={2}
                  maxRows={4}
                />
              )}

              {hasEligibleTagsCapability && (
                <>
                  <Textarea
                    label={t("extensionConfiguration.instructions.commonEligibleTagsQuestion", { tags: tagsPlaceholder })}
                    placeholder={t("extensionConfiguration.instructions.eligibleTagsQuestionPlaceholder", { tags: tagsPlaceholder })}
                    value={batchEligibleTagsQuestion}
                    onChange={(event) =>
                    {
                      setBatchEligibleTagsQuestion(event.currentTarget.value);
                    }}
                    autosize
                    minRows={2}
                    maxRows={4}
                  />
                  <TagsInput
                    label={t("extensionConfiguration.instructions.commonEligibleTags")}
                    placeholder={t("extensionConfiguration.instructions.eligibleTagsPlaceholder")}
                    value={batchEligibleTags}
                    onChange={setBatchEligibleTags}
                    clearable
                  />
                </>
              )}

              <Group justify="flex-end" mt="xs">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconCopy size={16}/>}
                  onClick={handleApplyBatch}
                  disabled={!hasBatchContent || entries.length === 0}
                >
                  {t("extensionConfiguration.instructions.applyToAll")}
                </Button>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Text fw={600} size="sm">
              {t("extensionConfiguration.instructions.configuredModelsTitle")}
            </Text>
            <Badge variant="light" size="sm" color={entries.length > 0 ? "blue" : "gray"}>
              {entries.length}
            </Badge>
          </Group>
        </Group>

        {entries.length === 0 ? (
          <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
            {t("extensionConfiguration.instructions.noConfiguredModels")}
          </Alert>
        ) : (
          <Stack gap="sm">
            {entries.map((entry) => (
              <ModelInstructionCard
                key={entry.technicalId}
                modelEntry={entry}
                hasCaptionCapability={hasCaptionCapability}
                hasEligibleTagsCapability={hasEligibleTagsCapability}
                onChange={handleEntryChange}
                onDelete={handleDeleteModel}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Divider my="xs"/>

      <Stack gap="xs">
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs" align="center">
            <Text fw={600} size="sm">
              {t("extensionConfiguration.instructions.availableModelsTitle")}
            </Text>
            <Badge variant="light" size="sm" color="gray">
              {unconfiguredModels.length}
            </Badge>
          </Group>
          {unconfiguredModels.length > 2 && (
            <TextInput
              size="xs"
              placeholder={t("extensionConfiguration.instructions.searchModelsPlaceholder")}
              leftSection={<IconSearch size={14}/>}
              value={searchQuery}
              onChange={(event) =>
              {
                setSearchQuery(event.currentTarget.value);
              }}
            />
          )}
        </Group>

        {unconfiguredModels.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t("extensionConfiguration.instructions.allModelsConfigured")}
          </Text>
        ) : filteredUnconfiguredModels.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t("extensionConfiguration.instructions.noMatchingModels")}
          </Text>
        ) : (
          <ScrollArea.Autosize mah={280} offsetScrollbars>
            <Stack gap="xs">
              {filteredUnconfiguredModels.map((model) => (
                <Paper key={model.technicalId} withBorder p="xs" radius="md">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Stack gap={2} style={{ overflow: "hidden", minWidth: 0 }}>
                      <Group gap="xs" align="center" wrap="nowrap">
                        <Text fw={600} size="sm" truncate>
                          {model.name}
                        </Text>
                        <Badge variant="light" size="sm" tt="none">
                          {model.technicalId}
                        </Badge>
                      </Group>
                      {model.comment && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {model.comment}
                        </Text>
                      )}
                    </Stack>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14}/>}
                      onClick={() =>
                      {
                        handleConfigureModel(model);
                      }}
                    >
                      {t("extensionConfiguration.instructions.configureModel")}
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Stack>
  );
}

export default forwardRef(ExtensionAiModelInstructions);
