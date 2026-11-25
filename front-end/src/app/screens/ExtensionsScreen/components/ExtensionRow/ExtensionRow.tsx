import { type KeyboardEvent, type ReactElement } from "react";
import { Box, Flex, Table, Text } from "@mantine/core";

import { Extension, Manifest } from "@picteus/ws-client";

import { UnifiedExtensionItemType } from "app/services";
import { ExtensionCategories, ExtensionIcon, ExtensionStatusPill, IconTile } from "app/components";
import ExtensionActions from "../ExtensionActions/ExtensionActions.tsx";


type ExtensionRowPropsType = {
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

export default function ExtensionRow({
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
}: ExtensionRowPropsType): ReactElement
{
  const extension = item.extension;
  const isBusy = isToggling === true || isInstalling === true || isUpdating === true || isUninstalling === true;

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>): void
  {
    if (event.target !== event.currentTarget)
    {
      return;
    }
    if (event.key === "Enter" || event.key === " ")
    {
      event.preventDefault();
      onOpen(item);
    }
  }

  return (
    <Table.Tr
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => onOpen(item)}
      onKeyDown={handleKeyDown}
    >
      <Table.Td>
        <Flex align="center" gap="sm" miw={0}>
          <IconTile size={32}>
            <ExtensionIcon idOrExtension={item.extension ?? item.marketplaceExtension ?? item.id} size="sm"/>
          </IconTile>
          <Box miw={0}>
            <Text size="sm" fw={600} lineClamp={1}>
              {item.manifest.name}
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {item.manifest.description}
            </Text>
          </Box>
        </Flex>
      </Table.Td>
      <Table.Td>
        <ExtensionCategories categories={item.manifest.categories} size="sm" c="dimmed" lineClamp={1}/>
      </Table.Td>
      <Table.Td>
        <ExtensionStatusPill
          status={item.status}
          availableUpdateVersion={item.availableUpdateVersion}
          onUpdateClick={extension !== undefined && item.availableUpdateVersion !== undefined
            ? () => onMarketplaceUpdate(extension, item.availableUpdateVersion!)
            : undefined}
        />
      </Table.Td>
      <Table.Td onClick={event => event.stopPropagation()}>
        <ExtensionActions
          item={item}
          isBusy={isBusy}
          isInstalling={isInstalling}
          gap="sm"
          justify="flex-end"
          onOpen={onOpen}
          onToggleState={onToggleState}
          onInstall={onInstall}
          onMarketplaceUpdate={onMarketplaceUpdate}
          onManualUpdate={onManualUpdate}
          onSettings={onSettings}
          onSynchronize={onSynchronize}
          onUninstall={onUninstall}
        />
      </Table.Td>
    </Table.Tr>
  );
}
