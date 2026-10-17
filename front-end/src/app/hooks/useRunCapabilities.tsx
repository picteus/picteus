import React, { useCallback } from "react";
import i18n from "i18next";

import { ManifestCapabilityId, SearchOriginNature, SearchParameters } from "@picteus/ws-client";

import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { RunCapabilitiesConfirm } from "app/components";


type RunCapabilitiesHookType =
  {
    readonly runCapabilities: (id: string, capabilityIds?: ManifestCapabilityId[]) => void;
    readonly searchRunCapabilities: (searchParameters: SearchParameters, capabilityIds?: ManifestCapabilityId[]) => void;
  };

export default function useRunCapabilities(): RunCapabilitiesHookType
{
  const { addModal, removeModal } = useActionModalContext();

  const openConfirmation = useCallback((
    searchParameters: SearchParameters,
    onConfirm: (extensionIds: string[], capabilityIds: ManifestCapabilityId[]) => void,
    capabilityIds?: ManifestCapabilityId[]
  ): void =>
  {
    const id = addModal({
      title: i18n.t("runCapabilitiesModal.title"),
      size: "m",
      body: <RunCapabilitiesConfirm
        searchParameters={searchParameters}
        capabilityIds={capabilityIds}
        onConfirm={(extensionIds: string[], capabilityIds: ManifestCapabilityId[]) =>
        {
          onConfirm(extensionIds, capabilityIds);
          removeModal(id);
        }}
      />
    });
  }, [ addModal, removeModal ]);

  const runCapabilities = useCallback((id: string, capabilityIds: ManifestCapabilityId[]): void =>
  {
    const searchParameters: SearchParameters = { filter: { origin: { kind: SearchOriginNature.Images, ids: [ id ] } } };
    openConfirmation(searchParameters, async (extensionIds: string[], capabilityIds: ManifestCapabilityId[]) =>
    {
      try
      {
        ToastService.progress(i18n.t("runCapabilitiesModal.synchronizingSingle"));
        await ImageService.runCapabilities({ id, extensionIds, capabilityIds });
        ToastService.success();
      }
      catch (error)
      {
        ToastService.apiCallError(error);
      }
    }, capabilityIds);
  }, [ openConfirmation ]);

  const searchRunCapabilities = useCallback((searchParameters: SearchParameters, capabilityIds: ManifestCapabilityId[]): void =>
  {
    openConfirmation(searchParameters, async (extensionIds: string[], capabilityIds: ManifestCapabilityId[]) =>
    {
      try
      {
        ToastService.progress(i18n.t("runCapabilitiesModal.synchronizingMultiple"));
        await ImageService.searchRunCapabilities({ searchParameters, extensionIds, capabilityIds });
        ToastService.success();
      }
      catch (error)
      {
        ToastService.apiCallError(error);
      }
    }, capabilityIds);
  }, [ openConfirmation ]);

  return { runCapabilities, searchRunCapabilities };
}
