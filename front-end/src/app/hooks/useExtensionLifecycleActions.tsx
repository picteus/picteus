import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { IconBox } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionState, Manifest } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import Common from "app/components/Common/Common.ts";
import InstallOrUpdateExtension from "app/components/InstallOrUpdateExtension/InstallOrUpdateExtension.tsx";
import MarketplaceUpdateModal from "app/components/MarketplaceUpdateModal/MarketplaceUpdateModal.tsx";
import useConfirmAction from "./useConfirmAction.tsx";
import {
  useChangeExtensionStateMutation,
  useInstallMarketplaceExtensionMutation,
  useUninstallExtensionMutation,
  useUpdateMarketplaceExtensionMutation
} from "./queries";


function addIdToSet(previous: Set<string>, id: string): Set<string>
{
  const next = new Set(previous);
  next.add(id);
  return next;
}

function removeIdFromSet(previous: Set<string>, id: string): Set<string>
{
  const next = new Set(previous);
  next.delete(id);
  return next;
}

async function runTracked(
  setIds: Dispatch<SetStateAction<Set<string>>>,
  id: string,
  task: () => Promise<void>
): Promise<void>
{
  setIds(previous => addIdToSet(previous, id));
  try
  {
    await task();
  }
  finally
  {
    setIds(previous => removeIdFromSet(previous, id));
  }
}

export type OpenInstallOrUpdateModalOptionsType =
  {
    readonly onSuccess?: (extension: Extension) => void;
  };

export type UseExtensionLifecycleActionsResultType =
  {
    readonly installingIds: ReadonlySet<string>;
    readonly updatingIds: ReadonlySet<string>;
    readonly togglingIds: ReadonlySet<string>;
    readonly uninstallingIds: ReadonlySet<string>;
    readonly installMarketplaceExtension: (manifest: Manifest) => void;
    readonly toggleExtensionState: (extension: Extension) => Promise<void>;
    readonly updateMarketplaceExtension: (extension: Extension, targetVersion: string) => void;
    readonly openInstallOrUpdateModal: (extension?: Extension, options?: OpenInstallOrUpdateModalOptionsType) => void;
    readonly uninstallExtension: (extension: Extension, onAfterUninstall?: () => void) => void;
  };

export default function useExtensionLifecycleActions(): UseExtensionLifecycleActionsResultType
{
  const [ t ] = useTranslation();
  const confirmAction = useConfirmAction();
  const { addModal } = useActionModalContext();

  const { mutateAsync: installMarketplaceMutateAsync } = useInstallMarketplaceExtensionMutation();
  const { mutateAsync: updateMarketplaceMutateAsync } = useUpdateMarketplaceExtensionMutation();
  const { mutateAsync: changeStateMutateAsync } = useChangeExtensionStateMutation();
  const { mutateAsync: uninstallMutateAsync } = useUninstallExtensionMutation();

  const [ installingIds, setInstallingIds ] = useState<Set<string>>(() => new Set());
  const [ updatingIds, setUpdatingIds ] = useState<Set<string>>(() => new Set());
  const [ togglingIds, setTogglingIds ] = useState<Set<string>>(() => new Set());
  const [ uninstallingIds, setUninstallingIds ] = useState<Set<string>>(() => new Set());

  const installMarketplaceExtension = useCallback((manifest: Manifest): void =>
  {
    confirmAction({
      options: {
        title: t("extension.confirmInstallTitle"),
        message: t("extension.confirmInstallMessage", { name: manifest.name }),
        content: t("extension.confirmInstallConsequences")
      },
      onConfirm: async (): Promise<void> =>
      {
        await runTracked(setInstallingIds, manifest.id, async () =>
        {
          try
          {
            await installMarketplaceMutateAsync({ id: manifest.id, state: ExtensionState.Enabled });
            ToastService.success(t("extension.successInstall"));
          }
          catch (error)
          {
            ToastService.apiCallI18nError(error, "extension.errorInstall");
          }
        });
      }
    });
  }, [ confirmAction, installMarketplaceMutateAsync, t ]);

  const toggleExtensionState = useCallback(async (extension: Extension): Promise<void> =>
  {
    const id = extension.manifest.id;
    await runTracked(setTogglingIds, id, async () =>
    {
      try
      {
        await changeStateMutateAsync({
          id,
          state: extension.state === ExtensionState.Enabled ? ExtensionState.Paused : ExtensionState.Enabled
        });
      }
      catch (error)
      {
        ToastService.apiCallI18nError(error, "extension.errorToggleStatus");
      }
    });
  }, [ changeStateMutateAsync ]);

  const updateMarketplaceExtension = useCallback((extension: Extension, targetVersion: string): void =>
  {
    const id = extension.manifest.id;
    addModal({
      title: t("extension.updateTitleWithName", { name: extension.manifest.name }),
      subtitle: t("marketplaceUpdateModal.subtitle"),
      icon: { url: ExtensionsService.getIconURL(extension) },
      size: "s",
      body: (
        <MarketplaceUpdateModal
          extension={extension}
          targetVersion={targetVersion}
          onConfirmUpdate={async (): Promise<void> =>
          {
            await runTracked(setUpdatingIds, id, async () =>
            {
              await updateMarketplaceMutateAsync({ id });
              ToastService.success(t("extension.successUpdate", { version: targetVersion }));
            });
          }}
        />
      )
    });
  }, [ addModal, updateMarketplaceMutateAsync, t ]);

  const openInstallOrUpdateModal = useCallback((
    extension?: Extension,
    options?: OpenInstallOrUpdateModalOptionsType
  ): void =>
  {
    addModal({
      title: extension !== undefined
        ? t("extension.updateTitleWithName", { name: extension.manifest.name })
        : t("installExtensionModal.title"),
      subtitle: extension !== undefined
        ? t("updateExtensionModal.subtitle", { name: extension.manifest.name })
        : t("installExtensionModal.subtitle"),
      icon: extension !== undefined
        ? { url: ExtensionsService.getIconURL(extension) }
        : { icon: <IconBox stroke={Common.IconStrokeSize}/> },
      size: "m",
      body: (
        <InstallOrUpdateExtension
          extension={extension}
          onSuccess={(installedOrUpdatedExtension: Extension) =>
          {
            ToastService.success(
              t(extension !== undefined ? "updateExtensionModal.successAdd" : "installExtensionModal.successAdd")
            );
            options?.onSuccess?.(installedOrUpdatedExtension);
          }}
        />
      )
    });
  }, [ addModal, t ]);

  const uninstallExtension = useCallback((extension: Extension, onAfterUninstall?: () => void): void =>
  {
    confirmAction({
      options: {
        title: t("extension.confirmDeleteTitle"),
        message: t("extension.confirmDeleteMessage", {
          name: extension.manifest.name
        }),
        content: t("extension.confirmDeleteConsequences")
      },
      onConfirm: async (): Promise<void> =>
      {
        const id = extension.manifest.id;
        await runTracked(setUninstallingIds, id, async () =>
        {
          try
          {
            await uninstallMutateAsync(id);
            ToastService.success(t("extension.successUninstall"));
            onAfterUninstall?.();
          }
          catch (error)
          {
            ToastService.apiCallI18nError(error, "extension.errorUninstall");
          }
        });
      }
    });
  }, [ confirmAction, uninstallMutateAsync, t ]);

  return {
    installingIds,
    updatingIds,
    togglingIds,
    uninstallingIds,
    installMarketplaceExtension,
    toggleExtensionState,
    updateMarketplaceExtension,
    openInstallOrUpdateModal,
    uninstallExtension
  };
}
