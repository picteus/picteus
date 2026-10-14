import React, { ForwardedRef, forwardRef, ReactElement, useEffect, useImperativeHandle, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Alert, Stack } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { Extension, ExtensionSettings as ApiExtensionSettings } from "@picteus/ws-client";

import { ManualSection } from "types";
import { extractMarkdownParagraph, ToastService } from "utils";
import { useExtension, useResetExtensionSettingsMutation, useSetExtensionSettingsMutation } from "app/hooks";
import { ExtensionsService } from "app/services";
import { extractSchemaAndUiSchema, Loader, Manual, RjsfForm } from "app/components";


const propertiesName = "properties";

export function hasExtensionSettings(extension: Extension): boolean
{
  return extension.manifest.settings?.[propertiesName] !== undefined && Object.keys(extension.manifest.settings[propertiesName]).length > 0;
}

export type ExtensionSettingsRefType =
  {
    save: () => Promise<void>;
    reset: () => Promise<ApiExtensionSettings>;
    readonly isDirty: boolean;
    readonly isValid: boolean;
    readonly settings?: ApiExtensionSettings;
  };

export type ExtensionSettingsPropsType =
  {
    readonly extension: Extension;
    readonly onValidityChange?: (isValid: boolean) => void;
    readonly onDirtyChange: (isDirty: boolean) => void;
    readonly onLoadingChange: (isLoading: boolean) => void;
    readonly onSaveFailedChange: (saveFailed: boolean) => void;
  };

function ExtensionSettings(
  {
    extension,
    onValidityChange,
    onDirtyChange,
    onLoadingChange,
    onSaveFailedChange
  }: ExtensionSettingsPropsType,
  ref: ForwardedRef<ExtensionSettingsRefType>
): ReactElement | null
{
  const [ t ] = useTranslation();

  const [ loading, setLoading ] = useState<boolean>(false);
  const [ saving, setSaving ] = useState<boolean>(false);
  const [ extensionSettings, setExtensionSettings ] = useState<ApiExtensionSettings>();
  const [ isSettingsDirty, setIsSettingsDirty ] = useState<boolean>(false);
  const [ isSettingsValid, setIsSettingsValid ] = useState<boolean>(true);
  const [ saveFailed, setSaveFailed ] = useState<boolean>(false);

  const { data: extensionAndManual } = useExtension(extension.manifest.id);
  const instructions = extensionAndManual?.manual?.instructions === undefined ? undefined : extractMarkdownParagraph(extensionAndManual.manual.instructions, ManualSection.Settings);

  const setExtensionSettingsMutation = useSetExtensionSettingsMutation();
  const resetExtensionSettingsMutation = useResetExtensionSettingsMutation();

  async function load(): Promise<void>
  {
    setLoading(true);
    try
    {
      const settings = await ExtensionsService.getSettings({ id: extension.manifest.id });
      setExtensionSettings(settings);
    }
    catch (error)
    {
      ToastService.apiCallError(error, t("extensionConfiguration.errorLoading"));
    }
    finally
    {
      setLoading(false);
    }
  }

  useEffect(() =>
  {
    void load();
  }, [ extension.manifest.id ]);

  async function handleSave(): Promise<void>
  {
    if (!isSettingsValid)
    {
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    try
    {
      await setExtensionSettingsMutation.mutateAsync({ id: extension.manifest.id, extensionSettings });
      setIsSettingsDirty(false);
    }
    catch (error)
    {
      setSaveFailed(true);
      throw error;
    }
    finally
    {
      setSaving(false);
    }
  }

  async function handleReset(): Promise<ApiExtensionSettings>
  {
    setSaving(true);
    try
    {
      const settings = await resetExtensionSettingsMutation.mutateAsync({
        id: extension.manifest.id
      });
      setExtensionSettings(settings);
      setIsSettingsDirty(false);
      setSaveFailed(false);
      return settings;
    }
    catch (error)
    {
      ToastService.apiCallError(error, t("extensionConfiguration.errorResetting"));
      throw error;
    }
    finally
    {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, (): ExtensionSettingsRefType =>
    ({
      save: handleSave,
      reset: handleReset,
      isDirty: isSettingsDirty,
      isValid: isSettingsValid,
      settings: extensionSettings
    })
  );

  useEffect(() =>
  {
    onValidityChange?.(isSettingsValid);
  }, [ isSettingsValid, onValidityChange ]);

  useEffect(() =>
  {
    onDirtyChange(isSettingsDirty);
  }, [ isSettingsDirty, onDirtyChange ]);

  useEffect(() =>
  {
    onLoadingChange(loading || saving || setExtensionSettingsMutation.isPending || resetExtensionSettingsMutation.isPending);
  }, [ loading, saving, setExtensionSettingsMutation.isPending, resetExtensionSettingsMutation.isPending, onLoadingChange ]);

  useEffect(() =>
  {
    onSaveFailedChange(saveFailed);
  }, [ saveFailed, onSaveFailedChange ]);

  if (loading && extension?.manifest?.settings?.[propertiesName] !== undefined && extensionSettings === undefined)
  {
    return <Loader/>;
  }

  if (hasExtensionSettings(extension) === false)
  {
    return null;
  }

  const { schema, uiSchema } = extractSchemaAndUiSchema(extension?.manifest.settings);

  return (
    <Stack gap="sm">
      <Alert mb="sm" icon={<IconInfoCircle/>}>
        <Trans
          i18nKey="extensionConfiguration.warning"
          components={{ strong: <b/> }}
          values={{ name: extension.manifest.name }}
        />
      </Alert>
      {instructions && <Manual content={instructions}/>}
      <RjsfForm
        initialFormData={extensionSettings?.value}
        schema={schema}
        uiSchema={uiSchema}
        onChange={(value) =>
        {
          setExtensionSettings({ value });
          setIsSettingsDirty(true);
        }}
        onValidationChange={setIsSettingsValid}
      />
    </Stack>
  );
}

export default forwardRef(ExtensionSettings);
