import { ReactElement } from "react";
import { Menu } from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconArrowUpCircle,
  IconCirclePlus,
  IconExternalLink,
  IconReload,
  IconTrash,
  IconUpload
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionState, Manifest } from "@picteus/ws-client";

import { ExtensionsService, UnifiedExtensionItemType } from "app/services";
import Common from "../Common/Common.ts";
import OverflowMenu from "../OverflowMenu/OverflowMenu.tsx";


type ExtensionMenuPropsType = {
  readonly item: UnifiedExtensionItemType;
  readonly isBusy: boolean;
  readonly onOpen?: (item: UnifiedExtensionItemType) => void;
  readonly onSettings: (extension: Extension) => void;
  readonly onSynchronize: (extension: Extension) => void;
  readonly onMarketplaceUpdate: (extension: Extension, targetVersion: string) => void;
  readonly onManualUpdate: (extension: Extension) => void;
  readonly onInstall: (manifest: Manifest) => void;
  readonly onUninstall: (extension: Extension) => void;
};

export default function ExtensionMenu({
  item,
  isBusy,
  onOpen,
  onSettings,
  onSynchronize,
  onMarketplaceUpdate,
  onManualUpdate,
  onInstall,
  onUninstall
}: ExtensionMenuPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const extension = item.extension;
  const isInstalled = extension !== undefined;
  const isConfigurable = isInstalled === true && ExtensionsService.hasSettings(extension) === true;
  const canSynchronize = isInstalled === true &&
    extension.state === ExtensionState.Enabled &&
    ExtensionsService.hasSynchronizationCapabilities(extension) === true;

  return (
    <OverflowMenu width={230}>
      {onOpen !== undefined && (
        <Menu.Item
          leftSection={<IconExternalLink size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
          onClick={() => onOpen(item)}
        >
          {t("button.open")}
        </Menu.Item>
      )}
      {isInstalled === true ? (
        <>
          {isConfigurable === true && (
            <Menu.Item
              disabled={extension.state !== ExtensionState.Enabled}
              leftSection={<IconAdjustmentsHorizontal size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={() => onSettings(extension)}
            >
              {t("button.settings")}
            </Menu.Item>
          )}
          {canSynchronize === true && (
            <Menu.Item
              leftSection={<IconReload size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={() => onSynchronize(extension)}
            >
              {t("button.synchronize")}
            </Menu.Item>
          )}
          {item.availableUpdateVersion !== undefined && (
            <Menu.Item
              disabled={isBusy}
              leftSection={<IconArrowUpCircle size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
              onClick={() => onMarketplaceUpdate(extension, item.availableUpdateVersion!)}
            >
              {t("extension.updateToVersion", { version: item.availableUpdateVersion })}
            </Menu.Item>
          )}
          <Menu.Item
            disabled={isBusy}
            leftSection={<IconUpload size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={() => onManualUpdate(extension)}
          >
            {t("extension.menu.updateFromFileOrLink")}
          </Menu.Item>
          <Menu.Divider/>
          <Menu.Item
            color="red"
            disabled={isBusy}
            leftSection={<IconTrash size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            onClick={() => onUninstall(extension)}
          >
            {t("button.uninstall")}
          </Menu.Item>
        </>
      ) : (
        <Menu.Item
          disabled={isBusy}
          leftSection={<IconCirclePlus size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
          onClick={() => onInstall(item.manifest)}
        >
          {t("button.install")}
        </Menu.Item>
      )}
    </OverflowMenu>
  );
}
