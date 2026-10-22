import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Badge, Card, Group, Stack, Switch, TagsInput, Text, Textarea, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";


export type AiModelInstructionFormEntryType =
  {
    readonly technicalId: string;
    readonly name: string;
    readonly comment?: string;
    captionEnabled: boolean;
    captionIsAuto: boolean;
    captionQuestion: string;
    eligibleTagsEnabled: boolean;
    eligibleTagsIsAuto: boolean;
    eligibleTagsQuestion: string;
    eligibleTags: string[];
  };

export type ModelInstructionCardPropsType =
  {
    readonly modelEntry: AiModelInstructionFormEntryType;
    readonly hasCaptionCapability: boolean;
    readonly hasEligibleTagsCapability: boolean;
    readonly onChange: (updatedEntry: AiModelInstructionFormEntryType) => void;
    readonly onDelete: (technicalId: string) => void;
  };

export default function ModelInstructionCard({
  modelEntry,
  hasCaptionCapability,
  hasEligibleTagsCapability,
  onChange,
  onDelete
}: ModelInstructionCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const questionCharactersMaximum = 1_024;
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group gap="xs" align="center">
            <Text fw={600} size="sm">
              {modelEntry.name}
            </Text>
            <Badge variant="light" size="sm" tt="none">
              {modelEntry.technicalId}
            </Badge>
          </Group>
          <Tooltip label={t("extensionConfiguration.instructions.deleteModel")}>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() =>
              {
                onDelete(modelEntry.technicalId);
              }}
              aria-label={t("extensionConfiguration.instructions.deleteModel")}
            >
              <IconTrash size={16}/>
            </ActionIcon>
          </Tooltip>
        </Group>

        {modelEntry.comment && (
          <Text size="xs" c="dimmed">
            {modelEntry.comment}
          </Text>
        )}

        {hasCaptionCapability && (
          <Stack gap="xs" mt="xs">
            <Group gap="lg" align="center" wrap="wrap">
              <Switch
                checked={modelEntry.captionEnabled}
                onChange={(event) =>
                {
                  onChange({ ...modelEntry, captionEnabled: event.currentTarget.checked });
                }}
                label={t("extensionConfiguration.instructions.enableCaptions")}
              />
              {modelEntry.captionEnabled && (
                <Switch
                  checked={modelEntry.captionIsAuto}
                  onChange={(event) =>
                  {
                    onChange({ ...modelEntry, captionIsAuto: event.currentTarget.checked });
                  }}
                  label={t("extensionConfiguration.instructions.isAutoCaptions")}
                />
              )}
            </Group>
            {modelEntry.captionEnabled && (
              <Textarea
                label={t("extensionConfiguration.instructions.captionQuestion")}
                placeholder={t("extensionConfiguration.instructions.captionQuestionPlaceholder")}
                value={modelEntry.captionQuestion}
                onChange={(event) =>
                {
                  onChange({ ...modelEntry, captionQuestion: event.currentTarget.value });
                }}
                autosize
                minRows={2}
                maxRows={6}
                maxLength={questionCharactersMaximum}
                required
                error={modelEntry.captionEnabled && modelEntry.captionQuestion.trim().length === 0 ? t("fieldError.empty") : undefined}
              />
            )}
          </Stack>
        )}

        {hasEligibleTagsCapability && (
          <Stack gap="xs" mt="xs">
            <Group gap="lg" align="center" wrap="wrap">
              <Switch
                checked={modelEntry.eligibleTagsEnabled}
                onChange={(event) =>
                {
                  onChange({
                    ...modelEntry,
                    eligibleTagsEnabled: event.currentTarget.checked
                  });
                }}
                label={t("extensionConfiguration.instructions.enableEligibleTags")}
              />
              {modelEntry.eligibleTagsEnabled && (
                <Switch
                  checked={modelEntry.eligibleTagsIsAuto}
                  onChange={(event) =>
                  {
                    onChange({
                      ...modelEntry,
                      eligibleTagsIsAuto: event.currentTarget.checked
                    });
                  }}
                  label={t("extensionConfiguration.instructions.iAutoEligibleTags")}
                />
              )}
            </Group>
            {modelEntry.eligibleTagsEnabled && (
              <>
                <Textarea
                  label={t("extensionConfiguration.instructions.commonEligibleTagsQuestion")}
                  placeholder={t("extensionConfiguration.instructions.eligibleTagsQuestionPlaceholder")}
                  value={modelEntry.eligibleTagsQuestion}
                  onChange={(event) =>
                  {
                    onChange({ ...modelEntry, eligibleTagsQuestion: event.currentTarget.value });
                  }}
                  autosize
                  minRows={2}
                  maxRows={6}
                  maxLength={questionCharactersMaximum}
                  required
                  error={modelEntry.eligibleTagsEnabled && modelEntry.eligibleTagsQuestion.trim().length === 0 ? t("fieldError.empty") : undefined}
                />
                <TagsInput
                  label={t("extensionConfiguration.instructions.eligibleTags")}
                  placeholder={t("extensionConfiguration.instructions.eligibleTagsPlaceholder")}
                  value={modelEntry.eligibleTags}
                  onChange={(tags) =>
                  {
                    onChange({ ...modelEntry, eligibleTags: tags });
                  }}
                  clearable
                />
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
