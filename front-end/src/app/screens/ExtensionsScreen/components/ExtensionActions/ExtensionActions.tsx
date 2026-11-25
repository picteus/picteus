import { CSSProperties, ReactElement } from "react";
import { Button, Flex, MantineSpacing, Switch } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionState, Manifest } from "@picteus/ws-client";

import { UnifiedExtensionItemType } from "app/services";
import { ExtensionMenu } from "app/components";


type ExtensionActionsPropsType = {
  readonly item: UnifiedExtensionItemType;
  readonly isBusy: boolean;
  readonly isInstalling: boolean;
  readonly gap?: MantineSpacing;
  readonly justify?: CSSProperties["justifyContent"];
  readonly stopPropagation?: boolean;
  readonly onOpen: (item: UnifiedExtensionItemType) => void;
  readonly onToggleState: (extension: Extension) => void;
  readonly onInstall: (manifest: Manifest) => void;
  readonly onMarketplaceUpdate: (extension: Extension, targetVersion: string) => void;
  readonly onManualUpdate: (extension: Extension) => void;
  readonly onSettings: (extension: Extension) => void;
  readonly onSynchronize: (extension: Extension) => void;
  readonly onUninstall: (extension: Extension) => void;
};

export default function ExtensionActions({
  item,
  isBusy,
  isInstalling,
  gap = "xs",
  justify,
  stopPropagation = false,
  onOpen,
  onToggleState,
  onInstall,
  onMarketplaceUpdate,
  onManualUpdate,
  onSettings,
  onSynchronize,
  onUninstall
}: ExtensionActionsPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const extension = item.extension;

  return (
    <Flex
      justify={justify}
      align="center"
      gap={gap}
      flex="0 0 auto"
      onClick={stopPropagation === true ? event => event.stopPropagation() : undefined}
    >
      {extension !== undefined ? (
        <Switch
          size="sm"
          checked={extension.state === ExtensionState.Enabled}
          disabled={isBusy}
          onChange={() => onToggleState(extension)}
        />
      ) : (
        <Button
          size="xs"
          variant="light"
          loading={isInstalling}
          disabled={isInstalling}
          onClick={() => onInstall(item.manifest)}
        >
          {t("button.install")}
        </Button>
      )}
      <ExtensionMenu
        item={item}
        isBusy={isBusy}
        onOpen={onOpen}
        onSettings={onSettings}
        onSynchronize={onSynchronize}
        onMarketplaceUpdate={onMarketplaceUpdate}
        onManualUpdate={onManualUpdate}
        onInstall={onInstall}
        onUninstall={onUninstall}
      />
    </Flex>
  );
}
