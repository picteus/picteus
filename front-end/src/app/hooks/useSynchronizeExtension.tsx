import React, { useCallback } from "react";
import i18n from "i18next";

import { Extension } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ExtensionsService } from "app/services";
import { ExtensionIcon, SynchronizeExtensionConfirm } from "app/components";


export default function useSynchronizeExtension(): (extension: Extension) => void
{
  const [ , addModal, removeModal ] = useActionModalContext();

  return useCallback((extension: Extension): void =>
  {
    const id = addModal({
      title: i18n.t("synchronizeExtensionModal.title"),
      size: "s",
      icon: { icon: <ExtensionIcon idOrExtension={extension.manifest.id} size="md"/> },
      component: <SynchronizeExtensionConfirm
        extension={extension}
        onConfirm={() =>
        {
          void synchronizeExtension(extension);
          removeModal(id);
        }}
      />
    });
  }, [ addModal, removeModal ]);
}

async function synchronizeExtension(extension: Extension): Promise<void>
{
  try
  {
    await ExtensionsService.synchronize({ id: extension.manifest.id });
    ToastService.success(i18n.t("extensionsScreen.successSynchronize", { name: extension.manifest.name }));
  }
  catch (error)
  {
    ToastService.apiCallI18nError(error, "extensionsScreen.errorToggleStatus");
  }
}
