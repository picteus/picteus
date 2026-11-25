import { ReactElement, useEffect, useMemo } from "react";
import { Box, Button, Card, Flex, Grid, Stack, Text, Title } from "@mantine/core";
import { IconRestore, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension } from "@picteus/ws-client";

import { ManualSection } from "types";
import { extractMarkdownParagraph, ToastService } from "utils";
import { useConfirmAction, useExtensionSettingsForm, useResetExtensionSettingsMutation } from "app/hooks";
import ActionLink from "../../../ActionLink/ActionLink.tsx";
import Common from "../../../Common/Common.ts";
import ErrorAlert from "../../../ErrorAlert/ErrorAlert.tsx";
import FlexScrollArea from "../../../FlexScrollArea/FlexScrollArea.tsx";
import Loader from "../../../Loader/Loader.tsx";
import Manual from "../../../Manual/Manual.tsx";
import RjsfForm from "../../../RjsfForm/RjsfForm.tsx";
import StickyActionFooter from "../StickyActionFooter/StickyActionFooter.tsx";


type ExtensionSettingsTabPropsType =
  {
    readonly extension: Extension;
    readonly manualMarkdown: string | undefined;
    readonly hasAiModels: boolean;
    readonly onOpenAiModelsTab: () => void;
    readonly onDirtyChange: (isDirty: boolean) => void;
  };

export default function ExtensionSettingsTab({
  extension,
  manualMarkdown,
  hasAiModels,
  onOpenAiModelsTab,
  onDirtyChange
}: ExtensionSettingsTabPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const confirmAction = useConfirmAction();
  const resetExtensionSettingsMutation = useResetExtensionSettingsMutation();

  const {
    persistedSettings,
    isLoadError,
    loadError,
    refetch,
    schema,
    uiSchema,
    draftValue,
    setDraftValue,
    isValid,
    setIsValid,
    dirtyCount,
    formKey,
    saveErrorMessage,
    isSaving,
    save,
    resetDraftToInitial,
    replaceDraftWithPersisted
  } = useExtensionSettingsForm(extension);

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

  const settingsManual = useMemo(
    () => (manualMarkdown !== undefined ? extractMarkdownParagraph(manualMarkdown, ManualSection.Settings) : undefined),
    [ manualMarkdown ]
  );

  function handleReset(): void
  {
    confirmAction({
      options: {
        title: t("extensionPage.settings.resetConfirmTitle"),
        message: t("extensionPage.settings.resetConfirmMessage", { name: extension.manifest.name })
      },
      onConfirm: async (): Promise<void> =>
      {
        try
        {
          const resetSettings = await resetExtensionSettingsMutation.mutateAsync({
            id: extension.manifest.id
          });
          replaceDraftWithPersisted(resetSettings.value as Record<string, unknown> | undefined);
          ToastService.success(t("extensionConfiguration.successResetting"));
        }
        catch (error)
        {
          ToastService.apiCallError(error, t("extensionConfiguration.errorResetting"));
        }
      }
    });
  }

  const isBusy = isSaving === true || resetExtensionSettingsMutation.isPending === true;

  if (isLoadError === true && persistedSettings === undefined)
  {
    return (
      <Box p="md" flex={1}>
        <ErrorAlert
          title={t("extensionConfiguration.errorLoading")}
          message={loadError?.message}
          onRetry={() => void refetch()}
        />
      </Box>
    );
  }

  if (persistedSettings === undefined)
  {
    return (
      <Box p="md" flex={1}>
        <Loader/>
      </Box>
    );
  }

  return (
    <Flex direction="column" flex={1} mih={0}>
      <FlexScrollArea>
        <Box p="md">
          <Grid gap="lg" align="flex-start">
            <Grid.Col span={{ base: 12, md: hasAiModels === true ? 8 : 12 }}>
              <Stack gap="md">
                {saveErrorMessage !== undefined && (
                  <ErrorAlert
                    title={t("extensionConfiguration.saveErrorTitle")}
                    message={saveErrorMessage}
                    onRetry={() => void save()}
                    isRetrying={isSaving}
                  />
                )}

                {settingsManual !== undefined && settingsManual.trim().length > 0 && (
                  <Manual content={settingsManual}/>
                )}

                <RjsfForm
                  key={formKey}
                  initialFormData={draftValue}
                  schema={schema}
                  uiSchema={uiSchema}
                  onChange={value =>
                  {
                    setDraftValue(value as Record<string, unknown>);
                  }}
                  onValidationChange={setIsValid}
                />
              </Stack>
            </Grid.Col>

            {hasAiModels === true && (
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Card withBorder padding="md" radius="md">
                  <Stack gap="xs">
                    <Title order={5}>{t("extensionPage.settings.lookingForModelsTitle")}</Title>
                    <Text size="sm" c="dimmed">
                      {t("extensionPage.settings.lookingForModelsDescription")}
                    </Text>
                    <ActionLink
                      leftSection={<IconSparkles size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
                      onClick={onOpenAiModelsTab}
                    >
                      {t("extensionPage.settings.goToAiModels")}
                    </ActionLink>
                  </Stack>
                </Card>
              </Grid.Col>
            )}
          </Grid>
        </Box>
      </FlexScrollArea>

      <StickyActionFooter
        dirtyCount={dirtyCount}
        isSaving={isBusy}
        isSaveDisabled={dirtyCount === 0 || isValid === false}
        leftExtra={(
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconRestore size={14} stroke={Common.IconStrokeSize}/>}
            disabled={isBusy}
            onClick={handleReset}
          >
            {t("extensionConfiguration.reset")}
          </Button>
        )}
        onCancel={resetDraftToInitial}
        onSave={() => void save()}
      />
    </Flex>
  );
}
