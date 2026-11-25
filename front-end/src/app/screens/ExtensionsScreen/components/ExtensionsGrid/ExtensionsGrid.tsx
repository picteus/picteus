import { ReactElement } from "react";
import { SimpleGrid } from "@mantine/core";

import { Extension, Manifest } from "@picteus/ws-client";

import { UnifiedExtensionItemType } from "app/services";
import ExtensionCard from "../ExtensionCard/ExtensionCard.tsx";


type ExtensionsGridPropsType = {
  readonly items: UnifiedExtensionItemType[];
  readonly togglingIds: ReadonlySet<string>;
  readonly installingIds: ReadonlySet<string>;
  readonly updatingIds: ReadonlySet<string>;
  readonly uninstallingIds: ReadonlySet<string>;
  readonly onOpen: (item: UnifiedExtensionItemType) => void;
  readonly onToggleState: (extension: Extension) => void;
  readonly onInstall: (manifest: Manifest) => void;
  readonly onMarketplaceUpdate: (extension: Extension, targetVersion: string) => void;
  readonly onManualUpdate: (extension: Extension) => void;
  readonly onSettings: (extension: Extension) => void;
  readonly onSynchronize: (extension: Extension) => void;
  readonly onUninstall: (extension: Extension) => void;
};

export default function ExtensionsGrid({
  items,
  togglingIds,
  installingIds,
  updatingIds,
  uninstallingIds,
  onOpen,
  onToggleState,
  onInstall,
  onMarketplaceUpdate,
  onManualUpdate,
  onSettings,
  onSynchronize,
  onUninstall
}: ExtensionsGridPropsType): ReactElement
{
  return (
    <SimpleGrid
      minColWidth={260}
      spacing="md"
      verticalSpacing="md"
      autoRows="1fr"
    >
      {items.map(item => (
        <ExtensionCard
          key={item.id}
          item={item}
          isToggling={togglingIds.has(item.id)}
          isInstalling={installingIds.has(item.id)}
          isUpdating={updatingIds.has(item.id)}
          isUninstalling={uninstallingIds.has(item.id)}
          onOpen={onOpen}
          onToggleState={onToggleState}
          onInstall={onInstall}
          onMarketplaceUpdate={onMarketplaceUpdate}
          onManualUpdate={onManualUpdate}
          onSettings={onSettings}
          onSynchronize={onSynchronize}
          onUninstall={onUninstall}
        />
      ))}
    </SimpleGrid>
  );
}
