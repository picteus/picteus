import { ReactElement } from "react";
import { Badge, Box, Flex, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Extension, Manifest } from "@picteus/ws-client";

import { ExtensionsService, UnifiedExtensionItemType } from "app/services";
import { ExtensionIcon, ExtensionStatusPill, IconTile, InteractiveCard } from "app/components";
import ExtensionActions from "../ExtensionActions/ExtensionActions.tsx";


type ExtensionCardPropsType = {
  readonly item: UnifiedExtensionItemType;
  readonly isToggling: boolean;
  readonly isInstalling: boolean;
  readonly isUpdating: boolean;
  readonly isUninstalling: boolean;
  readonly onOpen: (item: UnifiedExtensionItemType) => void;
  readonly onToggleState: (extension: Extension) => void;
  readonly onInstall: (manifest: Manifest) => void;
  readonly onMarketplaceUpdate: (extension: Extension, targetVersion: string) => void;
  readonly onManualUpdate: (extension: Extension) => void;
  readonly onSettings: (extension: Extension) => void;
  readonly onSynchronize: (extension: Extension) => void;
  readonly onUninstall: (extension: Extension) => void;
};

export default function ExtensionCard({
  item,
  isToggling,
  isInstalling,
  isUpdating,
  isUninstalling,
  onOpen,
  onToggleState,
  onInstall,
  onMarketplaceUpdate,
  onManualUpdate,
  onSettings,
  onSynchronize,
  onUninstall
}: ExtensionCardPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const extension = item.extension;
  const isBusy = isToggling === true || isInstalling === true || isUpdating === true || isUninstalling === true;
  const metaText = ExtensionsService.formatExtensionSubtitle(item.manifest, t);

  return (
    <InteractiveCard p="md" h="100%" onClick={() => onOpen(item)}>
      <Flex direction="column" justify="space-between" gap="md" h="100%">
        <Stack gap="sm">
          <Flex justify="space-between" align="flex-start" gap="sm">
            <Flex align="center" gap="sm" miw={0} flex={1}>
              <IconTile size={36}>
                <ExtensionIcon idOrExtension={item.extension ?? item.marketplaceExtension ?? item.id} size="md"/>
              </IconTile>
              <Box miw={0}>
                <Text size="sm" fw={600} lineClamp={1}>
                  {item.manifest.name}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {metaText}
                </Text>
              </Box>
            </Flex>
            <ExtensionActions
              item={item}
              isBusy={isBusy}
              isInstalling={isInstalling}
              stopPropagation
              onOpen={onOpen}
              onToggleState={onToggleState}
              onInstall={onInstall}
              onMarketplaceUpdate={onMarketplaceUpdate}
              onManualUpdate={onManualUpdate}
              onSettings={onSettings}
              onSynchronize={onSynchronize}
              onUninstall={onUninstall}
            />
          </Flex>
          <Text
            size="sm"
            c="dimmed"
            lineClamp={3}
            mih="calc(3 * 1em * var(--mantine-line-height-sm))"
          >
            {item.manifest.description}
          </Text>
        </Stack>
        <Flex justify="space-between" align="flex-end" gap="xs" wrap="nowrap">
          <Flex gap={6} wrap="wrap" miw={0} flex={1}>
            {item.manifest.categories.map(category => (
              <Badge key={category} variant="light" color="gray" size="xs">
                {t(`extension.categories.${category}`)}
              </Badge>
            ))}
          </Flex>
          <Box flex="0 0 auto">
            <ExtensionStatusPill
              status={item.status}
              availableUpdateVersion={item.availableUpdateVersion}
              onUpdateClick={extension !== undefined && item.availableUpdateVersion !== undefined
                ? () => onMarketplaceUpdate(extension, item.availableUpdateVersion!)
                : undefined}
            />
          </Box>
        </Flex>
      </Flex>
    </InteractiveCard>
  );
}
