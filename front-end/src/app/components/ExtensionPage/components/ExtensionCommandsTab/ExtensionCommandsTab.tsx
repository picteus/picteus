import { ReactElement, useCallback, useMemo, useState } from "react";
import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CommandEntity, Extension, Manifest, ManifestExtensionCommand, MarketplaceExtension } from "@picteus/ws-client";

import { UiExtensionCommandType } from "types";
import { useExtensionCommandRunner, useExtensionCommands, useLibraryHasImages, useProcessCommands } from "app/hooks";
import { ExtensionDerivedStatusType } from "app/services";
import Common from "../../../Common/Common.ts";
import SearchInput from "../../../SearchInput/SearchInput.tsx";
import { CommandCard } from "./components";
import {
  collectAvailableScopes,
  CommandScopeFilterType,
  filterAndGroupCommands,
  resolveCommandItems,
  ResolvedCommandItemType
} from "./CommandUtils.ts";


export type { ResolvedCommandItemType };

const IMAGE_COMMAND_ENTITIES: CommandEntity[] = [ CommandEntity.Image, CommandEntity.Images ];

type ExtensionCommandsTabPropsType =
  {
    readonly manifest: Manifest;
    readonly commands: readonly ManifestExtensionCommand[];
    readonly isInstalled: boolean;
    readonly extensionStatus: ExtensionDerivedStatusType;
    readonly iconSource: string | Extension | MarketplaceExtension;
    readonly manualMarkdown: string | undefined;
    readonly onOpenCommandManual: (item: ResolvedCommandItemType) => void;
  };

export default function ExtensionCommandsTab({
  manifest,
  commands,
  isInstalled,
  extensionStatus,
  iconSource,
  manualMarkdown,
  onOpenCommandManual
}: ExtensionCommandsTabPropsType): ReactElement
{
  const [ t, i18n ] = useTranslation();
  const { getCommand: getProcessCommand } = useProcessCommands({});
  const readyImageCommands = useExtensionCommands(IMAGE_COMMAND_ENTITIES);
  const commandRunner = useExtensionCommandRunner();
  const { data: libraryHasImages } = useLibraryHasImages();

  const [ searchQuery, setSearchQuery ] = useState<string>("");
  const [ selectedScope, setSelectedScope ] = useState<CommandScopeFilterType>("all");
  const [ runningImageCommandId, setRunningImageCommandId ] = useState<string | null>(null);

  const readyImageCommandsById = useMemo<Map<string, UiExtensionCommandType>>(() =>
  {
    const map = new Map<string, UiExtensionCommandType>();
    for (const entry of readyImageCommands)
    {
      if (entry.extension.manifest.id === manifest.id && entry.command.id !== undefined)
      {
        map.set(entry.command.id, entry);
      }
    }
    return map;
  }, [ readyImageCommands, manifest.id ]);

  const formatOptionalLabel = useCallback(
    (name: string): string => t("extensionPage.commands.optionalParameter", { name }),
    [ t ]
  );

  const resolvedCommands = useMemo<ResolvedCommandItemType[]>(
    () => resolveCommandItems(commands, i18n.language, manualMarkdown, formatOptionalLabel),
    [ commands, i18n.language, manualMarkdown, formatOptionalLabel ]
  );

  const availableScopes = useMemo<CommandEntity[]>(
    () => collectAvailableScopes(resolvedCommands),
    [ resolvedCommands ]
  );

  const effectiveScope: CommandScopeFilterType = selectedScope === "all" || availableScopes.includes(selectedScope)
    ? selectedScope
    : "all";

  const groupedCommands = useMemo(
    () => filterAndGroupCommands(resolvedCommands, searchQuery, effectiveScope),
    [ resolvedCommands, searchQuery, effectiveScope ]
  );

  const showToolbar = resolvedCommands.length >= 2;
  const showScopeFilters = availableScopes.length >= 2;
  const isLibraryEmpty = libraryHasImages === false;

  const runDisabledTooltip = useMemo<string>(() =>
  {
    if (extensionStatus === "paused")
    {
      return t("extensionPage.commands.runDisabledPaused", { name: manifest.name });
    }
    if (extensionStatus === "starting" || extensionStatus === "installing" || extensionStatus === "updating")
    {
      return t("extensionPage.commands.runDisabledStarting", { name: manifest.name });
    }
    if (extensionStatus === "error")
    {
      return t("extensionPage.commands.runDisabledError", { name: manifest.name });
    }
    return t("extensionPage.commands.runDisabledNotReady", { name: manifest.name });
  }, [ extensionStatus, manifest.name, t ]);

  const handleRunImageCommand = useCallback((
    item: ResolvedCommandItemType,
    readyEntry: UiExtensionCommandType
  ): void =>
  {
    const selectionMode = item.entity === CommandEntity.Image ? "single" : "multiple";
    setRunningImageCommandId(item.command.id);
    void commandRunner(
      manifest.id,
      readyEntry.command,
      undefined,
      undefined,
      () =>
      {
        setRunningImageCommandId(null);
      },
      selectionMode
    ).catch(() =>
    {
      setRunningImageCommandId(null);
    });
  }, [ commandRunner, manifest.id ]);

  function getScopeLabel(scope: CommandScopeFilterType): string
  {
    if (scope === "all")
    {
      return t("extensionPage.commands.scopeAll");
    }
    if (scope === CommandEntity.Process)
    {
      return t("extensionPage.commands.scopeProcess");
    }
    if (scope === CommandEntity.Image)
    {
      return t("extensionPage.commands.scopeImage");
    }
    return t("extensionPage.commands.scopeImages");
  }

  function getGroupTitle(entity: CommandEntity): string
  {
    if (entity === CommandEntity.Process)
    {
      return t("extensionPage.commands.groupProcessTitle");
    }
    if (entity === CommandEntity.Image)
    {
      return t("extensionPage.commands.groupImageTitle");
    }
    return t("extensionPage.commands.groupImagesTitle");
  }

  function getGroupCaption(entity: CommandEntity): string | undefined
  {
    if (isInstalled === false || entity === CommandEntity.Process)
    {
      return undefined;
    }
    if (isLibraryEmpty === true)
    {
      return t("extensionPage.commands.emptyLibraryNotice");
    }
    if (entity === CommandEntity.Image)
    {
      return t("extensionPage.commands.groupImageCaption");
    }
    return t("extensionPage.commands.groupImagesCaption");
  }

  function handleResetFilters(): void
  {
    setSearchQuery("");
    setSelectedScope("all");
  }

  const headerNote = resolvedCommands.length <= 1
    ? t("extensionPage.commands.headerNoteSingle")
    : t("extensionPage.commands.headerNote");

  const scopeFilterOptions: CommandScopeFilterType[] = [ "all", ...availableScopes ];

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {headerNote}
        </Text>

        {showToolbar === true && (
          <Group gap="xs" align="center" wrap="wrap">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("commands.searchPlaceholder")}
            />

            {showScopeFilters === true && (
              <Group gap={6} wrap="wrap" role="group">
                {scopeFilterOptions.map(scope =>
                {
                  const isSelected = effectiveScope === scope;
                  return (
                    <Button
                      key={scope}
                      size="xs"
                      radius="xl"
                      fw={500}
                      variant={isSelected === true ? "light" : "default"}
                      color={isSelected === true ? "blue" : undefined}
                      aria-pressed={isSelected}
                      styles={isSelected === true ? {
                        root: {
                          borderColor: "var(--mantine-color-blue-filled)"
                        }
                      } : undefined}
                      onClick={() => setSelectedScope(scope)}
                    >
                      {getScopeLabel(scope)}
                    </Button>
                  );
                })}
              </Group>
            )}
          </Group>
        )}
      </Stack>

      {groupedCommands.length === 0 ? (
        <Paper withBorder radius="md" p="xl">
          <Stack gap="xs" align="center">
            <Text size="sm" c="dimmed">
              {t("extensionPage.commands.emptyFiltered")}
            </Text>
            <Button size="xs" variant="default" onClick={handleResetFilters}>
              {t("extensionPage.commands.resetFilters")}
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Stack gap="lg">
          {groupedCommands.map(group =>
          {
            const groupCaption = getGroupCaption(group.entity);
            return (
              <Stack key={group.entity} gap="sm">
                <Stack gap={2}>
                  <Title order={5} fw={600}>
                    {getGroupTitle(group.entity)}
                  </Title>
                  {groupCaption !== undefined && (
                    <Text size="xs" c="dimmed">
                      {groupCaption}
                    </Text>
                  )}
                </Stack>
                <Stack gap="sm">
                  {group.items.map(item =>
                  {
                    const canShowRun = isInstalled === true;

                    if (item.entity === CommandEntity.Process)
                    {
                      const processCommand = canShowRun === true
                        ? getProcessCommand(item.command.id, manifest.id)
                        : undefined;
                      const isRunDisabled = processCommand === undefined || processCommand.isAvailable === false;
                      const isRunLoading = processCommand?.isLoading === true;

                      return (
                        <CommandCard
                          key={item.command.id}
                          extensionId={manifest.id}
                          isInstalled={isInstalled}
                          iconSource={iconSource}
                          item={item}
                          canShowRun={canShowRun}
                          isRunDisabled={isRunDisabled}
                          isRunLoading={isRunLoading}
                          runDisabledTooltip={isRunDisabled === true ? runDisabledTooltip : undefined}
                          onRun={processCommand !== undefined ? () =>
                          {
                            void processCommand.execute();
                          } : undefined}
                          onOpenHowItWorks={onOpenCommandManual}
                        />
                      );
                    }

                    const readyImageCommand = canShowRun === true
                      ? readyImageCommandsById.get(item.command.id)
                      : undefined;
                    const isExtensionNotReady = readyImageCommand === undefined;
                    const isRunDisabled = isExtensionNotReady === true || isLibraryEmpty === true;
                    const isRunLoading = runningImageCommandId === item.command.id;
                    const imageRunDisabledTooltip = isExtensionNotReady === true
                      ? runDisabledTooltip
                      : (isLibraryEmpty === true ? t("extensionPage.commands.emptyLibraryNotice") : undefined);

                    return (
                      <CommandCard
                        key={item.command.id}
                        extensionId={manifest.id}
                        isInstalled={isInstalled}
                        iconSource={iconSource}
                        item={item}
                        canShowRun={canShowRun}
                        isRunDisabled={isRunDisabled}
                        isRunLoading={isRunLoading}
                        runDisabledTooltip={imageRunDisabledTooltip}
                        runLeftSection={<IconPhoto size={Common.IconSmallSize} stroke={Common.IconStrokeSize}/>}
                        onRun={readyImageCommand !== undefined && isLibraryEmpty === false ? () =>
                        {
                          handleRunImageCommand(item, readyImageCommand);
                        } : undefined}
                        onOpenHowItWorks={onOpenCommandManual}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
