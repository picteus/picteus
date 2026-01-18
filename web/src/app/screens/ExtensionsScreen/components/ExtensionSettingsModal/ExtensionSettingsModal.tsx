import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Extension } from "@picteus/ws-client";
import { IconCircleX, IconInfoCircle } from "@tabler/icons-react";
import { ExtensionSettings } from "@picteus/ws-client/src/models/ExtensionSettings.ts";
import { Alert, Button, Flex, Modal, Title } from "@mantine/core";

import { notifyError, notifySuccess } from "utils";
import { ExtensionsService } from "app/services";
import { RjsfForm } from "app/components";

type ExtensionSettingsModalType = {
  opened: boolean;
  extension: Extension;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ExtensionSettingsModal({
  opened,
  extension,
  onClose,
  onSuccess,
}: ExtensionSettingsModalType) {
  const [t] = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [extensionSettings, setExtensionSettings] =
    useState<ExtensionSettings>();

  async function load() {
    setLoading(true);
    try {
      const settings = await ExtensionsService.getSettings({
        id: extension.manifest.id,
      });

      setExtensionSettings(settings);
    } catch (error) {
      notifyError(t("extensionSettingsModal.errorLoading"));
      console.error(
        "An error occurred while loading the extension settings",
        error,
      );
    } finally {
      setLoading(false);
    }
  }
  async function handleOnSaveSettings() {
    setLoading(true);
    try {
      await ExtensionsService.setSettings({
        id: extension.manifest.id,
        extensionSettings,
      });
      notifySuccess(t("extensionSettingsModal.successSaving"));
    } catch (error) {
      notifyError(t("extensionSettingsModal.errorSaving"));
      console.error(
        "An error occurred while saving the extension settings",
        error,
      );
    } finally {
      onSuccess();
      setLoading(false);
    }
  }

  useEffect(() => {
    if (opened) {
      void load();
    }
  }, [opened]);

  function renderForm() {
    return (
      extension?.manifest.settings?.["properties"] &&
      extensionSettings && (
        <>
          <Alert mb="sm" icon={<IconInfoCircle />}>
            <Trans
              i18nKey="extensionSettingsModal.warning"
              components={{ strong: <b /> }}
              values={{ name: extension.manifest.id }}
            />
          </Alert>
          <RjsfForm
            initialFormData={extensionSettings?.value}
            schema={extension?.manifest.settings}
            onChange={(value) => setExtensionSettings({ value })}
          />
          <Flex justify="flex-end" mt="md">
            <Button
              onClick={handleOnSaveSettings}
              loading={loading}
              disabled={loading}
              type="submit"
            >
              {t("button.save")}
            </Button>
          </Flex>
        </>
      )
    );
  }
  function renderError() {
    return (
      !extension?.manifest?.settings?.["properties"] && (
        <>
          <Alert color="red" mb="sm" icon={<IconCircleX />}>
            <Trans
              i18nKey="extensionSettingsModal.error"
              components={{ strong: <b /> }}
              values={{ name: extension?.manifest.id }}
            />
          </Alert>
        </>
      )
    );
  }

  return (
    <Modal
      size="lg"
      opened={opened}
      onClose={loading ? () => {} : onClose}
      title={<Title order={3}>{t("extensionSettingsModal.title")}</Title>}
      padding="lg"
    >
      {renderForm()}
      {renderError()}
    </Modal>
  );
}
