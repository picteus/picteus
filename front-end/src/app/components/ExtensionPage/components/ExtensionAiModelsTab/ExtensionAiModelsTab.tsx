import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Paper,
  Stack,
  TagsInput,
  Text,
  Textarea,
  Title
} from "@mantine/core";
import { IconAlertCircle, IconCopy, IconPlus, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  AiModelModality,
  CaptionInstruction,
  EligibleTagsInstruction,
  EmbeddingInstruction,
  Extension,
  ExtensionAiModel,
  ExtensionState
} from "@picteus/ws-client";

import { ToastService } from "utils";
import {
  useAiModels,
  useExtensionInstructions,
  useExtensionSettings,
  useSaveExtensionInstructionsMutation
} from "app/hooks";
import {
  AiModelInstructionFormEntryType,
  AiModelInstructionsService,
  ErrorService,
  ExtensionInstructionCapabilitiesType,
  ExtensionsService
} from "app/services";
import Common from "../../../Common/Common.ts";
import ErrorAlert from "../../../ErrorAlert/ErrorAlert.tsx";
import FlexScrollArea from "../../../FlexScrollArea/FlexScrollArea.tsx";
import Loader from "../../../Loader/Loader.tsx";
import SearchInput from "../../../SearchInput/SearchInput.tsx";
import ModelInstructionCard from "../ModelInstructionCard/ModelInstructionCard.tsx";
import StickyActionFooter from "../StickyActionFooter/StickyActionFooter.tsx";


type EmptyAiModelsCalloutPropsType =
  {
    readonly title: string;
    readonly description: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
  };

function EmptyAiModelsCallout({
  title,
  description,
  actionLabel,
  onAction
}: EmptyAiModelsCalloutPropsType): ReactElement
{
  return (
    <Box p="md" flex={1}>
      <Paper p="xl" radius="md" bg="var(--mantine-color-default-hover)" maw={760} w="100%">
        <Stack align="flex-start" gap="xs">
          <Title order={4} fw={500}>
            {title}
          </Title>
          <Text size="sm" c="dimmed" maw={700}>
            {description}
          </Text>
          {actionLabel !== undefined && onAction !== undefined && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

type ExtensionAiModelsTabPropsType =
  {
    readonly extension: Extension;
    readonly capabilities: ExtensionInstructionCapabilitiesType;
    readonly hasSettings: boolean;
    readonly onOpenSettingsTab?: () => void;
    readonly onDirtyChange: (isDirty: boolean) => void;
  };

export default function ExtensionAiModelsTab({
  extension,
  capabilities,
  hasSettings,
  onOpenSettingsTab,
  onDirtyChange
}: ExtensionAiModelsTabPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const isEnabled = extension.state === ExtensionState.Enabled;
  const {
    data: settingsData,
    isLoading: isSettingsLoading
  } = useExtensionSettings(extension.manifest.id, hasSettings === true && isEnabled === true);

  const isMissingRequiredSettings = isEnabled === true &&
    hasSettings === true &&
    isSettingsLoading === false &&
    ExtensionsService.hasMissingRequiredSettings(extension.manifest, settingsData?.value) === true;

  const {
    data: allModels = [],
    isLoading: isAiModelsLoading,
    isError: isAiModelsError,
    error: aiModelsError,
    refetch: refetchAiModels
  } = useAiModels();

  const {
    data: instructionsData,
    isLoading: isInstructionsLoading,
    isError: isInstructionsError,
    error: instructionsError,
    refetch: refetchInstructions
  } = useExtensionInstructions(
    extension.manifest.id,
    capabilities,
    isMissingRequiredSettings === false
  );

  const saveInstructionsMutation = useSaveExtensionInstructionsMutation();

  const extensionModels = useMemo<ExtensionAiModel[]>(
    () => allModels.filter(model => model.extensionId === extension.manifest.id),
    [ allModels, extension.manifest.id ]
  );

  const [ entries, setEntries ] = useState<AiModelInstructionFormEntryType[]>([]);
  const [ initialEntries, setInitialEntries ] = useState<AiModelInstructionFormEntryType[]>([]);
  const [ searchQuery, setSearchQuery ] = useState<string>("");
  const [ batchCaptionQuestion, setBatchCaptionQuestion ] = useState<string>("");
  const [ batchEligibleTagsQuestion, setBatchEligibleTagsQuestion ] = useState<string>("");
  const [ batchEligibleTags, setBatchEligibleTags ] = useState<string[]>([]);
  const [ saveErrorMessage, setSaveErrorMessage ] = useState<string | undefined>(undefined);
  const initializedKeyRef = useRef<string | undefined>(undefined);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const entryCardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pendingScrollModelIdRef = useRef<string | undefined>(undefined);

  useEffect(() =>
  {
    if (instructionsData === undefined || isAiModelsLoading === true)
    {
      return;
    }

    const syncKey = `${extension.manifest.id}:${extensionModels.length}:${instructionsData.captionInstructions.length}:${instructionsData.eligibleTagsInstructions.length}:${instructionsData.embeddingInstructions.length}`;
    if (initializedKeyRef.current === syncKey)
    {
      return;
    }
    initializedKeyRef.current = syncKey;

    const built = AiModelInstructionsService.buildModelInstructionEntries(
      extensionModels,
      instructionsData.captionInstructions,
      instructionsData.eligibleTagsInstructions,
      instructionsData.embeddingInstructions
    );
    setEntries(AiModelInstructionsService.cloneInstructionEntries(built));
    setInitialEntries(AiModelInstructionsService.cloneInstructionEntries(built));
    setSaveErrorMessage(undefined);
  }, [ extension.manifest.id, extensionModels, instructionsData, isAiModelsLoading ]);

  const dirtyCount = useMemo<number>(
    () => AiModelInstructionsService.countInstructionChanges(
      entries,
      initialEntries,
      capabilities.hasCaptionCapability,
      capabilities.hasEligibleTagsCapability,
      capabilities.hasEmbeddingsCapability
    ),
    [ entries, initialEntries, capabilities ]
  );

  const isValid = useMemo<boolean>(
    () => AiModelInstructionsService.areInstructionEntriesValid(entries, capabilities.hasEligibleTagsCapability),
    [ entries, capabilities.hasEligibleTagsCapability ]
  );

  useEffect(() =>
  {
    onDirtyChange(dirtyCount > 0);
  }, [ dirtyCount, onDirtyChange ]);

  useEffect(() =>
  {
    return () =>
    {
      onDirtyChange(false);
    };
  }, [ onDirtyChange ]);

  useEffect(() =>
  {
    const targetTechnicalId = pendingScrollModelIdRef.current;
    if (targetTechnicalId === undefined)
    {
      return;
    }

    const animationFrameId = requestAnimationFrame(() =>
    {
      const targetElement = entryCardElementsRef.current.get(targetTechnicalId);
      if (targetElement === undefined)
      {
        return;
      }
      pendingScrollModelIdRef.current = undefined;

      const viewportElement = scrollViewportRef.current;
      if (viewportElement !== null)
      {
        const viewportRect = viewportElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const isFullyVisible = targetRect.top >= viewportRect.top && targetRect.bottom <= viewportRect.bottom;
        if (isFullyVisible === false)
        {
          const topOffset = targetRect.top - viewportRect.top + viewportElement.scrollTop - 16;
          viewportElement.scrollTo({
            top: Math.max(0, topOffset),
            behavior: "smooth"
          });
        }
        return;
      }
      targetElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () =>
    {
      cancelAnimationFrame(animationFrameId);
    };
  }, [ entries ]);

  const unconfiguredModels = useMemo<ExtensionAiModel[]>(() =>
  {
    const configuredIds = new Set<string>(entries.map(entry => entry.technicalId));
    return extensionModels.filter(model =>
    {
      if (configuredIds.has(model.technicalId) === true)
      {
        return false;
      }
      const {
        supportsCaptions,
        supportsEligibleTags,
        supportsEmbeddings
      } = AiModelInstructionsService.getModelSupportedCapabilities(model.modalities, capabilities);
      return supportsCaptions || supportsEligibleTags || supportsEmbeddings;
    });
  }, [ extensionModels, entries, capabilities ]);

  const filteredUnconfiguredModels = useMemo<ExtensionAiModel[]>(() =>
  {
    const normalized = searchQuery.trim().toLowerCase();
    if (normalized.length === 0)
    {
      return unconfiguredModels;
    }
    return unconfiguredModels.filter(model =>
      model.name.toLowerCase().includes(normalized) ||
      model.technicalId.toLowerCase().includes(normalized) ||
      (model.comment?.toLowerCase().includes(normalized) ?? false)
    );
  }, [ unconfiguredModels, searchQuery ]);

  function handleEntryChange(updatedEntry: AiModelInstructionFormEntryType): void
  {
    setEntries(previous => previous.map(entry =>
      entry.technicalId === updatedEntry.technicalId ? updatedEntry : entry
    ));
  }

  function handleAddModel(model: ExtensionAiModel): void
  {
    const {
      supportsCaptions,
      supportsEligibleTags,
      supportsEmbeddings
    } = AiModelInstructionsService.getModelSupportedCapabilities(model.modalities, capabilities);

    const newEntry: AiModelInstructionFormEntryType = {
      technicalId: model.technicalId,
      name: model.name,
      comment: model.comment,
      modalities: model.modalities,
      captionEnabled: supportsCaptions,
      captionIsAuto: false,
      captionQuestion: batchCaptionQuestion.trim().length > 0
        ? batchCaptionQuestion.trim()
        : AiModelInstructionsService.DEFAULT_CAPTION_QUESTION,
      eligibleTagsEnabled: supportsEligibleTags,
      eligibleTagsIsAuto: false,
      eligibleTagsQuestion: batchEligibleTagsQuestion.trim().length > 0
        ? batchEligibleTagsQuestion.trim()
        : AiModelInstructionsService.DEFAULT_ELIGIBLE_TAGS_QUESTION,
      eligibleTags: batchEligibleTags.length > 0
        ? [ ...batchEligibleTags ]
        : [ ...AiModelInstructionsService.DEFAULT_ELIGIBLE_TAGS ],
      embeddingEnabled: supportsEmbeddings,
      embeddingIsAuto: false
    };
    pendingScrollModelIdRef.current = model.technicalId;
    setEntries(previous => [ ...previous, newEntry ]);
  }

  function handleRemoveModel(technicalId: string): void
  {
    setEntries(previous => previous.filter(entry => entry.technicalId !== technicalId));
  }

  function handleApplyBatch(): void
  {
    setEntries(previous => previous.map(entry =>
    {
      const updated = { ...entry };
      if (capabilities.hasCaptionCapability === true && entry.captionEnabled === true && batchCaptionQuestion.trim().length > 0)
      {
        updated.captionQuestion = batchCaptionQuestion.trim();
      }
      if (capabilities.hasEligibleTagsCapability === true && entry.eligibleTagsEnabled === true)
      {
        if (batchEligibleTagsQuestion.trim().length > 0)
        {
          updated.eligibleTagsQuestion = batchEligibleTagsQuestion.trim();
        }
        if (batchEligibleTags.length > 0)
        {
          updated.eligibleTags = [ ...batchEligibleTags ];
        }
      }
      return updated;
    }));
  }

  function handleCancel(): void
  {
    setEntries(AiModelInstructionsService.cloneInstructionEntries(initialEntries));
    setSaveErrorMessage(undefined);
  }

  async function handleSave(): Promise<void>
  {
    if (isValid === false)
    {
      return;
    }

    setSaveErrorMessage(undefined);
    try
    {
      const captionInstructions: CaptionInstruction[] | undefined = capabilities.hasCaptionCapability === true
        ? entries
          .filter(entry => AiModelInstructionsService.modelSupportsModality(entry.modalities, AiModelModality.ImageCaptions))
          .map(entry => ({
            aiModelTechnicalId: entry.technicalId,
            enabled: entry.captionEnabled,
            isAuto: entry.captionIsAuto,
            question: entry.captionQuestion.trim()
          }))
        : undefined;

      const eligibleTagsInstructions: EligibleTagsInstruction[] | undefined = capabilities.hasEligibleTagsCapability === true
        ? entries
          .filter(entry => AiModelInstructionsService.modelSupportsModality(entry.modalities, AiModelModality.ImageEligibleTags))
          .map(entry => ({
            aiModelTechnicalId: entry.technicalId,
            enabled: entry.eligibleTagsEnabled,
            isAuto: entry.eligibleTagsIsAuto,
            question: entry.eligibleTagsQuestion.trim(),
            tags: entry.eligibleTags
          }))
        : undefined;

      const embeddingInstructions: EmbeddingInstruction[] | undefined = capabilities.hasEmbeddingsCapability === true
        ? entries
          .filter(entry => AiModelInstructionsService.modelSupportsModality(entry.modalities, AiModelModality.ImageEmbeddings))
          .map(entry => ({
            aiModelTechnicalId: entry.technicalId,
            enabled: entry.embeddingEnabled,
            isAuto: entry.embeddingIsAuto
          }))
        : undefined;

      await saveInstructionsMutation.mutateAsync({
        extensionId: extension.manifest.id,
        captionInstructions,
        eligibleTagsInstructions,
        embeddingInstructions
      });

      const savedSnapshot = AiModelInstructionsService.cloneInstructionEntries(entries);
      setInitialEntries(savedSnapshot);
      ToastService.success(t("extensionPage.aiModels.saveSuccess"));
    }
    catch (error)
    {
      const reason = await ErrorService.extractErrorReason(error);
      setSaveErrorMessage(reason.length > 0 ? reason : t("extensionPage.aiModels.saveError"));
    }
  }

  if (isMissingRequiredSettings === true)
  {
    return (
      <EmptyAiModelsCallout
        title={t("extensionPage.aiModels.missingSettingsTitle", { name: extension.manifest.name })}
        description={t("extensionPage.aiModels.missingSettingsDescription", { name: extension.manifest.name })}
        actionLabel={onOpenSettingsTab !== undefined ? t("extensionPage.aiModels.openSettings") : undefined}
        onAction={onOpenSettingsTab}
      />
    );
  }

  if (isSettingsLoading === true || isAiModelsLoading === true || isInstructionsLoading === true)
  {
    return (
      <Box p="md" flex={1}>
        <Loader/>
      </Box>
    );
  }

  if (isAiModelsError === true || isInstructionsError === true)
  {
    const errorMessage = aiModelsError?.message ?? instructionsError?.message;
    return (
      <Flex flex={1} align="center" justify="center" p="xl">
        <Paper withBorder p="xl" radius="md" maw={480} w="100%">
          <Stack align="center" gap="sm" ta="center">
            <IconAlertCircle size={32} stroke={Common.IconStrokeSize} color="var(--mantine-color-red-6)"/>
            <Title order={4}>
              {t("extensionConfiguration.instructions.loadErrorTitle", { name: extension.manifest.name })}
            </Title>
            {errorMessage && (
              <Text size="sm" c="dimmed">
                {errorMessage}
              </Text>
            )}
            <Button
              mt="xs"
              variant="light"
              onClick={() =>
              {
                void refetchAiModels();
                void refetchInstructions();
              }}
            >
              {t("button.retry")}
            </Button>
          </Stack>
        </Paper>
      </Flex>
    );
  }

  if (extensionModels.length === 0)
  {
    if (isEnabled === false)
    {
      return (
        <EmptyAiModelsCallout
          title={t("extensionPage.aiModels.noModelsDisabledTitle", { name: extension.manifest.name })}
          description={t("extensionPage.aiModels.noModelsDisabledDescription", { name: extension.manifest.name })}
        />
      );
    }

    return (
      <EmptyAiModelsCallout
        title={t("extensionPage.aiModels.noModelsAvailableTitle", { name: extension.manifest.name })}
        description={onOpenSettingsTab !== undefined
          ? t("extensionPage.aiModels.noModelsAvailableWithSettingsDescription", { name: extension.manifest.name })
          : t("extensionPage.aiModels.noModelsAvailableDescription", { name: extension.manifest.name })}
        actionLabel={onOpenSettingsTab !== undefined ? t("extensionPage.aiModels.openSettings") : undefined}
        onAction={onOpenSettingsTab}
      />
    );
  }

  const hasBatchContent =
    (capabilities.hasCaptionCapability === true && batchCaptionQuestion.trim().length > 0) ||
    (capabilities.hasEligibleTagsCapability === true && (batchEligibleTagsQuestion.trim().length > 0 || batchEligibleTags.length > 0));

  const showBatchAccordion =
    entries.length >= 2 &&
    (capabilities.hasCaptionCapability === true || capabilities.hasEligibleTagsCapability === true);

  return (
    <Flex direction="column" flex={1} mih={0}>
      <FlexScrollArea viewportRef={scrollViewportRef}>
        <Stack gap="md" p="md">
          {saveErrorMessage !== undefined && (
            <ErrorAlert
              title={t("extensionPage.aiModels.saveError")}
              message={saveErrorMessage}
              onRetry={() => void handleSave()}
              isRetrying={saveInstructionsMutation.isPending}
            />
          )}

          {showBatchAccordion === true && (
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

                    {capabilities.hasCaptionCapability === true && (
                      <Textarea
                        label={t("extensionConfiguration.instructions.commonCaptionQuestion")}
                        placeholder={t("extensionConfiguration.instructions.captionQuestionPlaceholder")}
                        value={batchCaptionQuestion}
                        onChange={event => setBatchCaptionQuestion(event.currentTarget.value)}
                        autosize
                        minRows={2}
                        maxRows={4}
                      />
                    )}

                    {capabilities.hasEligibleTagsCapability === true && (
                      <>
                        <Textarea
                          label={t("extensionConfiguration.instructions.commonEligibleTagsQuestion", { tags: AiModelInstructionsService.TAGS_PLACEHOLDER })}
                          placeholder={t("extensionConfiguration.instructions.eligibleTagsQuestionPlaceholder", { tags: AiModelInstructionsService.TAGS_PLACEHOLDER })}
                          value={batchEligibleTagsQuestion}
                          onChange={event => setBatchEligibleTagsQuestion(event.currentTarget.value)}
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
                        disabled={hasBatchContent === false}
                      >
                        {t("extensionConfiguration.instructions.applyToAll")}
                      </Button>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          )}

          {entries.length === 0 ? (
            <Paper withBorder p="xl" radius="md">
              <Stack align="center" gap="xs" ta="center">
                <IconSparkles size={28} stroke={Common.IconStrokeSize}/>
                <Title order={4}>{t("extensionPage.aiModels.emptyTitle")}</Title>
                <Text size="sm" c="dimmed" maw={440}>
                  {t("extensionPage.aiModels.emptyDescription", { name: extension.manifest.name })}
                </Text>
              </Stack>
            </Paper>
          ) : (
            <Stack gap="xs">
              <Group gap="xs" align="center">
                <Text fw={600} size="sm">
                  {t("extensionConfiguration.instructions.configuredModelsTitle")}
                </Text>
                <Badge variant="light" size="sm" color="blue">
                  {entries.length}
                </Badge>
              </Group>
              <Stack gap="sm">
                {entries.map(entry => (
                  <Box
                    key={entry.technicalId}
                    ref={element =>
                    {
                      if (element !== null)
                      {
                        entryCardElementsRef.current.set(entry.technicalId, element);
                      }
                      else
                      {
                        entryCardElementsRef.current.delete(entry.technicalId);
                      }
                    }}
                  >
                    <ModelInstructionCard
                      modelEntry={entry}
                      hasCaptionCapability={capabilities.hasCaptionCapability}
                      hasEligibleTagsCapability={capabilities.hasEligibleTagsCapability}
                      hasEmbeddingsCapability={capabilities.hasEmbeddingsCapability}
                      onChange={handleEntryChange}
                      onDelete={handleRemoveModel}
                    />
                  </Box>
                ))}
              </Stack>
            </Stack>
          )}

          <Divider/>

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
                <SearchInput
                  size="xs"
                  w={220}
                  placeholder={t("extensionConfiguration.instructions.searchModelsPlaceholder")}
                  value={searchQuery}
                  onChange={setSearchQuery}
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
              <Stack gap="xs">
                {filteredUnconfiguredModels.map(model => (
                  <Paper key={model.technicalId} withBorder p="xs" radius="md">
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Stack gap={2} miw={0} flex={1}>
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Text fw={600} size="sm" truncate>
                            {model.name}
                          </Text>
                          <Badge variant="light" size="sm" tt="none">
                            {model.technicalId}
                          </Badge>
                        </Group>
                        {model.comment !== undefined && model.comment.trim().length > 0 && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {model.comment}
                          </Text>
                        )}
                      </Stack>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14}/>}
                        onClick={() => handleAddModel(model)}
                      >
                        {t("extensionPage.aiModels.addModel")}
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      </FlexScrollArea>

      <StickyActionFooter
        dirtyCount={dirtyCount}
        isSaving={saveInstructionsMutation.isPending}
        isSaveDisabled={dirtyCount === 0 || isValid === false}
        onCancel={handleCancel}
        onSave={() => void handleSave()}
      />
    </Flex>
  );
}
