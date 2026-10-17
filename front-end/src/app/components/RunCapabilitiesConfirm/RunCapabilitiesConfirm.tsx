import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Checkbox, Divider, Flex, ScrollArea, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { ExtensionState, ManifestCapability, ManifestCapabilityId, SearchParameters } from "@picteus/ws-client";
import { useExtensionsAll } from "app/hooks";
import { EligibleExtensionType, ExtensionsService, StorageService } from "app/services";
import { ExtensionBadge, ExtensionCapability, ImagesCollection, ModalActions } from "app/components";


type RunCapabilitiesConfirmPropsType =
  {
    readonly searchParameters: SearchParameters;
    readonly onConfirm: (extensionIds: string[], capabilityIds?: ManifestCapabilityId[]) => void;
    readonly capabilityIds?: ManifestCapabilityId[];
  };

export default function RunCapabilitiesConfirm({
  searchParameters,
  onConfirm,
  capabilityIds
}: RunCapabilitiesConfirmPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { data } = useExtensionsAll();
  const [ selectedCapabilityIds, setSelectedCapabilityIds ] = useState<ManifestCapabilityId[]>([]);
  const [ selectedExtensionIds, setSelectedExtensionIds ] = useState<string[]>([]);
  const hasInitializedCapabilities = useRef<boolean>(false);
  const hasInitializedSelection = useRef<boolean>(false);

  // We determine which synchronization capabilities are actually supported by installed and enabled extensions
  const availableCapabilityIds = useMemo((): ManifestCapabilityId[] =>
  {
    const baseCapabilityIds = capabilityIds ?? ExtensionsService.synchronizationCapabilityIds;
    if (data === undefined)
    {
      return baseCapabilityIds;
    }
    const enabledExtensionIdSet = new Set<string>(data.extensions.filter((extension) => extension.state === ExtensionState.Enabled).map((extension) => extension.manifest.id));
    return baseCapabilityIds.filter((capabilityId) =>
    {
      const configurationCapability = data.extensionsConfiguration.capabilities.find((entity) => entity.capability.id === capabilityId
      );
      if (configurationCapability === undefined)
      {
        return false;
      }
      return configurationCapability.extensionIds.some((extensionId) => enabledExtensionIdSet.has(extensionId) === true);
    });
  }, [ data, capabilityIds ]);

  useEffect((): void =>
  {
    // We restore the previous capability choice once the available list is ready, defaulting to all selected
    // and opting out the ones previously excluded by the user
    if (hasInitializedCapabilities.current === false && availableCapabilityIds.length > 0)
    {
      const excludedCapabilityIds = new Set<string>(StorageService.getRunCapabilitiesExcludedCapabilityIds());
      const initialSelectedCapabilityIds = availableCapabilityIds.filter(
        (capabilityId) => excludedCapabilityIds.has(capabilityId) === false
      );
      setSelectedCapabilityIds(
        initialSelectedCapabilityIds.length > 0 ? initialSelectedCapabilityIds : availableCapabilityIds
      );
      hasInitializedCapabilities.current = true;
    }
  }, [ availableCapabilityIds ]);

  const eligibleExtensions = useMemo((): EligibleExtensionType[] => ExtensionsService.computeEligibleExtensions(data?.extensions, data?.extensionsConfiguration, selectedCapabilityIds), [ data, selectedCapabilityIds ]);

  useEffect((): void =>
  {
    // We restore the previous choice once the eligible list is available, defaulting every extension to selected
    // and only opting out the ones the user previously excluded, so extensions installed since the last run are selected
    if (hasInitializedSelection.current === false && eligibleExtensions.length > 0)
    {
      const excludedExtensionIds = new Set<string>(StorageService.getRunCapabilitiesExcludedExtensionIds());
      setSelectedExtensionIds(eligibleExtensions
        .map((eligibleExtension) => eligibleExtension.extension.manifest.id)
        .filter((extensionId) => excludedExtensionIds.has(extensionId) === false));
      hasInitializedSelection.current = true;
    }
  }, [ eligibleExtensions ]);

  function persistChoice(selectedIds: string[], selectedCaps: ManifestCapabilityId[]): void
  {
    if (data === undefined)
    {
      return;
    }
    // We persist the opt-out set rather than the selection, which keeps newly installed extensions selected by default
    const installedExtensionIds = new Set<string>(data.extensions.map((extension) => extension.manifest.id));
    const eligibleExtensionIds = new Set<string>(eligibleExtensions.map((eligibleExtension) => eligibleExtension.extension.manifest.id));
    const selectedExtensionIdSet = new Set<string>(selectedIds);
    // We preserve the exclusions of extensions that are still installed but not currently eligible (for instance disabled ones)
    const excludedExtensionIds = StorageService.getRunCapabilitiesExcludedExtensionIds()
      .filter((extensionId) => installedExtensionIds.has(extensionId) === true && eligibleExtensionIds.has(extensionId) === false);
    // We add the currently eligible extensions the user left unselected
    for (const eligibleExtension of eligibleExtensions)
    {
      const extensionId = eligibleExtension.extension.manifest.id;
      if (selectedExtensionIdSet.has(extensionId) === false)
      {
        excludedExtensionIds.push(extensionId);
      }
    }
    StorageService.setRunCapabilitiesExcludedExtensionIds(excludedExtensionIds);

    // We persist excluded capabilities similarly
    const availableCapabilityIdSet = new Set<string>(availableCapabilityIds);
    const selectedCapabilityIdSet = new Set<string>(selectedCaps);
    const excludedCapabilityIds = StorageService.getRunCapabilitiesExcludedCapabilityIds()
      .filter((capabilityId) => availableCapabilityIdSet.has(capabilityId) === false);
    for (const capabilityId of availableCapabilityIds)
    {
      if (selectedCapabilityIdSet.has(capabilityId) === false)
      {
        excludedCapabilityIds.push(capabilityId);
      }
    }
    StorageService.setRunCapabilitiesExcludedCapabilityIds(excludedCapabilityIds);
  }

  function toggleCapability(capabilityId: ManifestCapabilityId, isChecked: boolean): void
  {
    setSelectedCapabilityIds((currentIds) =>
    {
      if (isChecked === true)
      {
        return currentIds.includes(capabilityId) === false ? [ ...currentIds, capabilityId ] : currentIds;
      }
      return currentIds.filter((currentId) => currentId !== capabilityId);
    });
  }

  function toggleExtension(extensionId: string, isChecked: boolean): void
  {
    setSelectedExtensionIds((currentIds) =>
    {
      if (isChecked === true)
      {
        return currentIds.indexOf(extensionId) === -1 ? [ ...currentIds, extensionId ] : currentIds;
      }
      return currentIds.filter((currentId) => currentId !== extensionId);
    });
  }

  function toggleAll(isChecked: boolean): void
  {
    if (isChecked === true)
    {
      const currentIdSet = new Set<string>(selectedExtensionIds);
      for (const eligibleExtension of eligibleExtensions)
      {
        currentIdSet.add(eligibleExtension.extension.manifest.id);
      }
      setSelectedExtensionIds(Array.from(currentIdSet));
    }
    else
    {
      const eligibleExtensionIdSet = new Set<string>(
        eligibleExtensions.map((eligibleExtension) => eligibleExtension.extension.manifest.id)
      );
      setSelectedExtensionIds((currentIds) => currentIds.filter((currentId) => eligibleExtensionIdSet.has(currentId) === false));
    }
  }

  const eligibleExtensionIdSet = useMemo((): Set<string> =>
  {
    return new Set<string>(eligibleExtensions.map((eligibleExtension) => eligibleExtension.extension.manifest.id));
  }, [ eligibleExtensions ]);

  const effectiveSelectedExtensionIds = useMemo((): string[] =>
  {
    return selectedExtensionIds.filter((extensionId) => eligibleExtensionIdSet.has(extensionId) === true);
  }, [ selectedExtensionIds, eligibleExtensionIdSet ]);

  function handleConfirm(): void
  {
    persistChoice(effectiveSelectedExtensionIds, selectedCapabilityIds);
    onConfirm(effectiveSelectedExtensionIds, selectedCapabilityIds);
  }

  const hasAvailableCapabilities = availableCapabilityIds.length > 0;
  const hasSelectedCapabilities = selectedCapabilityIds.length > 0;
  const hasEligibleExtensions = eligibleExtensions.length > 0;
  const areAllSelected = hasEligibleExtensions === true && eligibleExtensions.every((eligibleExtension) => selectedExtensionIds.includes(eligibleExtension.extension.manifest.id));
  const areSomeSelected = hasEligibleExtensions === true && eligibleExtensions.some((eligibleExtension) => selectedExtensionIds.includes(eligibleExtension.extension.manifest.id)) && areAllSelected === false;
  const canConfirm = hasSelectedCapabilities === true && effectiveSelectedExtensionIds.length > 0;

  return (
    <Stack gap="md">
      <Alert icon={<IconAlertTriangle/>} color="orange">
        {t("runCapabilitiesModal.explanation")}
      </Alert>

      <ImagesCollection
        searchParameters={searchParameters}
        explanation={t("runCapabilitiesModal.collectionExplanation")}
      />

      {hasAvailableCapabilities === true ? (
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {t("runCapabilitiesModal.capabilities")}
          </Text>
          <Flex align="center" gap="md" wrap="wrap">
            {availableCapabilityIds.map((capabilityId) => (
              <Checkbox
                key={capabilityId}
                checked={selectedCapabilityIds.includes(capabilityId) === true}
                onChange={(event) => toggleCapability(capabilityId, event.currentTarget.checked)}
                label={<ExtensionCapability capability={{ id: capabilityId } as ManifestCapability}/>}
              />
            ))}
          </Flex>
        </Stack>
      ) : null}

      {hasAvailableCapabilities === false ? (
        <Text c="dimmed" size="sm">
          {t("runCapabilitiesModal.noExtensions")}
        </Text>
      ) : hasSelectedCapabilities === false ? (
        <Text c="dimmed" size="sm">
          {t("runCapabilitiesModal.noCapabilities")}
        </Text>
      ) : hasEligibleExtensions === true ? (
        <Stack gap="xs">
          <Divider/>
          <Checkbox
            checked={areAllSelected}
            indeterminate={areSomeSelected}
            label={t("runCapabilitiesModal.selectAll")}
            onChange={(event) => toggleAll(event.currentTarget.checked)}
          />
          <ScrollArea.Autosize mah="clamp(160px, 40dvh, 480px)">
            <Stack gap="xs">
              {eligibleExtensions.map((eligibleExtension) => (
                <Checkbox
                  key={eligibleExtension.extension.manifest.id}
                  checked={selectedExtensionIds.includes(eligibleExtension.extension.manifest.id) === true}
                  onChange={(event) => toggleExtension(eligibleExtension.extension.manifest.id, event.currentTarget.checked)}
                  label={
                    <Flex align="center" gap="xs" wrap="wrap">
                      <ExtensionBadge idOrExtension={eligibleExtension.extension} size="lg" variant="subtle"/>
                      {eligibleExtension.capabilities.map((capability) => (
                        <ExtensionCapability key={capability.id} capability={capability}/>
                      ))}
                    </Flex>
                  }
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      ) : (
        <Text c="dimmed" size="sm">
          {t("runCapabilitiesModal.noExtensions")}
        </Text>
      )}

      <ModalActions>
        <Button
          disabled={canConfirm === false}
          onClick={handleConfirm}
        >
          {t("button.synchronize")}
        </Button>
      </ModalActions>
    </Stack>
  );
}
