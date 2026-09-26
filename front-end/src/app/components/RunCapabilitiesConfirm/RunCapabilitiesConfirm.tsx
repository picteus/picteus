import React, { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Checkbox, Divider, Flex, ScrollArea, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import {
  Extension,
  ExtensionState,
  ManifestCapability,
  ManifestCapabilityId,
  SearchParameters
} from "@picteus/ws-client";

import { useExtensionsAll } from "app/hooks";
import { ExtensionCapability, ExtensionIcon, ImagesCollection } from "app/components";


const capabilityIds: ManifestCapabilityId[] =
  [
    ManifestCapabilityId.ImageTags,
    ManifestCapabilityId.ImageFeatures,
    ManifestCapabilityId.ImageEmbeddings
  ];

type EligibleExtensionType = {
  extension: Extension;
  capabilities: ManifestCapability[];
};

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
    if (data === undefined)
    {
      return [];
    }
    // We gather, per extension, the image capabilities it supports, keeping the canonical capability order
    const capabilitiesByExtensionId = new Map<string, ManifestCapability[]>();
    for (const capabilityId of capabilityIds)
    {
      const configurationCapability = data.extensionsConfiguration.capabilities.find((entity) => entity.capability.id === capabilityId);
      if (configurationCapability === undefined)
      {
        continue;
      }
      for (const extensionId of configurationCapability.extensionIds)
      {
        const capabilities = capabilitiesByExtensionId.get(extensionId) ?? [];
        capabilities.push(configurationCapability.capability);
        capabilitiesByExtensionId.set(extensionId, capabilities);
      }
    }
    return data.extensions
      .filter((extension) => extension.state === ExtensionState.Enabled && capabilitiesByExtensionId.has(extension.manifest.id))
      .sort((first, second) => first.manifest.name.localeCompare(second.manifest.name))
      .map((extension) => ({ extension, capabilities: capabilitiesByExtensionId.get(extension.manifest.id) ?? [] }));
  }, [ data ]);

  useEffect((): void =>
  {
    // We select every eligible extension by default, once the list is available
    if (hasInitializedSelection.current === false && eligibleExtensions.length > 0)
    {
      setSelectedExtensionIds(eligibleExtensions.map((eligibleExtension) => eligibleExtension.extension.manifest.id));
      hasInitializedSelection.current = true;
    }
  }, [ eligibleExtensions ]);

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
          <ScrollArea.Autosize mah={220}>
            <Stack gap="xs">
              {eligibleExtensions.map((eligibleExtension) => (
                <Checkbox
                  key={eligibleExtension.extension.manifest.id}
                  checked={selectedExtensionIds.indexOf(eligibleExtension.extension.manifest.id) !== -1}
                  onChange={(event) => toggleExtension(eligibleExtension.extension.manifest.id, event.currentTarget.checked)}
                  label={
                    <Flex align="center" gap="xs" wrap="wrap">
                      <ExtensionIcon idOrExtension={eligibleExtension.extension.manifest.id} size="sm"/>
                      <Text>{eligibleExtension.extension.manifest.name}</Text>
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
        <Button disabled={canConfirm === false} onClick={() => onConfirm(selectedExtensionIds)}>
          {t("button.synchronize")}
        </Button>
      </Flex>
    </Stack>
  );
}
