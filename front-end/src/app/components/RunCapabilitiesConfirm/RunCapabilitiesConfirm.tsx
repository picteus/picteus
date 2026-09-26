import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Checkbox, Divider, Flex, ScrollArea, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { SearchParameters } from "@picteus/ws-client";

import { useExtensionsAll } from "app/hooks";
import { EligibleExtensionType, ExtensionsService, StorageService } from "app/services";
import { ExtensionBadge, ExtensionCapability, ImagesCollection } from "app/components";


type RunCapabilitiesConfirmPropsType = {
  searchParameters: SearchParameters;
  onConfirm: (extensionIds: string[]) => void;
};

export default function RunCapabilitiesConfirm({
  searchParameters,
  onConfirm
}: RunCapabilitiesConfirmPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { data } = useExtensionsAll();
  const [ selectedExtensionIds, setSelectedExtensionIds ] = useState<string[]>([]);
  const hasInitializedSelection = useRef<boolean>(false);

  const eligibleExtensions = useMemo((): EligibleExtensionType[] =>
  {
    return ExtensionsService.computeEligibleExtensions(data?.extensions, data?.extensionsConfiguration);
  }, [ data ]);

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

  function persistChoice(selectedIds: string[]): void
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
  }

  function handleConfirm(): void
  {
    persistChoice(selectedExtensionIds);
    onConfirm(selectedExtensionIds);
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
    setSelectedExtensionIds(isChecked === true ? eligibleExtensions.map((eligibleExtension) => eligibleExtension.extension.manifest.id) : []);
  }

  const hasEligibleExtensions = eligibleExtensions.length > 0;
  const areAllSelected = hasEligibleExtensions === true && selectedExtensionIds.length === eligibleExtensions.length;
  const areSomeSelected = selectedExtensionIds.length > 0 && areAllSelected === false;
  const canConfirm = selectedExtensionIds.length > 0;

  return (
    <Stack gap="md">
      <Alert icon={<IconAlertTriangle/>} color="orange">
        {t("runCapabilitiesModal.explanation")}
      </Alert>

      <ImagesCollection searchParameters={searchParameters}
                        explanation={t("runCapabilitiesModal.collectionExplanation")}/>

      {hasEligibleExtensions === true ? (
        <Stack gap="xs">
          <Checkbox
            checked={areAllSelected}
            indeterminate={areSomeSelected}
            label={t("runCapabilitiesModal.selectAll")}
            onChange={(event) => toggleAll(event.currentTarget.checked)}
          />
          <Divider/>
          <ScrollArea.Autosize mah="clamp(160px, 40dvh, 480px)">
            <Stack gap="xs">
              {eligibleExtensions.map((eligibleExtension) => (
                <Checkbox
                  key={eligibleExtension.extension.manifest.id}
                  checked={selectedExtensionIds.indexOf(eligibleExtension.extension.manifest.id) !== -1}
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

      <Flex justify="flex-end" gap="md">
        <Button disabled={canConfirm === false} onClick={handleConfirm}>
          {t("button.synchronize")}
        </Button>
      </Flex>
    </Stack>
  );
}
