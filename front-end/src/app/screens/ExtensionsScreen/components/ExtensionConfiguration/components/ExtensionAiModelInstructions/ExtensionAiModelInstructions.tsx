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
import { Alert, Button, Group, Paper, Stack, TagsInput, Text, Textarea } from "@mantine/core";
import { IconCopy, IconInfoCircle } from "@tabler/icons-react";

import { CaptionInstruction, EligibleTagsInstruction, Extension, ExtensionAiModel } from "@picteus/ws-client";

import { ToastService } from "utils";
import { ExtensionsService } from "app/services";
import { Loader } from "app/components";
import ModelInstructionCard, {
  AiModelInstructionFormEntryType
} from "../ModelInstructionCard/ModelInstructionCard.tsx";


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

      const initialEntries: AiModelInstructionFormEntryType[] = extensionModels.map((model) =>
      {
        const captionInstruction = captionMap.get(model.technicalId);
        const tagsInstruction = tagsMap.get(model.technicalId);
        return {
          technicalId: model.technicalId,
          name: model.name,
          comment: model.comment,
          captionEnabled: captionInstruction?.enabled ?? false,
          captionQuestion: captionInstruction?.question ?? defaultCaptionQuestion,
          eligibleTagsEnabled: tagsInstruction?.enabled ?? false,
          eligibleTagsQuestion: tagsInstruction?.question ?? "Pick the tags that best fit the image from this list: {tags}.",
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

  function computeIsDirty(currentEntries: AiModelInstructionFormEntryType[]): boolean
  {
    if (currentEntries.length !== initialEntriesRef.current.length)
    {
      return true;
    }

    for (let index = 0; index < currentEntries.length; index += 1)
    {
      const current = currentEntries[index];
      const initial = initialEntriesRef.current[index];
      if (!initial || current.technicalId !== initial.technicalId)
      {
        return true;
      }
      if (hasCaptionCapability)
      {
        if (current.captionEnabled !== initial.captionEnabled)
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
      if (entry.eligibleTagsEnabled && entry.eligibleTagsQuestion.trim().length === 0)
      {
        return false;
      }
    }
    return true;
  }, [ entries ]);

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
      <Paper withBorder p="md" radius="md">
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              {t("extensionConfiguration.instructions.batchTitle")}
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconCopy size={16}/>}
              onClick={handleApplyBatch}
              disabled={!hasBatchContent}
            >
              {t("extensionConfiguration.instructions.applyToAll")}
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            {t("extensionConfiguration.instructions.batchDescription")}
          </Text>

          {hasCaptionCapability && (
            <Textarea
              label={t("extensionConfiguration.instructions.commonCaptionQuestion")}
              placeholder={t("extensionConfiguration.instructions.captionQuestionPlaceholder")}
              value={batchCaptionQuestion}
              onChange={(event) => setBatchCaptionQuestion(event.currentTarget.value)}
              autosize
              minRows={2}
              maxRows={4}
            />
          )}

          {hasEligibleTagsCapability && (
            <>
              <Textarea
                label={t("extensionConfiguration.instructions.commonEligibleTagsQuestion")}
                placeholder={t("extensionConfiguration.instructions.eligibleTagsQuestionPlaceholder")}
                value={batchEligibleTagsQuestion}
                onChange={(event) => setBatchEligibleTagsQuestion(event.currentTarget.value)}
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
        </Stack>
      </Paper>

      <Stack gap="sm">
        {entries.map((entry) => (
          <ModelInstructionCard
            key={entry.technicalId}
            modelEntry={entry}
            hasCaptionCapability={hasCaptionCapability}
            hasEligibleTagsCapability={hasEligibleTagsCapability}
            onChange={handleEntryChange}
          />
        ))}
      </Stack>
    </Stack>
  );
}

export default forwardRef(ExtensionAiModelInstructions);
