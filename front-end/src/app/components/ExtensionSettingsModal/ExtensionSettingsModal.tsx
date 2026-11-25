import { ReactElement, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Paper, Stack, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionSettings } from "@picteus/ws-client";

import { ManualSection } from "types";
import { extractMarkdownParagraph, ROUTES } from "utils";
import { useModalContext } from "app/context";
import { useExtension, useExtensionSettingsForm, useModalDiscardGuard } from "app/hooks";
import ActionLink from "../ActionLink/ActionLink.tsx";
import Common from "../Common/Common.ts";
import ErrorAlert from "../ErrorAlert/ErrorAlert.tsx";
import { createOpenExtensionNavigationState } from "../ExtensionPage/ExtensionPage.tsx";
import Loader from "../Loader/Loader.tsx";
import Markdown from "../Markdown/Markdown.tsx";
import ModalActions from "../ModalActions/ModalActions.tsx";
import ModalError from "../ModalError/ModalError.tsx";
import RjsfForm from "../RjsfForm/RjsfForm.tsx";


type ExtensionSettingsModalPropsType =
  {
    readonly extension: Extension;
    readonly onSuccess?: (settings?: ExtensionSettings) => void;
    readonly onOpenFullPage?: () => void;
  };

export default function ExtensionSettingsModal({
  extension,
  onSuccess,
  onOpenFullPage
}: ExtensionSettingsModalPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const modalContext = useModalContext();

  const {
    persistedSettings,
    isLoading,
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
    save
  } = useExtensionSettingsForm(extension);
  const { data: extensionAndManual } = useExtension(extension.manifest.id);

  const isDirty = dirtyCount > 0;

  const prerequisitesMarkdown = useMemo(() =>
  {
    const manual = extensionAndManual?.manual?.instructions;
    if (manual === undefined)
    {
      return undefined;
    }
    return extractMarkdownParagraph(manual, ManualSection.Prerequisites);
  }, [ extensionAndManual?.manual?.instructions ]);

  const closeWithDiscardGuard = useModalDiscardGuard({
    isDirty,
    discardTitle: t("extensionConfiguration.discardTitle"),
    discardMessage: t("extensionSettingsModal.discardMessage", { name: extension.manifest.name })
  });

  function handleOpenFullPage(): void
  {
    closeWithDiscardGuard(() =>
    {
      if (onOpenFullPage !== undefined)
      {
        onOpenFullPage();
        return;
      }
      navigate(ROUTES.extensions, {
        state: createOpenExtensionNavigationState(extension.manifest.id, "settings")
      });
    });
  }

  async function handleSave(): Promise<void>
  {
    const updatedSettings = await save();
    if (updatedSettings !== undefined)
    {
      onSuccess?.(updatedSettings);
      modalContext?.closeModal(true);
    }
  }

  return (
    <>
      {isLoadError === true && persistedSettings === undefined ? (
        <ErrorAlert
          title={t("extensionConfiguration.errorLoading")}
          message={loadError?.message}
          onRetry={() => void refetch()}
        />
      ) : persistedSettings === undefined ? (
        <Loader/>
      ) : (
        <Stack gap="md">
          <ModalError
            title={t("extensionConfiguration.saveErrorTitle")}
            error={saveErrorMessage}
            onRetry={() => void handleSave()}
            isRetrying={isSaving}
          />

          {prerequisitesMarkdown !== undefined && prerequisitesMarkdown.trim().length > 0 && (
            <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-default-hover)">
              <Stack gap={4}>
                <Text size="xs" fw={600} c="dimmed">
                  {t("extensionConfiguration.prerequisitesHeading")}
                </Text>
                <Markdown content={prerequisitesMarkdown} size="xs"/>
              </Stack>
            </Paper>
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
      )}

      <ModalActions
        isBusy={isSaving}
        leftSection={(
          <ActionLink
            leftSection={<IconAdjustmentsHorizontal size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={handleOpenFullPage}
          >
            {t("extensionSettingsModal.openFullPage")}
          </ActionLink>
        )}
        status={isDirty === true ? (
          <Text size="xs" c="orange" fw={500}>
            {t("extensionConfiguration.unsavedCount", { count: dirtyCount })}
          </Text>
        ) : undefined}
      >
        <Button
          loading={isSaving}
          disabled={isLoading === true || isSaving === true || isDirty === false || isValid === false}
          onClick={() => void handleSave()}
        >
          {t("button.save")}
        </Button>
      </ModalActions>
    </>
  );
}
