import { ReactElement, ReactNode } from "react";
import { Badge, Group, Stack, Switch, Text, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { AiModelInstructionsService } from "app/services";


type CaptionInstructionSectionPropsType =
  {
    readonly isEnabled: boolean;
    readonly isAuto: boolean;
    readonly question: string;
    readonly switchLayout: "row" | "column";
    readonly hideQuestionWhenDisabled?: boolean;
    readonly minRows?: number;
    readonly isQuestionChanged?: boolean;
    readonly notice?: ReactNode;
    readonly onIsEnabledChange: (isEnabled: boolean) => void;
    readonly onIsAutoChange: (isAuto: boolean) => void;
    readonly onQuestionChange: (question: string) => void;
  };

export default function CaptionInstructionSection({
  isEnabled,
  isAuto,
  question,
  switchLayout,
  hideQuestionWhenDisabled = false,
  minRows = 2,
  isQuestionChanged,
  notice,
  onIsEnabledChange,
  onIsAutoChange,
  onQuestionChange
}: CaptionInstructionSectionPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const questionError = isEnabled === true && question.trim().length === 0
    ? t("fieldError.empty")
    : undefined;

  const enableSwitch = (
    <Switch
      checked={isEnabled}
      onChange={event => onIsEnabledChange(event.currentTarget.checked)}
      label={t("extensionConfiguration.instructions.enableCaptions")}
    />
  );

  const autoSwitch = isEnabled === true ? (
    <Switch
      checked={isAuto}
      onChange={event => onIsAutoChange(event.currentTarget.checked)}
      label={t("extensionConfiguration.instructions.isAuto")}
    />
  ) : null;

  const hasCustomQuestionHeader = isQuestionChanged !== undefined || notice !== undefined;
  const showQuestion = hideQuestionWhenDisabled === false || isEnabled === true;

  return (
    <Stack gap={switchLayout === "column" ? "md" : "xs"} mt={switchLayout === "row" ? 4 : undefined}>
      {switchLayout === "row" ? (
        <Group gap="lg" align="center" wrap="wrap">
          {enableSwitch}
          {autoSwitch}
        </Group>
      ) : (
        <Stack gap="xs">
          {enableSwitch}
          {autoSwitch}
        </Stack>
      )}

      {showQuestion === true && (
        hasCustomQuestionHeader === true ? (
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Text size="sm" fw={500}>
                {t("extensionConfiguration.instructions.captionQuestion")}
              </Text>
              {isQuestionChanged === true && (
                <Badge color="yellow" variant="light" size="xs">
                  {t("extensionConfiguration.instructions.changedBadge")}
                </Badge>
              )}
            </Group>
            {notice}
            <Textarea
              placeholder={t("extensionConfiguration.instructions.captionQuestionPlaceholder")}
              value={question}
              onChange={event => onQuestionChange(event.currentTarget.value)}
              disabled={isEnabled === false}
              autosize
              minRows={minRows}
              maxRows={6}
              maxLength={AiModelInstructionsService.QUESTION_CHARACTERS_MAXIMUM}
              required={isEnabled}
              error={questionError}
            />
          </Stack>
        ) : (
          <Textarea
            label={t("extensionConfiguration.instructions.captionQuestion")}
            placeholder={t("extensionConfiguration.instructions.captionQuestionPlaceholder")}
            value={question}
            onChange={event => onQuestionChange(event.currentTarget.value)}
            disabled={isEnabled === false}
            autosize
            minRows={minRows}
            maxRows={6}
            maxLength={AiModelInstructionsService.QUESTION_CHARACTERS_MAXIMUM}
            required={isEnabled}
            error={questionError}
          />
        )
      )}
    </Stack>
  );
}
