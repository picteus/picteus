import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Card, Group, Stack, Switch, TagsInput, Text, Textarea } from "@mantine/core";


export type AiModelInstructionFormEntryType =
  {
    readonly technicalId: string;
    readonly name: string;
    readonly comment?: string;
    captionEnabled: boolean;
    captionQuestion: string;
    eligibleTagsEnabled: boolean;
    eligibleTagsQuestion: string;
    eligibleTags: string[];
  };

export type ModelInstructionCardPropsType =
  {
    readonly modelEntry: AiModelInstructionFormEntryType;
    readonly hasCaptionCapability: boolean;
    readonly hasEligibleTagsCapability: boolean;
    readonly onChange: (updatedEntry: AiModelInstructionFormEntryType) => void;
  };

export default function ModelInstructionCard({
  modelEntry,
  hasCaptionCapability,
  hasEligibleTagsCapability,
  onChange
}: ModelInstructionCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const questionCharactersMaximum = 1024;
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
        </Group>

        {modelEntry.comment && (
          <Text size="xs" c="dimmed">
            {modelEntry.comment}
          </Text>
        )}

        {hasCaptionCapability && (
          <Stack gap="xs" mt="xs">
            <Switch
              checked={modelEntry.captionEnabled}
              onChange={(event) =>
              {
                onChange({ ...modelEntry, captionEnabled: event.currentTarget.checked });
              }}
              label={t("extensionConfiguration.instructions.enableCaptions")}
            />
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
              <>
                <Textarea
                  label={t("extensionConfiguration.instructions.eligibleTagsQuestion")}
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
