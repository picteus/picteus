import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Alert, Button, Flex } from "@mantine/core";
import { IconCircleX, IconInfoCircle } from "@tabler/icons-react";

import { Extension, ExtensionSettings } from "@picteus/ws-client";


import { ToastService } from "utils";
import { ExtensionsService } from "app/services";
import { extractSchemaAndUiSchema, RjsfForm } from "app/components";


const propertiesName = "properties";

function hasSettings(extension: Extension, extensionSettings: ExtensionSettings): boolean
{
  return extension?.manifest.settings?.[propertiesName] !== undefined && Object.keys(extension?.manifest.settings?.[propertiesName]).length > 0 && extensionSettings !== undefined;
}

type ExtensionSettingsModalType = {
  extension: Extension;
  onSuccess: (settings: ExtensionSettings) => void;
};

export default function ExtensionSettingsModal({
  extension,
  onSuccess
}: ExtensionSettingsModalType)
{
  const [ t ] = useTranslation();
  const [ loading, setLoading ] = useState<boolean>(false);
  const [ extensionSettings, setExtensionSettings ] = useState<ExtensionSettings>();
  const [ saveFailed, setSaveFailed ] = useState<boolean>(false);
  const [ isValid, setIsValid ] = useState<boolean>(true);

  async function load()
  {
    setLoading(true);
    try
    {
      const settings = await ExtensionsService.getSettings({
        id: extension.manifest.id
      });

      setExtensionSettings(settings);
    }
    catch (error)
    {
      ToastService.apiCallError(error, t("extensionSettingsModal.errorLoading"));
    }
    finally
    {
      setLoading(false);
    }
  }

  async function handleOnSaveSettings()
  {
    setLoading(true);
    setSaveFailed(false);
    try
    {
      await ExtensionsService.setSettings({
        id: extension.manifest.id,
        extensionSettings
      });
      ToastService.success(t("extensionSettingsModal.successSaving"));
      onSuccess(extensionSettings);
    }
    catch (error)
    {
      ToastService.apiCallError(error, t("extensionSettingsModal.errorSaving"));
      setSaveFailed(true);
    }
    finally
    {
      setLoading(false);
    }
  }

  async function handleOnResetSettings()
  {
    setLoading(true);
    try
    {
      const settings = await ExtensionsService.resetSettings({
        id: extension.manifest.id
      });
      setExtensionSettings(settings);
      setSaveFailed(false);
      ToastService.success(t("extensionSettingsModal.successResetting"));
      onSuccess(settings);
    }
    catch (error)
    {
      ToastService.apiCallError(error, t("extensionSettingsModal.errorResetting"));
    }
    finally
    {
      setLoading(false);
    }
  }

  useEffect(() =>
  {
    void load();
  }, []);

  function renderForm()
  {
    if (hasSettings(extension, extensionSettings) === false)
    {
      return undefined;
    }
    const { schema, uiSchema } = extractSchemaAndUiSchema(extension?.manifest.settings);
    return <>
      <Alert mb="sm" icon={<IconInfoCircle/>}>
        <Trans
          i18nKey="extensionSettingsModal.warning"
          components={{ strong: <b/> }}
          values={{ name: extension.manifest.name }}
        />
      </Alert>
      <RjsfForm
        initialFormData={extensionSettings?.value}
        schema={schema}
        uiSchema={uiSchema}
        onChange={(value) => setExtensionSettings({ value })}
        onValidationChange={setIsValid}
      />
      <Flex justify="flex-end" mt="md" gap="sm">
        {saveFailed && (
          <Button
            onClick={() => void handleOnResetSettings()}
            loading={loading}
            disabled={loading}
            color="red"
          >
            {t("extensionSettingsModal.reset")}
          </Button>
        )}
        <Button
          onClick={() => void handleOnSaveSettings()}
          loading={loading}
          disabled={loading || !isValid}
          type="submit"
        >
          {t("button.save")}
        </Button>
      </Flex>
    </>;
  }

  function renderError()
  {
    return (
      hasSettings(extension, extensionSettings) === false && (
        <>
          <Alert color="red" mb="sm" icon={<IconCircleX/>}>
            <Trans
              i18nKey="extensionSettingsModal.error"
              components={{ strong: <b/> }}
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
