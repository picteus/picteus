import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Badge, Card, Divider, Group, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { AiModelInstructionFormEntryType, AiModelInstructionsService } from "app/services";
import CaptionInstructionSection from "../../../CaptionInstructionSection/CaptionInstructionSection.tsx";
import Common from "../../../Common/Common.ts";
import EligibleTagsInstructionSection from "../../../EligibleTagsInstructionSection/EligibleTagsInstructionSection.tsx";


type ModelInstructionCardPropsType =
  {
    readonly modelEntry: AiModelInstructionFormEntryType;
    readonly hasCaptionCapability: boolean;
    readonly hasEligibleTagsCapability: boolean;
    readonly hasEmbeddingsCapability: boolean;
    readonly onChange: (updatedEntry: AiModelInstructionFormEntryType) => void;
    readonly onDelete: (technicalId: string) => void;
  };

export default function ModelInstructionCard({
  modelEntry,
  hasCaptionCapability,
  hasEligibleTagsCapability,
  hasEmbeddingsCapability,
  onChange,
  onDelete
}: ModelInstructionCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const {
    supportsCaptions,
    supportsEligibleTags,
    supportsEmbeddings
  } = AiModelInstructionsService.getModelSupportedCapabilities(modelEntry.modalities, {
    hasCaptionCapability,
    hasEligibleTagsCapability,
    hasEmbeddingsCapability
  });

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
              onClick={() => onDelete(modelEntry.technicalId)}
            >
              <IconTrash size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
            </ActionIcon>
          </Tooltip>
        </Group>

        {modelEntry.comment !== undefined && modelEntry.comment.trim().length > 0 && (
          <Text size="xs" c="dimmed">
            {modelEntry.comment}
          </Text>
        )}

        {supportsCaptions === true && (
          <CaptionInstructionSection
            isEnabled={modelEntry.captionEnabled}
            isAuto={modelEntry.captionIsAuto}
            question={modelEntry.captionQuestion}
            switchLayout="row"
            onIsEnabledChange={captionEnabled => onChange({ ...modelEntry, captionEnabled })}
            onIsAutoChange={captionIsAuto => onChange({ ...modelEntry, captionIsAuto })}
            onQuestionChange={captionQuestion => onChange({ ...modelEntry, captionQuestion })}
          />
        )}

        {supportsEligibleTags === true && (
          <>
            {supportsCaptions === true && <Divider/>}
            <EligibleTagsInstructionSection
              isEnabled={modelEntry.eligibleTagsEnabled}
              isAuto={modelEntry.eligibleTagsIsAuto}
              question={modelEntry.eligibleTagsQuestion}
              tags={modelEntry.eligibleTags}
              switchLayout="row"
              isCollapsible={false}
              onIsEnabledChange={eligibleTagsEnabled => onChange({ ...modelEntry, eligibleTagsEnabled })}
              onIsAutoChange={eligibleTagsIsAuto => onChange({ ...modelEntry, eligibleTagsIsAuto })}
              onQuestionChange={eligibleTagsQuestion => onChange({ ...modelEntry, eligibleTagsQuestion })}
              onTagsChange={eligibleTags => onChange({ ...modelEntry, eligibleTags })}
            />
          </>
        )}

        {supportsEmbeddings === true && (
          <>
            {(supportsCaptions === true || supportsEligibleTags === true) && <Divider/>}
            <Group gap="lg" align="center" wrap="wrap">
              <Switch
                checked={modelEntry.embeddingEnabled}
                onChange={event =>
                {
                  onChange({
                    ...modelEntry,
                    embeddingEnabled: event.currentTarget.checked
                  });
                }}
                label={t("extensionConfiguration.instructions.enableEmbeddings")}
              />
              {modelEntry.embeddingEnabled === true && (
                <Switch
                  checked={modelEntry.embeddingIsAuto}
                  onChange={event =>
                  {
                    onChange({
                      ...modelEntry,
                      embeddingIsAuto: event.currentTarget.checked
                    });
                  }}
                  label={t("extensionConfiguration.instructions.isAuto")}
                />
              )}
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
