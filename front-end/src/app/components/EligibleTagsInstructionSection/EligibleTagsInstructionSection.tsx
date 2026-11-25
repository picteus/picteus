import { ReactElement, useState } from "react";
import { Button, Collapse, Flex, Group, Stack, Switch, TagsInput, Text, Textarea } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { AiModelInstructionsService } from "app/services";


type EligibleTagsInstructionSectionPropsType =
  {
    readonly isEnabled: boolean;
    readonly isAuto: boolean;
    readonly question: string;
    readonly tags: string[];
    readonly switchLayout: "row" | "column";
    readonly isCollapsible?: boolean;
    readonly onIsEnabledChange: (isEnabled: boolean) => void;
    readonly onIsAutoChange: (isAuto: boolean) => void;
    readonly onQuestionChange: (question: string) => void;
    readonly onTagsChange: (tags: string[]) => void;
  };

export default function EligibleTagsInstructionSection({
  isEnabled,
  isAuto,
  question,
  tags,
  switchLayout,
  isCollapsible = true,
  onIsEnabledChange,
  onIsAutoChange,
  onQuestionChange,
  onTagsChange
}: EligibleTagsInstructionSectionPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ isExpanded, setIsExpanded ] = useState<boolean>(false);

  const errorKind = AiModelInstructionsService.validateEligibleTagsQuestion(question, isEnabled);
  const questionError = errorKind === "empty"
    ? t("fieldError.empty")
    : (errorKind === "missingPlaceholder"
      ? t("extensionConfiguration.instructions.commonEligibleTagsQuestion", { tags: AiModelInstructionsService.TAGS_PLACEHOLDER })
      : undefined);

  const isOpen = isExpanded === true || questionError !== undefined;
  const summary = isEnabled === true
    ? t("extensionConfiguration.instructions.eligibleTagsOnSummary", { count: tags.length })
    : t("extensionConfiguration.instructions.eligibleTagsOffSummary");

  const enableSwitch = (
    <Switch
      checked={isEnabled}
      onChange={event => onIsEnabledChange(event.currentTarget.checked)}
      label={t("extensionConfiguration.instructions.enableEligibleTags")}
    />
  );

  const autoSwitch = isEnabled === true ? (
    <Switch
      checked={isAuto}
      onChange={event => onIsAutoChange(event.currentTarget.checked)}
      label={t("extensionConfiguration.instructions.isAuto")}
    />
  ) : null;

  const fieldsContent = (
    <Stack gap="xs" pt={isCollapsible === true ? "xs" : undefined}>
      {switchLayout === "row" ? (
        <Group gap="lg" align="center" wrap="wrap">
          {enableSwitch}
          {autoSwitch}
        </Group>
      ) : (
        <>
          {enableSwitch}
          {autoSwitch}
        </>
      )}

      {(isCollapsible === false || isEnabled === true) && (
        <>
          <Textarea
            label={t("extensionConfiguration.instructions.commonEligibleTagsQuestion", { tags: AiModelInstructionsService.TAGS_PLACEHOLDER })}
            placeholder={t("extensionConfiguration.instructions.eligibleTagsQuestionPlaceholder", { tags: AiModelInstructionsService.TAGS_PLACEHOLDER })}
            value={question}
            onChange={event => onQuestionChange(event.currentTarget.value)}
            disabled={isEnabled === false}
            autosize
            minRows={2}
            maxRows={6}
            maxLength={AiModelInstructionsService.QUESTION_CHARACTERS_MAXIMUM}
            required={isEnabled}
            error={questionError}
          />
          <TagsInput
            label={t("extensionConfiguration.instructions.eligibleTags")}
            placeholder={t("extensionConfiguration.instructions.eligibleTagsPlaceholder")}
            value={tags}
            onChange={onTagsChange}
            disabled={isEnabled === false}
            clearable
          />
        </>
      )}
    </Stack>
  );

  if (isCollapsible === false)
  {
    return fieldsContent;
  }

  return (
    <Stack gap="xs">
      <Flex justify="space-between" align="center" gap="sm">
        <Text size="sm" c={isEnabled === true ? undefined : "dimmed"} fw={500}>
          {summary}
        </Text>
        <Button
          variant="subtle"
          size="compact-xs"
          rightSection={isOpen === true ? <IconChevronUp size={14}/> : <IconChevronDown size={14}/>}
          onClick={() => setIsExpanded(previous => !previous)}
        >
          {t(isOpen === true ? "button.hide" : "button.show")}
        </Button>
      </Flex>

      <Collapse expanded={isOpen}>
        {fieldsContent}
      </Collapse>
    </Stack>
  );
}
