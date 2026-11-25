import { ReactElement } from "react";
import { Button, Flex, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { IconCirclePlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionState, Manifest, MarketplaceExtension } from "@picteus/ws-client";

import { ExtensionsService, UnifiedExtensionItemType } from "app/services";
import Common from "../../../Common/Common.ts";
import DotSeparated from "../../../DotSeparated/DotSeparated.tsx";
import ExtensionCategories from "../../../ExtensionCategories/ExtensionCategories.tsx";
import ExtensionIcon from "../../../ExtensionIcon/ExtensionIcon.tsx";
import ExtensionMenu from "../../../ExtensionMenu/ExtensionMenu.tsx";
import ExtensionStatusPill from "../../../ExtensionStatusPill/ExtensionStatusPill.tsx";
import IconTile from "../../../IconTile/IconTile.tsx";


type ExtensionPageHeaderPropsType =
  {
    readonly item: UnifiedExtensionItemType;
    readonly iconSource: string | Extension | MarketplaceExtension;
    readonly isBusy: boolean;
    readonly isToggling: boolean;
    readonly isInstalling: boolean;
    readonly onToggleState: (extension: Extension) => void;
    readonly onInstall: (manifest: Manifest) => void;
    readonly onMarketplaceUpdate: (extension: Extension, targetVersion: string) => void;
    readonly onManualUpdate: (extension: Extension) => void;
    readonly onSettings: (extension: Extension) => void;
    readonly onSynchronize: (extension: Extension) => void;
    readonly onUninstall: (extension: Extension) => void;
  };

export default function ExtensionPageHeader({
  item,
  iconSource,
  isBusy,
  isToggling,
  isInstalling,
  onToggleState,
  onInstall,
  onMarketplaceUpdate,
  onManualUpdate,
  onSettings,
  onSynchronize,
  onUninstall
}: ExtensionPageHeaderPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const manifest = item.manifest;
  const extension = item.extension;
  const metaText = ExtensionsService.formatExtensionSubtitle(manifest, t);

  return (
    <Flex justify="space-between" align="center" gap="md" wrap="wrap">
      <Flex align="center" gap="md" miw={0} flex={1}>
        <IconTile size={48} radius="md">
          <ExtensionIcon idOrExtension={iconSource} size="lg"/>
        </IconTile>
        <Stack gap={4} miw={0} flex={1}>
          <Title order={3}>{manifest.name}</Title>
          {manifest.description.trim().length > 0 && (
            <Text size="sm" c="dimmed">
              {manifest.description}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            <DotSeparated inline>
              {metaText}
              {manifest.categories.length > 0 && (
                <ExtensionCategories categories={manifest.categories} span inherit/>
              )}
            </DotSeparated>
          </Text>
        </Stack>
      </Flex>

      <Group gap="md" align="center" wrap="nowrap">
        <ExtensionStatusPill
          status={item.status}
          availableUpdateVersion={item.availableUpdateVersion}
          onUpdateClick={
            extension !== undefined && item.availableUpdateVersion !== undefined
              ? () => onMarketplaceUpdate(extension, item.availableUpdateVersion!)
              : undefined
          }
        />
        {extension !== undefined ? (
          <>
            <Switch
              label={t("field.enabled")}
              labelPosition="left"
              checked={extension.state === ExtensionState.Enabled}
              disabled={isBusy === true || isToggling === true}
              onChange={() => onToggleState(extension)}
            />
            <ExtensionMenu
              item={item}
              isBusy={isBusy}
              onSettings={onSettings}
              onSynchronize={onSynchronize}
              onMarketplaceUpdate={onMarketplaceUpdate}
              onManualUpdate={onManualUpdate}
              onInstall={onInstall}
              onUninstall={onUninstall}
            />
          </>
        ) : (
          <Button
            leftSection={<IconCirclePlus size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>}
            loading={isInstalling}
            disabled={isBusy === true || isInstalling === true}
            onClick={() => onInstall(manifest)}
          >
            {t("button.install")}
          </Button>
        )}
      </Group>
    </Flex>
  );
}
