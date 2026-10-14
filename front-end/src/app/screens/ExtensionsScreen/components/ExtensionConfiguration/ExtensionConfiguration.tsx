import React, { ReactElement, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Alert, Badge, Button, Tabs } from "@mantine/core";
import { IconCircleX } from "@tabler/icons-react";

import { Extension, ExtensionSettings as ApiExtensionSettings } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import { ModalActions } from "app/components";
import {
  ExtensionAiModelInstructions,
  ExtensionAiModelInstructionsRefType,
  ExtensionSettings,
  ExtensionSettingsRefType,
  hasExtensionSettings
} from "./components";


export type ExtensionConfigurationPropsType =
  {
    readonly extension: Extension;
    readonly onSuccess: (settings?: ApiExtensionSettings) => void;
  };

export default function ExtensionConfiguration({
  extension,
  onSuccess
}: ExtensionConfigurationPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const modalContext = useModalContext();

  const [ saving, setSaving ] = useState<boolean>(false);
  const [ isSettingsDirty, setIsSettingsDirty ] = useState<boolean>(false);
  const [ isSettingsValid, setIsSettingsValid ] = useState<boolean>(true);
  const [ isSettingsLoading, setIsSettingsLoading ] = useState<boolean>(false);
  const [ settingsSaveFailed, setSettingsSaveFailed ] = useState<boolean>(false);

  const [ isInstructionsValid, setIsInstructionsValid ] = useState<boolean>(true);
  const [ isInstructionsDirty, setIsInstructionsDirty ] = useState<boolean>(false);
  const [ isInstructionsLoading, setIsInstructionsLoading ] = useState<boolean>(false);

  const instructionCapabilities = ExtensionsService.computeInstructionCapabilities(extension);
  const isSchemaSettingsAvailable = hasExtensionSettings(extension);

  const [ activeTab, setActiveTab ] = useState<string>(isSchemaSettingsAvailable ? "settings" : "instructions");

  const settingsRef = useRef<ExtensionSettingsRefType>(null);
  const instructionsRef = useRef<ExtensionAiModelInstructionsRefType>(null);

  const isFormValid =
    (!isSchemaSettingsAvailable || isSettingsValid) &&
    (!instructionCapabilities.hasAnyInstructionCapability || isInstructionsValid);

  const isActionPending =
    saving ||
    isSettingsLoading ||
    isInstructionsLoading;

  async function handleOnResetSettings(): Promise<void>
  {
    if (!settingsRef.current)
    {
      return;
    }

    setSaving(true);
    try
    {
      const settings = await settingsRef.current.reset();
      ToastService.success(t("extensionConfiguration.successResetting"));
      onSuccess(settings);
      modalContext?.closeModal(true);
    }
    catch
    {
      // Error toast is already displayed inside ExtensionSettings
    }
    finally
    {
      setSaving(false);
    }
  }

  async function handleOnSaveAll(): Promise<void>
  {
    if (!isFormValid)
    {
      return;
    }

    setSaving(true);
    try
    {
      const calls: Promise<unknown>[] = [];

      const shouldSaveSettings = isSchemaSettingsAvailable && (isSettingsDirty || !instructionCapabilities.hasAnyInstructionCapability || (!isSettingsDirty && !isInstructionsDirty));
      if (shouldSaveSettings && settingsRef.current)
      {
        calls.push(settingsRef.current.save());
      }

      const shouldSaveInstructions = instructionCapabilities.hasAnyInstructionCapability && (isInstructionsDirty || !isSchemaSettingsAvailable || (!isSettingsDirty && !isInstructionsDirty));
      if (shouldSaveInstructions && instructionsRef.current)
      {
        calls.push(instructionsRef.current.save());
      }

      await Promise.all(calls);
      ToastService.success(t("extensionConfiguration.successSaving"));
      onSuccess(settingsRef.current?.settings);
      modalContext?.closeModal(true);
    }
    catch (error)
    {
      ToastService.apiCallError(error, t("extensionConfiguration.errorSaving"));
    }
    finally
    {
      setSaving(false);
    }
  }

  function renderError(): ReactElement
  {
    return (
      <Alert color="red" mb="sm" icon={<IconCircleX/>}>
        <Trans
          i18nKey="extensionConfiguration.error"
          components={{ strong: <b/> }}
          values={{ name: extension?.manifest.id }}
        />
      </Alert>
    );
  }

  function renderModalActions(): ReactElement
  {
    const showResetButton =
      settingsSaveFailed &&
      (activeTab === "settings" || !instructionCapabilities.hasAnyInstructionCapability);

    return (
      <ModalActions>
        {showResetButton && (
          <Button
            onClick={() => void handleOnResetSettings()}
            loading={isActionPending}
            disabled={isActionPending}
            color="red"
          >
            {t("extensionConfiguration.reset")}
          </Button>
        )}
        <Button
          onClick={() => void handleOnSaveAll()}
          loading={isActionPending}
          disabled={isActionPending || !isFormValid}
          type="submit"
        >
          {t("button.save")}
        </Button>
      </ModalActions>
    );
  }

  if (!isSchemaSettingsAvailable && !instructionCapabilities.hasAnyInstructionCapability)
  {
    return renderError();
  }

  const settingsElement = (
    <ExtensionSettings
      ref={settingsRef}
      extension={extension}
      onValidityChange={setIsSettingsValid}
      onDirtyChange={setIsSettingsDirty}
      onLoadingChange={setIsSettingsLoading}
      onSaveFailedChange={setSettingsSaveFailed}
    />
  );

  const instructionsElement = (
    <ExtensionAiModelInstructions
      ref={instructionsRef}
      extension={extension}
      hasCaptionCapability={instructionCapabilities.hasCaptionCapability}
      hasEligibleTagsCapability={instructionCapabilities.hasEligibleTagsCapability}
      onValidityChange={setIsInstructionsValid}
      onDirtyChange={setIsInstructionsDirty}
      onLoadingChange={setIsInstructionsLoading}
    />
  );

  function renderContent(): ReactElement
  {
    if (isSchemaSettingsAvailable && instructionCapabilities.hasAnyInstructionCapability)
    {
      return (
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value ?? "settings")}
        >
          <Tabs.List mb="md">
            <Tabs.Tab
              value="settings"
              rightSection={!isSettingsValid ? <Badge size="xs" color="red" variant="filled">!</Badge> : undefined}
            >
              {t("extensionConfiguration.tabs.settings")}
            </Tabs.Tab>
            <Tabs.Tab
              value="instructions"
              rightSection={!isInstructionsValid ? <Badge size="xs" color="red" variant="filled">!</Badge> : undefined}
            >
              {t("extensionConfiguration.tabs.instructions")}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="settings" keepMounted>
            {settingsElement}
          </Tabs.Panel>
          <Tabs.Panel value="instructions" keepMounted>
            {instructionsElement}
          </Tabs.Panel>
        </Tabs>
      );
    }

    if (instructionCapabilities.hasAnyInstructionCapability)
    {
      return instructionsElement;
    }

    return settingsElement;
  }

  return (
    <>
      {renderContent()}
      {renderModalActions()}
    </>
  );
}
