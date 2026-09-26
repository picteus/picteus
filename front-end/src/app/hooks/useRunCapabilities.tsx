import React, { useCallback } from "react";
import i18n from "i18next";

import { SearchOriginNature, SearchParameters } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { RunCapabilitiesConfirm } from "app/components";


type RunCapabilitiesHookType = {
  runCapabilities: (id: string) => void;
  searchRunCapabilities: (searchParameters: SearchParameters) => void;
};

export default function useRunCapabilities(): RunCapabilitiesHookType
{
  const [ , addModal, removeModal ] = useActionModalContext();

  const openConfirmation = useCallback((searchParameters: SearchParameters, onConfirm: (extensionIds: string[]) => void): void =>
  {
    const id = addModal({
      title: i18n.t("runCapabilitiesModal.title"),
      size: "m",
      component: <RunCapabilitiesConfirm
        searchParameters={searchParameters}
        onConfirm={(extensionIds: string[]) =>
        {
          onConfirm(extensionIds);
          removeModal(id);
        }}
      />
    });
  }, [ addModal, removeModal ]);

  const runCapabilities = useCallback((id: string): void =>
  {
    const searchParameters: SearchParameters = { filter: { origin: { kind: SearchOriginNature.Images, ids: [ id ] } } };
    openConfirmation(searchParameters, (extensionIds: string[]) =>
    {
      ImageService.runCapabilities({ id, extensionIds }).catch(ToastService.apiCallError);
    });
  }, [ openConfirmation ]);

  const searchRunCapabilities = useCallback((searchParameters: SearchParameters): void =>
  {
    openConfirmation(searchParameters, (extensionIds: string[]) =>
    {
      ImageService.searchRunCapabilities({ searchParameters, extensionIds }).catch(ToastService.apiCallError);
    });
  }, [ openConfirmation ]);

  return { runCapabilities, searchRunCapabilities };
}
