import { ReactElement, useCallback, useMemo, useState } from "react";
import { Badge, Box, Divider, Flex, Group, Tabs } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconInfoCircle, IconSparkles, IconTerminal2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Extension, ExtensionState, Manifest, MarketplaceExtension } from "@picteus/ws-client";

import { ManualSection } from "types";
import { stripMarkdownSection } from "utils";
import {
  useAiModels,
  useConfirmAction,
  useExtension,
  useExtensionActivities,
  useExtensionInstructions,
  useExtensionLifecycleActions,
  useExtensions,
  useMarketplaceExtensionDetails,
  useMarketplaceExtensions,
  useSynchronizeExtension
} from "app/hooks";
import {
  AiModelInstructionsService,
  ExtensionInstructionCapabilitiesType,
  ExtensionsService,
  UnifiedExtensionItemType
} from "app/services";
import CommandIcon from "../CommandIcon/CommandIcon.tsx";
import Common from "../Common/Common.ts";
import FlexScrollArea from "../FlexScrollArea/FlexScrollArea.tsx";
import LoadingView from "../LoadingView/LoadingView.tsx";
import { useOptionalStackNavigator } from "../StackNavigator/StackNavigator.tsx";
import {
  ExtensionAiModelsTab,
  ExtensionCommandsTab,
  ExtensionManualDrawer,
  ExtensionOverviewTab,
  ExtensionPageHeader,
  ExtensionSettingsTab,
  type ResolvedCommandItemType
} from "./components";


export type ExtensionPageTabType = "overview" | "commands" | "settings" | "aiModels";

type ManualDrawerStateType =
  | { readonly mode: "extension" }
  | { readonly mode: "command"; readonly item: ResolvedCommandItemType };

export type OpenExtensionNavigationStateType =
  {
    readonly openExtensionId?: string;
    readonly initialTab?: ExtensionPageTabType;
    readonly requestTimestamp?: number;
  };

export function createOpenExtensionNavigationState(
  extensionId: string,
  initialTab: ExtensionPageTabType = "overview"
): OpenExtensionNavigationStateType
{
  return {
    openExtensionId: extensionId,
    initialTab,
    requestTimestamp: Date.now()
  };
}

type ExtensionPagePropsType =
  {
    readonly extensionId: string;
    readonly initialTab?: ExtensionPageTabType;
    readonly initialMarketplaceExtension?: MarketplaceExtension;
  };

export default function ExtensionPage({
  extensionId,
  initialTab = "overview",
  initialMarketplaceExtension
}: ExtensionPagePropsType): ReactElement
{
  const [ t ] = useTranslation();
  const stackNavigator = useOptionalStackNavigator();
  const confirmAction = useConfirmAction();
  const synchronizeExtension = useSynchronizeExtension();

  const { data: extensions = [] } = useExtensions();
  const { data: marketplaceExtensions = [] } = useMarketplaceExtensions();
  const { data: activities = [] } = useExtensionActivities();
  const { data: allAiModels = [] } = useAiModels();

  const {
    installingIds,
    updatingIds,
    togglingIds,
    uninstallingIds,
    installMarketplaceExtension,
    toggleExtensionState,
    updateMarketplaceExtension,
    openInstallOrUpdateModal,
    uninstallExtension
  } = useExtensionLifecycleActions();

  const [ activeTab, setActiveTab ] = useState<ExtensionPageTabType>(initialTab);
  const [ isManualDrawerOpen, setIsManualDrawerOpen ] = useState<boolean>(false);
  const [ manualDrawerState, setManualDrawerState ] = useState<ManualDrawerStateType>({ mode: "extension" });
  const [ isSettingsDirty, setIsSettingsDirty ] = useState<boolean>(false);
  const [ isAiModelsDirty, setIsAiModelsDirty ] = useState<boolean>(false);

  const installedExtension = useMemo<Extension | undefined>(() =>
      extensions.find(candidate => candidate.manifest.id === extensionId),
    [ extensions, extensionId ]
  );

  const marketplaceExtension = useMemo<MarketplaceExtension | undefined>(() =>
      marketplaceExtensions.find(candidate => candidate.manifest.id === extensionId) ?? initialMarketplaceExtension,
    [ marketplaceExtensions, extensionId, initialMarketplaceExtension ]
  );

  const activity = useMemo(() => activities.find(candidate => candidate.id === extensionId),
    [ activities, extensionId ]
  );

  const {
    data: installedDetails,
    isLoading: isInstalledDetailsLoading
  } = useExtension(installedExtension !== undefined ? extensionId : "");

  const { data: marketplaceDetails, isLoading: isMarketplaceDetailsLoading } = useMarketplaceExtensionDetails(
    installedExtension === undefined ? extensionId : ""
  );

  const manifest: Manifest | undefined = installedExtension?.manifest ?? marketplaceDetails?.manifest ?? marketplaceExtension?.manifest;

  const manualMarkdown: string | undefined = installedExtension !== undefined ? installedDetails?.manual?.instructions : marketplaceDetails?.manual?.instructions;

  const extensionManualMarkdown = useMemo<string | undefined>(() =>
  {
    if (manualMarkdown === undefined)
    {
      return undefined;
    }
    const withoutCommands = stripMarkdownSection(manualMarkdown, ManualSection.Commands);
    return withoutCommands.length > 0 ? withoutCommands : undefined;
  }, [ manualMarkdown ]);

  const isEnabled = installedExtension?.state === ExtensionState.Enabled;
  const hasSettingsSchema = installedExtension !== undefined && ExtensionsService.hasSettings(installedExtension) === true;
  const canAccessSettings = isEnabled === true && hasSettingsSchema === true;

  const instructionCapabilities = useMemo<ExtensionInstructionCapabilitiesType>(
    () => ExtensionsService.computeInstructionCapabilities(installedExtension),
    [ installedExtension ]
  );

  const { data: instructionsData } = useExtensionInstructions(
    extensionId,
    instructionCapabilities,
    installedExtension !== undefined && instructionCapabilities.hasAnyInstructionCapability === true
  );

  const extensionModels = useMemo(() =>
      allAiModels.filter(model => model.extensionId === extensionId),
    [ allAiModels, extensionId ]
  );

  const configuredModelsCount = useMemo<number>(
    () => AiModelInstructionsService.collectConfiguredInstructionModels(instructionsData).configuredIds.size,
    [ instructionsData ]
  );

  const manifestCommands = useMemo(
    () => (manifest !== undefined ? ExtensionsService.extractManifestCommands(manifest) : []),
    [ manifest ]
  );

  const showCommandsTab = manifestCommands.length > 0;

  const effectiveTab: ExtensionPageTabType = useMemo(() =>
  {
    if (activeTab === "commands" && showCommandsTab === true)
    {
      return "commands";
    }
    if (activeTab === "settings" && canAccessSettings === true)
    {
      return "settings";
    }
    if (activeTab === "aiModels" && installedExtension !== undefined && instructionCapabilities.hasAnyInstructionCapability === true)
    {
      return "aiModels";
    }
    return "overview";
  }, [ activeTab, showCommandsTab, canAccessSettings, installedExtension, instructionCapabilities.hasAnyInstructionCapability ]);

  const handleRequestTabChange = useCallback((nextTab: ExtensionPageTabType): void =>
  {
    if (nextTab === "settings" && canAccessSettings === false)
    {
      return;
    }
    if (nextTab === effectiveTab)
    {
      return;
    }
    const isCurrentTabDirty =
      (effectiveTab === "settings" && isSettingsDirty === true) ||
      (effectiveTab === "aiModels" && isAiModelsDirty === true);

    if (isCurrentTabDirty === true)
    {
      confirmAction({
        options: {
          title: t("extensionPage.unsavedConfirmTitle"),
          message: t("extensionPage.unsavedConfirmMessage")
        },
        onConfirm: (): void =>
        {
          setIsSettingsDirty(false);
          setIsAiModelsDirty(false);
          setActiveTab(nextTab);
        }
      });
      return;
    }
    setActiveTab(nextTab);
  }, [ canAccessSettings, effectiveTab, isSettingsDirty, isAiModelsDirty, confirmAction, t ]);

  const handleManualUpdate = useCallback((extension: Extension): void =>
  {
    openInstallOrUpdateModal(extension);
  }, [ openInstallOrUpdateModal ]);

  const handleUninstall = useCallback((extension: Extension): void =>
  {
    uninstallExtension(extension, () =>
    {
      stackNavigator?.pop();
    });
  }, [ uninstallExtension, stackNavigator ]);

  const isLoadingInitial = manifest === undefined && (isInstalledDetailsLoading === true || isMarketplaceDetailsLoading === true);

  if (manifest === undefined)
  {
    return (
      <LoadingView visible={isLoadingInitial}>
        <Box p="md"/>
      </LoadingView>
    );
  }

  const isInstalling = installingIds.has(extensionId);
  const isUpdating = updatingIds.has(extensionId);
  const isToggling = togglingIds.has(extensionId);
  const isUninstalling = uninstallingIds.has(extensionId);

  const unifiedItem: UnifiedExtensionItemType = {
    id: extensionId,
    manifest,
    extension: installedExtension,
    marketplaceExtension,
    activity,
    isInstalled: installedExtension !== undefined,
    status: ExtensionsService.deriveStatus(installedExtension, activity, isInstalling, isUpdating),
    availableUpdateVersion: ExtensionsService.findMarketplaceUpdateVersion(installedExtension, marketplaceExtension)
  };

  const iconSource = installedExtension ?? marketplaceDetails ?? marketplaceExtension ?? extensionId;
  const isBusy = isInstalling === true || isUpdating === true || isUninstalling === true;
  const showAiModelsTab = installedExtension !== undefined && instructionCapabilities.hasAnyInstructionCapability === true;

  return (
    <Flex direction="column" h="100%" mih={0}>
      <Box px="md" pt="md" pb="sm" flex="0 0 auto">
        <ExtensionPageHeader
          item={unifiedItem}
          iconSource={iconSource}
          isBusy={isBusy}
          isToggling={isToggling}
          isInstalling={isInstalling}
          onToggleState={extension => void toggleExtensionState(extension)}
          onInstall={installMarketplaceExtension}
          onMarketplaceUpdate={updateMarketplaceExtension}
          onManualUpdate={handleManualUpdate}
          onSettings={() => handleRequestTabChange("settings")}
          onSynchronize={synchronizeExtension}
          onUninstall={handleUninstall}
        />
      </Box>
      <Divider/>

      <Tabs
        value={effectiveTab}
        onChange={value =>
        {
          if (value === "overview" || value === "commands" || value === "settings" || value === "aiModels")
          {
            handleRequestTabChange(value);
          }
        }}
        keepMounted={false}
        styles={{
          root: {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0
          },
          panel: {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0
          }
        }}
      >
        <Tabs.List px="md" flex="0 0 auto">
          <Tabs.Tab
            value="overview"
            leftSection={<IconInfoCircle size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
          >
            {t("extensionPage.tabs.overview")}
          </Tabs.Tab>
          {showCommandsTab === true && (
            <Tabs.Tab
              value="commands"
              leftSection={<IconTerminal2 size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            >
              <Group gap={6} align="center">
                <span>{t("field.commands")}</span>
                <Badge size="xs" variant="light" color={effectiveTab === "commands" ? "blue" : "gray"}>
                  {manifestCommands.length}
                </Badge>
              </Group>
            </Tabs.Tab>
          )}
          {hasSettingsSchema === true && (
            <Tabs.Tab
              value="settings"
              disabled={isEnabled === false}
              leftSection={<IconAdjustmentsHorizontal size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            >
              {t("field.settings")}
            </Tabs.Tab>
          )}
          {showAiModelsTab === true && (
            <Tabs.Tab
              value="aiModels"
              leftSection={<IconSparkles size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>}
            >
              <Group gap={6} align="center">
                <span>{t("extensionPage.tabs.aiModels")}</span>
                <Badge size="xs" variant="light" color={configuredModelsCount > 0 ? "blue" : "gray"}>
                  {configuredModelsCount}
                </Badge>
              </Group>
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="overview">
          <FlexScrollArea>
            <Box p="md">
              <ExtensionOverviewTab
                manifest={manifest}
                extension={installedExtension}
                manualMarkdown={extensionManualMarkdown}
                hasSettings={canAccessSettings}
                instructionCapabilities={instructionCapabilities}
                extensionModels={extensionModels}
                instructionsData={instructionsData}
                onOpenManual={() =>
                {
                  setManualDrawerState({ mode: "extension" });
                  setIsManualDrawerOpen(true);
                }}
                onOpenSettingsTab={() => handleRequestTabChange("settings")}
                onOpenAiModelsTab={() => handleRequestTabChange("aiModels")}
              />
            </Box>
          </FlexScrollArea>
        </Tabs.Panel>

        {showCommandsTab === true && (
          <Tabs.Panel value="commands">
            <FlexScrollArea>
              <Box p="md">
                <ExtensionCommandsTab
                  manifest={manifest}
                  commands={manifestCommands}
                  isInstalled={installedExtension !== undefined}
                  extensionStatus={unifiedItem.status}
                  iconSource={iconSource}
                  manualMarkdown={manualMarkdown}
                  onOpenCommandManual={item =>
                  {
                    setManualDrawerState({ mode: "command", item });
                    setIsManualDrawerOpen(true);
                  }}
                />
              </Box>
            </FlexScrollArea>
          </Tabs.Panel>
        )}

        {canAccessSettings === true && installedExtension !== undefined && (
          <Tabs.Panel value="settings">
            <ExtensionSettingsTab
              extension={installedExtension}
              manualMarkdown={manualMarkdown}
              hasAiModels={showAiModelsTab}
              onOpenAiModelsTab={() => handleRequestTabChange("aiModels")}
              onDirtyChange={setIsSettingsDirty}
            />
          </Tabs.Panel>
        )}

        {showAiModelsTab === true && installedExtension !== undefined && (
          <Tabs.Panel value="aiModels">
            <ExtensionAiModelsTab
              extension={installedExtension}
              capabilities={instructionCapabilities}
              hasSettings={hasSettingsSchema}
              onOpenSettingsTab={canAccessSettings === true ? () => handleRequestTabChange("settings") : undefined}
              onDirtyChange={setIsAiModelsDirty}
            />
          </Tabs.Panel>
        )}
      </Tabs>

      <ExtensionManualDrawer
        opened={isManualDrawerOpen}
        onClose={() => setIsManualDrawerOpen(false)}
        manifest={manifest}
        iconSource={iconSource}
        markdown={manualDrawerState.mode === "command" ? manualDrawerState.item.manualMarkdown : extensionManualMarkdown}
        customIcon={manualDrawerState.mode === "command" ? (
          <CommandIcon
            extensionId={manifest.id}
            command={manualDrawerState.item.command}
            size="md"
            isInstalled={installedExtension !== undefined}
            fallbackIconSource={iconSource}
          />
        ) : undefined}
        customTitle={manualDrawerState.mode === "command"
          ? t("extensionManualDrawer.title", { name: manualDrawerState.item.label })
          : undefined}
        customSubtitle={manualDrawerState.mode === "command"
          ? t("extensionManualDrawer.commandSubtitle", { extension: manifest.name, version: manifest.version })
          : undefined}
        headingLevelOffset={manualDrawerState.mode === "command" ? 2 : 3}
        onOpenSettings={manualDrawerState.mode !== "command" && canAccessSettings === true
          ? () => handleRequestTabChange("settings")
          : undefined}
      />
    </Flex>
  );
}
