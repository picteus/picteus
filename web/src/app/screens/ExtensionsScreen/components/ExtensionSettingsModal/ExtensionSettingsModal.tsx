import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Alert, Button, Flex } from "@mantine/core";
import { IconCircleX, IconInfoCircle } from "@tabler/icons-react";

import { Extension, ExtensionSettings } from "@picteus/ws-client";


import { notifyApiCallError, notifySuccess } from "utils";
import { ExtensionsService } from "app/services";
import { extractSchemaAndUiSchema, RjsfForm } from "app/components";


const propertiesName = "properties";

function hasSettings(extension: Extension, extensionSettings: ExtensionSettings): boolean  {
  return extension?.manifest.settings?.[propertiesName] !== undefined && Object.keys(extension?.manifest.settings?.[propertiesName]).length > 0 && extensionSettings !== undefined;
}

type ExtensionSettingsModalType = {
  extension: Extension;
  onSuccess: (settings: ExtensionSettings) => void;
};

export default function ExtensionSettingsModal({
  extension,
  onSuccess,
}: ExtensionSettingsModalType) {
  const [t] = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [extensionSettings, setExtensionSettings] = useState<ExtensionSettings>();

  async function load() {
    setLoading(true);
    try {
      const settings = await ExtensionsService.getSettings({
        id: extension.manifest.id,
      });

      setExtensionSettings(settings);
    } catch (error) {
      notifyApiCallError(error, t("extensionSettingsModal.errorLoading"));
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
      notifyApiCallError(error, t("extensionSettingsModal.errorSaving"));
    } finally {
      onSuccess(extensionSettings);
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function renderForm() {
    if (hasSettings(extension, extensionSettings) === false) {
      return undefined;
    }
    const { schema, uiSchema } = extractSchemaAndUiSchema(extension?.manifest.settings);
    return <>
      <Alert mb="sm" icon={<IconInfoCircle />}>
        <Trans
          i18nKey="extensionSettingsModal.warning"
          components={{ strong: <b /> }}
          values={{ name: extension.manifest.id }}
        />
      </Alert>
      <RjsfForm
        initialFormData={extensionSettings?.value}
        schema={schema}
        uiSchema={uiSchema}
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
    </>;
  }
  function renderError() {
    return (
      hasSettings(extension, extensionSettings) === false && (
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
    <>
      {renderForm()}
      {renderError()}
    </>
  );
}
