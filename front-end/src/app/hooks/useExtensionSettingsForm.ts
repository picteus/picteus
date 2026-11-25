import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionSettings } from "@picteus/ws-client";

import { countObjectFieldChanges, ToastService } from "utils";
import { ErrorService } from "app/services";
import { extractSchemaAndUiSchema, normalizeFormDataWithSchema } from "app/components/RjsfForm/RjsfForm.tsx";
import { useExtensionSettings, useSetExtensionSettingsMutation } from "./queries";


type EditedDraftStateType =
  {
    readonly extensionId: string;
    readonly value: Record<string, unknown> | undefined;
  };

export type UseExtensionSettingsFormResultType =
  {
    readonly persistedSettings: ExtensionSettings | undefined;
    readonly isLoading: boolean;
    readonly isLoadError: boolean;
    readonly loadError: Error | null;
    readonly refetch: () => Promise<unknown>;
    readonly schema: ReturnType<typeof extractSchemaAndUiSchema>["schema"];
    readonly uiSchema: ReturnType<typeof extractSchemaAndUiSchema>["uiSchema"];
    readonly draftValue: Record<string, unknown> | undefined;
    readonly setDraftValue: (value: Record<string, unknown> | undefined) => void;
    readonly isValid: boolean;
    readonly setIsValid: (isValid: boolean) => void;
    readonly dirtyCount: number;
    readonly formKey: string;
    readonly saveErrorMessage: string | undefined;
    readonly isSaving: boolean;
    readonly save: () => Promise<ExtensionSettings | undefined>;
    readonly resetDraftToInitial: () => void;
    readonly replaceDraftWithPersisted: (value: Record<string, unknown> | undefined) => void;
  };

export default function useExtensionSettingsForm(extension: Extension): UseExtensionSettingsFormResultType
{
  const [ t ] = useTranslation();
  const extensionId = extension.manifest.id;
  const {
    data: persistedSettings,
    isLoading,
    isError: isLoadError,
    error: loadError,
    refetch
  } = useExtensionSettings(extensionId, true);

  const {
    mutateAsync: setExtensionSettingsMutateAsync,
    isPending: isSaving
  } = useSetExtensionSettingsMutation();

  const [ editedDraft, setEditedDraft ] = useState<EditedDraftStateType | undefined>(undefined);
  const [ isValid, setIsValid ] = useState<boolean>(true);
  const [ formRevision, setFormRevision ] = useState<number>(0);
  const [ saveErrorMessage, setSaveErrorMessage ] = useState<string | undefined>(undefined);

  const { schema, uiSchema } = useMemo(
    () => extractSchemaAndUiSchema(extension.manifest.settings),
    [ extension.manifest.settings ]
  );

  const initialValue = useMemo<Record<string, unknown> | undefined>(() =>
  {
    if (persistedSettings === undefined)
    {
      return undefined;
    }
    const rawValue = (persistedSettings.value as Record<string, unknown> | undefined) ?? {};
    return normalizeFormDataWithSchema(rawValue, schema) as Record<string, unknown> | undefined;
  }, [ persistedSettings, schema ]);

  const draftValue = editedDraft?.extensionId === extensionId
    ? editedDraft.value
    : initialValue;

  const previousExtensionIdRef = useRef<string>(extensionId);
  const previousInitialValueRef = useRef<Record<string, unknown> | undefined>(initialValue);

  useEffect(() =>
  {
    const previousExtensionId = previousExtensionIdRef.current;
    const previousInitialValue = previousInitialValueRef.current;
    previousExtensionIdRef.current = extensionId;
    previousInitialValueRef.current = initialValue;

    if (previousExtensionId !== extensionId)
    {
      setEditedDraft(undefined);
      setSaveErrorMessage(undefined);
      return;
    }

    if (previousInitialValue !== initialValue && initialValue !== undefined)
    {
      const wasCleanAgainstPrevious = previousInitialValue === undefined
        || countObjectFieldChanges(previousInitialValue, draftValue) === 0;
      if (wasCleanAgainstPrevious === true)
      {
        setEditedDraft(undefined);
        if (countObjectFieldChanges(initialValue, draftValue) > 0)
        {
          setFormRevision(previous => previous + 1);
        }
      }
    }
  }, [ extensionId, initialValue, draftValue ]);

  const setDraftValue = useCallback((value: Record<string, unknown> | undefined): void =>
  {
    setEditedDraft({ extensionId, value });
  }, [ extensionId ]);

  const dirtyCount = useMemo<number>(
    () => (persistedSettings === undefined ? 0 : countObjectFieldChanges(initialValue, draftValue)),
    [ persistedSettings, initialValue, draftValue ]
  );

  const save = useCallback(async (): Promise<ExtensionSettings | undefined> =>
  {
    if (isValid === false || dirtyCount === 0)
    {
      return undefined;
    }
    setSaveErrorMessage(undefined);
    const updatedSettings: ExtensionSettings = { value: draftValue };
    try
    {
      await setExtensionSettingsMutateAsync({
        id: extensionId,
        extensionSettings: updatedSettings
      });
      ToastService.success(t("extensionConfiguration.successSaving"));
      return updatedSettings;
    }
    catch (error)
    {
      const reason = await ErrorService.extractErrorReason(error);
      setSaveErrorMessage(reason.length > 0 ? reason : t("extensionConfiguration.errorSaving"));
      return undefined;
    }
  }, [ isValid, dirtyCount, draftValue, setExtensionSettingsMutateAsync, extensionId, t ]);

  const resetDraftToInitial = useCallback((): void =>
  {
    setEditedDraft(undefined);
    setSaveErrorMessage(undefined);
    setFormRevision(previous => previous + 1);
  }, []);

  const replaceDraftWithPersisted = useCallback((value: Record<string, unknown> | undefined): void =>
  {
    const normalizedValue = normalizeFormDataWithSchema(value ?? {}, schema) as Record<string, unknown> | undefined;
    setEditedDraft({ extensionId, value: normalizedValue });
    setSaveErrorMessage(undefined);
    setFormRevision(previous => previous + 1);
  }, [ extensionId, schema ]);

  return {
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
    formKey: `${extensionId}-${formRevision}`,
    saveErrorMessage,
    isSaving: isSaving === true,
    save,
    resetDraftToInitial,
    replaceDraftWithPersisted
  };
}
