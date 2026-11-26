import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import { ActionIcon, getDefaultZIndex, Group, Kbd, Text, Tooltip, useMantineColorScheme } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { spotlight, Spotlight } from "@mantine/spotlight";
import { useQuery } from "@tanstack/react-query";
import { IconChevronRight, IconHistory, IconMoon, IconRestore, IconSearch, IconSun } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  type ImageSummary,
  type Manifest,
  type SearchImageSummaryResult,
  SearchOriginNature
} from "@picteus/ws-client";

import type { ProcessCommandType } from "types";
import { computeDeskRoute, ROUTES } from "utils";
import { queryKeys } from "app/query";
import { ImageService, StorageService } from "app/services";
import { useActionModalContext, useDeskTabsContext } from "app/context";
import { useExtensions, useMarketplaceExtensions, useProcessCommands } from "app/hooks";
import {
  ALL_APP_SCREENS,
  Common,
  createOpenExtensionNavigationState,
  ExtensionIcon,
  ProcessCommand
} from "app/components";

import {
  ACTION_CENTER_SCOPE_ICONS,
  ACTION_CENTER_SCOPE_LABEL_KEYS,
  ACTION_CENTER_SCOPE_PREFIXES,
  ACTION_CENTER_SCOPES,
  type ActionCenterScopeType,
  type ActionCenterSectionScopeType,
  ALL_EMPTY_SECTION_LIMIT,
  computeActionCenterEntryKey,
  FREQUENT_ITEMS_LIMIT,
  MIN_FREQUENT_SCORE,
  rankActionCenterItems
} from "./actionCenterRanking.ts";
import {
  ActionCenterScopeBar,
  ActionCenterSectionBadge,
  ActionCenterSectionGroup,
  RecentImageSpotlightAction
} from "./components";
import useActionCenterUsage from "./useActionCenterUsage.ts";

import style from "./UniversalActionCenter.module.scss";


const TOOLTIP_Z_INDEX = getDefaultZIndex("max") + 1;

type RecentImageItemType =
  {
    readonly imageId: string;
    readonly image: ImageSummary | undefined;
    readonly isLoading: boolean;
  };

type ActionItemType =
  {
    readonly id: string;
    readonly label: string;
    readonly icon: ReactElement;
    readonly execute: () => void;
  };

type ExtensionSpotlightItemType =
  {
    readonly id: string;
    readonly manifest: Manifest;
    readonly iconUrl?: string;
  };

type FrequentActionItemType =
  | {
    readonly section: "jumpTo";
    readonly entryKey: string;
    readonly frecencyScore: number;
    readonly lastUsedAt: number;
    readonly action: ActionItemType;
  }
  | {
    readonly section: "commands";
    readonly entryKey: string;
    readonly frecencyScore: number;
    readonly lastUsedAt: number;
    readonly command: ProcessCommandType;
  }
  | {
    readonly section: "recentImages";
    readonly entryKey: string;
    readonly frecencyScore: number;
    readonly lastUsedAt: number;
    readonly recentImageItem: RecentImageItemType;
  }
  | {
    readonly section: "extensions";
    readonly entryKey: string;
    readonly frecencyScore: number;
    readonly lastUsedAt: number;
    readonly extensionItem: ExtensionSpotlightItemType;
  }
  | {
    readonly section: "quickToggles";
    readonly entryKey: string;
    readonly frecencyScore: number;
    readonly lastUsedAt: number;
    readonly action: ActionItemType;
  };


export default function UniversalActionCenter(): ReactElement
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { commands } = useProcessCommands();
  const { data: extensions = [] } = useExtensions();
  const { data: marketplaceExtensions = [] } = useMarketplaceExtensions();
  const { modals } = useActionModalContext();
  const { addTab } = useDeskTabsContext();
  const actionsListRef = useRef<HTMLDivElement>(null);
  const [ isOpened, setIsOpened ] = useState<boolean>(false);
  const [ searchQuery, setSearchQuery ] = useState<string>("");
  const [ activeScope, setActiveScope ] = useState<ActionCenterScopeType>("all");
  const {
    usageSnapshot,
    snapshotNowMs,
    hasUsageHistory,
    refreshSnapshot,
    recordUsage: persistUsage,
    resetUsage,
    getFrecencyScore,
    getLastUsedAt
  } = useActionCenterUsage();
  const hasOpenModal = modals.length > 0;
  const isDark = colorScheme === "dark";
  const iconSize = 18;

  useEffect(() =>
  {
    if (hasOpenModal === true)
    {
      spotlight.close();
    }
  }, [ hasOpenModal ]);

  const [ recentImageIds, setRecentImageIds ] = useState<string[]>(StorageService.getRecentImageIds);

  const query = searchQuery.trim().toLowerCase();
  const hasQuery = query.length > 0;

  const recordUsage = useCallback(
    (section: ActionCenterSectionScopeType, itemId: string): void => persistUsage(section, itemId, query),
    [ persistUsage, query ]
  );

  const selectScope = useCallback((nextScope: ActionCenterScopeType): void =>
  {
    setActiveScope(nextScope);
    const listElement = actionsListRef.current;
    if (listElement !== null)
    {
      listElement.querySelector("[data-selected]")?.removeAttribute("data-selected");
      listElement.querySelector(".mantine-ScrollArea-viewport")?.scrollTo({ top: 0 });
    }
    if (isOpened === true)
    {
      spotlight.open();
    }
  }, [ isOpened ]);

  function handleQueryChange(nextValue: string): void
  {
    if (activeScope === "all" && searchQuery.length === 0 && nextValue.length === 1)
    {
      const prefixScope = ACTION_CENTER_SCOPE_PREFIXES[nextValue];
      if (prefixScope !== undefined)
      {
        selectScope(prefixScope);
        setSearchQuery("");
        return;
      }
    }
    setSearchQuery(nextValue);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void
  {
    if (event.key === "Tab" && event.altKey === false && event.ctrlKey === false && event.metaKey === false)
    {
      event.preventDefault();
      const currentIndex = ACTION_CENTER_SCOPES.indexOf(activeScope);
      const direction = event.shiftKey === true ? -1 : 1;
      const nextIndex = (currentIndex + direction + ACTION_CENTER_SCOPES.length) % ACTION_CENTER_SCOPES.length;
      selectScope(ACTION_CENTER_SCOPES[nextIndex]);
      return;
    }

    if ((event.metaKey === true || event.ctrlKey === true) && event.altKey === false && event.shiftKey === false)
    {
      const scopeIndex = Number(event.key) - 1;
      if (Number.isInteger(scopeIndex) === true && scopeIndex >= 0 && scopeIndex < ACTION_CENTER_SCOPES.length)
      {
        event.preventDefault();
        selectScope(ACTION_CENTER_SCOPES[scopeIndex]);
        return;
      }
    }

    if (event.key === "Backspace" && searchQuery.length === 0 && activeScope !== "all")
    {
      event.preventDefault();
      selectScope("all");
    }
  }

  function handlePreventFocusLoss(event: MouseEvent<HTMLButtonElement>): void
  {
    event.preventDefault();
  }

  const screenActions = useMemo<ActionItemType[]>(() =>
  {
    return ALL_APP_SCREENS.map((screen): ActionItemType =>
    {
      const ScreenIcon = screen.icon;
      return {
        id: screen.id,
        label: t(screen.titleKey),
        icon: <ScreenIcon size={iconSize} stroke={Common.IconStrokeSize}/>,
        execute: (): void =>
        {
          recordUsage("jumpTo", screen.id);
          navigate(screen.route);
        }
      };
    });
  }, [ navigate, recordUsage, t ]);

  const toggleActions = useMemo<ActionItemType[]>(() =>
  {
    return [
      {
        id: "toggle-color-scheme",
        label: isDark === true ? t("actionsCenter.switchToLight") : t("actionsCenter.switchToDark"),
        icon: isDark === true ? <IconSun size={iconSize}/> : <IconMoon size={iconSize}/>,
        execute: (): void =>
        {
          recordUsage("quickToggles", "toggle-color-scheme");
          setColorScheme(isDark === true ? "light" : "dark");
        }
      }
    ];
  }, [ isDark, recordUsage, setColorScheme, t ]);

  const filteredScreenActions = useMemo<ActionItemType[]>(() =>
  {
    return rankActionCenterItems({
      section: "jumpTo",
      items: screenActions,
      query,
      usage: usageSnapshot,
      nowMs: snapshotNowMs,
      getId: action => action.id,
      getPrimaryText: action => action.label,
      getSecondaryTexts: action => [ action.id ]
    });
  }, [ screenActions, query, usageSnapshot, snapshotNowMs ]);

  const filteredExtensions = useMemo<ExtensionSpotlightItemType[]>(() =>
  {
    const installedIds = new Set<string>(extensions.map(extension => extension.manifest.id));
    const items: ExtensionSpotlightItemType[] = extensions.map(extension => ({
      id: extension.manifest.id,
      manifest: extension.manifest
    }));

    if (hasQuery === true)
    {
      for (const marketplaceExtension of marketplaceExtensions)
      {
        if (installedIds.has(marketplaceExtension.manifest.id) === false)
        {
          items.push({
            id: marketplaceExtension.manifest.id,
            manifest: marketplaceExtension.manifest,
            iconUrl: marketplaceExtension.icon
          });
        }
      }
    }

    const alphabeticallySorted = [ ...items ].sort(
      (first, second) => first.manifest.name.localeCompare(second.manifest.name)
    );

    return rankActionCenterItems({
      section: "extensions",
      items: alphabeticallySorted,
      query,
      usage: usageSnapshot,
      nowMs: snapshotNowMs,
      getId: item => item.id,
      getPrimaryText: item => item.manifest.name,
      getSecondaryTexts: item => [ item.manifest.id, item.manifest.description, item.manifest.author ]
    });
  }, [ extensions, marketplaceExtensions, query, hasQuery, usageSnapshot, snapshotNowMs ]);

  const filteredCommands = useMemo<ProcessCommandType[]>(() =>
  {
    return rankActionCenterItems({
      section: "commands",
      items: commands,
      query,
      usage: usageSnapshot,
      nowMs: snapshotNowMs,
      getId: command => command.id,
      getPrimaryText: command => command.label,
      getSecondaryTexts: command => [ command.subLabel, command.commandId ]
    });
  }, [ commands, query, usageSnapshot, snapshotNowMs ]);

  const filteredToggleActions = useMemo<ActionItemType[]>(() =>
  {
    return rankActionCenterItems({
      section: "quickToggles",
      items: toggleActions,
      query,
      usage: usageSnapshot,
      nowMs: snapshotNowMs,
      getId: action => action.id,
      getPrimaryText: action => action.label,
      getSecondaryTexts: action => [ action.id ]
    });
  }, [ toggleActions, query, usageSnapshot, snapshotNowMs ]);

  const { data: recentImagesResult, isLoading: isRecentImagesLoading } = useQuery(
    {
      queryKey: queryKeys.images.recentSummaries(recentImageIds),
      queryFn: (): Promise<SearchImageSummaryResult> =>
      {
        return ImageService.searchSummaries(
          {
            filter: {
              origin: {
                kind: SearchOriginNature.Images,
                ids: recentImageIds
              }
            },
            range: { take: recentImageIds.length }
          }
        );
      },
      enabled: recentImageIds.length > 0
    }
  );

  const recentImages = useMemo<RecentImageItemType[]>(() =>
  {
    const summaryItems = recentImagesResult?.items ?? [];
    const summariesById = new Map<string, ImageSummary>(
      summaryItems.map((summary): [ string, ImageSummary ] => [ summary.id, summary ])
    );

    return recentImageIds.map((imageId): RecentImageItemType =>
    {
      return {
        imageId,
        image: summariesById.get(imageId),
        isLoading: isRecentImagesLoading
      };
    });
  }, [ recentImageIds, recentImagesResult, isRecentImagesLoading ]);

  const filteredRecentImages = useMemo<RecentImageItemType[]>(() =>
  {
    return rankActionCenterItems({
      section: "recentImages",
      items: recentImages,
      query,
      usage: usageSnapshot,
      nowMs: snapshotNowMs,
      getId: item => item.imageId,
      getPrimaryText: item => item.image?.name,
      getSecondaryTexts: item => [ item.imageId ],
      shouldKeepWithoutMatch: item => item.isLoading === true && hasQuery === false
    });
  }, [ recentImages, query, hasQuery, usageSnapshot, snapshotNowMs ]);

  const frequentItems = useMemo<FrequentActionItemType[]>(() =>
  {
    if (activeScope !== "all" || hasQuery === true)
    {
      return [];
    }

    const candidates: FrequentActionItemType[] = [];

    for (const action of filteredScreenActions)
    {
      const entryKey = computeActionCenterEntryKey("jumpTo", action.id);
      const frecencyScore = getFrecencyScore(entryKey);
      if (frecencyScore >= MIN_FREQUENT_SCORE)
      {
        candidates.push({
          section: "jumpTo",
          entryKey,
          frecencyScore,
          lastUsedAt: getLastUsedAt(entryKey),
          action
        });
      }
    }

    for (const command of filteredCommands)
    {
      const entryKey = computeActionCenterEntryKey("commands", command.id);
      const frecencyScore = getFrecencyScore(entryKey);
      if (frecencyScore >= MIN_FREQUENT_SCORE)
      {
        candidates.push({
          section: "commands",
          entryKey,
          frecencyScore,
          lastUsedAt: getLastUsedAt(entryKey),
          command
        });
      }
    }

    for (const recentImageItem of filteredRecentImages)
    {
      if (recentImageItem.image === undefined)
      {
        continue;
      }
      const entryKey = computeActionCenterEntryKey("recentImages", recentImageItem.imageId);
      const frecencyScore = getFrecencyScore(entryKey);
      if (frecencyScore >= MIN_FREQUENT_SCORE)
      {
        candidates.push({
          section: "recentImages",
          entryKey,
          frecencyScore,
          lastUsedAt: getLastUsedAt(entryKey),
          recentImageItem
        });
      }
    }

    for (const extensionItem of filteredExtensions)
    {
      const entryKey = computeActionCenterEntryKey("extensions", extensionItem.id);
      const frecencyScore = getFrecencyScore(entryKey);
      if (frecencyScore >= MIN_FREQUENT_SCORE)
      {
        candidates.push({
          section: "extensions",
          entryKey,
          frecencyScore,
          lastUsedAt: getLastUsedAt(entryKey),
          extensionItem
        });
      }
    }

    for (const action of filteredToggleActions)
    {
      const entryKey = computeActionCenterEntryKey("quickToggles", action.id);
      const frecencyScore = getFrecencyScore(entryKey);
      if (frecencyScore >= MIN_FREQUENT_SCORE)
      {
        candidates.push({
          section: "quickToggles",
          entryKey,
          frecencyScore,
          lastUsedAt: getLastUsedAt(entryKey),
          action
        });
      }
    }

    return candidates
      .sort((first, second) =>
      {
        if (second.frecencyScore !== first.frecencyScore)
        {
          return second.frecencyScore - first.frecencyScore;
        }
        return second.lastUsedAt - first.lastUsedAt;
      })
      .slice(0, FREQUENT_ITEMS_LIMIT);
  }, [
    activeScope,
    hasQuery,
    filteredScreenActions,
    filteredCommands,
    filteredRecentImages,
    filteredExtensions,
    filteredToggleActions,
    getFrecencyScore,
    getLastUsedAt
  ]);

  const frequentEntryKeys = useMemo<Set<string>>(
    () => new Set<string>(frequentItems.map(item => item.entryKey)),
    [ frequentItems ]
  );

  const shouldDeduplicateFrequent = activeScope === "all" && hasQuery === false && frequentEntryKeys.size > 0;
  const shouldCapSections = activeScope === "all" && hasQuery === false;

  const displayedScreenActions = useMemo<ActionItemType[]>(() =>
  {
    if (shouldDeduplicateFrequent === false)
    {
      return filteredScreenActions;
    }
    return filteredScreenActions.filter(
      action => frequentEntryKeys.has(computeActionCenterEntryKey("jumpTo", action.id)) === false
    );
  }, [ filteredScreenActions, frequentEntryKeys, shouldDeduplicateFrequent ]);

  const remainingCommands = useMemo<ProcessCommandType[]>(() =>
  {
    if (shouldDeduplicateFrequent === false)
    {
      return filteredCommands;
    }
    return filteredCommands.filter(
      command => frequentEntryKeys.has(computeActionCenterEntryKey("commands", command.id)) === false
    );
  }, [ filteredCommands, frequentEntryKeys, shouldDeduplicateFrequent ]);

  const remainingRecentImages = useMemo<RecentImageItemType[]>(() =>
  {
    if (shouldDeduplicateFrequent === false)
    {
      return filteredRecentImages;
    }
    return filteredRecentImages.filter(
      item => frequentEntryKeys.has(computeActionCenterEntryKey("recentImages", item.imageId)) === false
    );
  }, [ filteredRecentImages, frequentEntryKeys, shouldDeduplicateFrequent ]);

  const remainingExtensions = useMemo<ExtensionSpotlightItemType[]>(() =>
  {
    if (shouldDeduplicateFrequent === false)
    {
      return filteredExtensions;
    }
    return filteredExtensions.filter(
      item => frequentEntryKeys.has(computeActionCenterEntryKey("extensions", item.id)) === false
    );
  }, [ filteredExtensions, frequentEntryKeys, shouldDeduplicateFrequent ]);

  const displayedCommands = shouldCapSections === true
    ? remainingCommands.slice(0, ALL_EMPTY_SECTION_LIMIT)
    : remainingCommands;
  const displayedRecentImages = shouldCapSections === true
    ? remainingRecentImages.slice(0, ALL_EMPTY_SECTION_LIMIT)
    : remainingRecentImages;
  const displayedExtensions = shouldCapSections === true
    ? remainingExtensions.slice(0, ALL_EMPTY_SECTION_LIMIT)
    : remainingExtensions;

  const displayedToggleActions = useMemo<ActionItemType[]>(() =>
  {
    if (shouldDeduplicateFrequent === false)
    {
      return filteredToggleActions;
    }
    return filteredToggleActions.filter(
      action => frequentEntryKeys.has(computeActionCenterEntryKey("quickToggles", action.id)) === false
    );
  }, [ filteredToggleActions, frequentEntryKeys, shouldDeduplicateFrequent ]);

  const countsByScope = useMemo<Readonly<Record<ActionCenterScopeType, number>>>(() =>
  {
    const allCount =
      filteredScreenActions.length +
      filteredCommands.length +
      filteredRecentImages.length +
      filteredExtensions.length +
      filteredToggleActions.length;

    return {
      all: allCount,
      jumpTo: filteredScreenActions.length,
      commands: filteredCommands.length,
      recentImages: filteredRecentImages.length,
      extensions: filteredExtensions.length,
      quickToggles: filteredToggleActions.length
    };
  }, [
    filteredScreenActions.length,
    filteredCommands.length,
    filteredRecentImages.length,
    filteredExtensions.length,
    filteredToggleActions.length
  ]);

  const totalResults = countsByScope[activeScope];

  const hasMoreCommands = shouldCapSections === true && remainingCommands.length > ALL_EMPTY_SECTION_LIMIT;
  const hasMoreRecentImages = shouldCapSections === true && remainingRecentImages.length > ALL_EMPTY_SECTION_LIMIT;
  const hasMoreExtensions = shouldCapSections === true && remainingExtensions.length > ALL_EMPTY_SECTION_LIMIT;

  function isSectionVisible(section: ActionCenterSectionScopeType): boolean
  {
    return activeScope === "all" || activeScope === section;
  }

  function handleSelectExtension(extensionId: string): void
  {
    recordUsage("extensions", extensionId);
    navigate(ROUTES.extensions, {
      state: createOpenExtensionNavigationState(extensionId)
    });
  }

  async function handleSelectRecentImage(imageId: string, image?: ImageSummary): Promise<void>
  {
    recordUsage("recentImages", imageId);
    const targetImage = image ?? recentImages.find(item => item.imageId === imageId)?.image;
    const iconUrl = targetImage?.url
      ? await ImageService.computeImageUriFromUrls([ targetImage.url ], Common.NotificationIllustrationEdge)
      : await ImageService.computeImageUriFromIds([ imageId ], Common.NotificationIllustrationEdge);
    const icon = { url: iconUrl };

    const tabId = addTab({
      id: randomId(),
      label: targetImage?.name ?? t("field.image"),
      icon,
      content: {
        kind: "image",
        imageId
      }
    }, true);
    navigate(computeDeskRoute(tabId));
  }

  function onSelectRecentImage(imageId: string, image?: ImageSummary): void
  {
    void handleSelectRecentImage(imageId, image);
  }

  function renderShowAllAction(section: ActionCenterSectionScopeType, totalCount: number): ReactElement
  {
    return (
      <Spotlight.Action
        key={`show-all-${section}`}
        closeSpotlightOnTrigger={false}
        leftSection={<IconChevronRight size={14} stroke={Common.IconStrokeSize}/>}
        label={t("actionsCenter.showAllInSection", {
          count: totalCount,
          section: t(ACTION_CENTER_SCOPE_LABEL_KEYS[section])
        })}
        onClick={(): void =>
        {
          selectScope(section);
        }}
      />
    );
  }

  function renderFrequentItem(frequentItem: FrequentActionItemType): ReactElement
  {
    const badge = <ActionCenterSectionBadge section={frequentItem.section}/>;

    switch (frequentItem.section)
    {
      case "jumpTo":
      case "quickToggles":
        return (
          <Spotlight.Action
            key={`frequent-${frequentItem.entryKey}`}
            onClick={frequentItem.action.execute}
            leftSection={frequentItem.action.icon}
            rightSection={badge}
            label={frequentItem.action.label}
          />
        );
      case "commands":
        return (
          <ProcessCommand.SpotlightAction
            key={`frequent-${frequentItem.entryKey}`}
            command={frequentItem.command}
            onClick={(): void =>
            {
              recordUsage("commands", frequentItem.command.id);
            }}
            {...(frequentItem.command.shortcut === undefined ? { rightSection: badge } : {})}
          />
        );
      case "recentImages":
        return (
          <RecentImageSpotlightAction
            key={`frequent-${frequentItem.entryKey}`}
            imageId={frequentItem.recentImageItem.imageId}
            image={frequentItem.recentImageItem.image}
            rightSection={badge}
            onSelect={onSelectRecentImage}
          />
        );
      case "extensions":
        return (
          <Spotlight.Action
            key={`frequent-${frequentItem.entryKey}`}
            onClick={(): void =>
            {
              handleSelectExtension(frequentItem.extensionItem.id);
            }}
            leftSection={(
              <ExtensionIcon
                idOrExtension={frequentItem.extensionItem.id}
                url={frequentItem.extensionItem.iconUrl}
                size="sm"
              />
            )}
            rightSection={badge}
            label={frequentItem.extensionItem.manifest.name}
            description={frequentItem.extensionItem.manifest.description}
          />
        );
    }
  }

  return (
    <Spotlight.Root
      shortcut={hasOpenModal === true ? null : "mod + k"}
      query={searchQuery}
      onQueryChange={handleQueryChange}
      onSpotlightOpen={(): void =>
      {
        setIsOpened(true);
        setActiveScope("all");
        setRecentImageIds(StorageService.getRecentImageIds());
        refreshSnapshot();
      }}
      onSpotlightClose={(): void =>
      {
        setIsOpened(false);
      }}
      size={640}
      radius="md"
      centered={false}
      yOffset="10vh"
      scrollable={true}
      maxHeight={420}
      overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      classNames={{
        content: style.content,
        body: style.body,
        actionsList: style.actionsList,
        actionBody: style.actionBody,
        actionLabel: style.actionLabel,
        actionDescription: style.actionDescription,
        actionSection: style.actionSection,
        footer: style.footer
      }}
    >
      <Spotlight.Search
        placeholder={t("actionsCenter.placeholder")}
        leftSection={<IconSearch size={iconSize} style={{ opacity: 0.6 }}/>}
        rightSection={<Kbd size="xs">{t("keyShortcuts.escape")}</Kbd>}
        onKeyDown={handleSearchKeyDown}
      />

      <ActionCenterScopeBar
        activeScope={activeScope}
        countsByScope={countsByScope}
        hasQuery={hasQuery}
        onSelectScope={selectScope}
      />

      <Spotlight.ActionsList ref={actionsListRef}>
        {frequentItems.length > 0 && (
          <ActionCenterSectionGroup icon={IconHistory} label={t("actionsCenter.sections.frequent")}>
            {frequentItems.map(renderFrequentItem)}
          </ActionCenterSectionGroup>
        )}

        {isSectionVisible("jumpTo") === true && displayedScreenActions.length > 0 && (
          <ActionCenterSectionGroup
            icon={ACTION_CENTER_SCOPE_ICONS.jumpTo}
            label={t("actionsCenter.sections.jumpTo")}
          >
            {displayedScreenActions.map(navAction => (
              <Spotlight.Action
                key={navAction.id}
                onClick={navAction.execute}
                leftSection={navAction.icon}
                label={navAction.label}
                highlightQuery={hasQuery}
              />
            ))}
          </ActionCenterSectionGroup>
        )}

        {isSectionVisible("commands") === true && displayedCommands.length > 0 && (
          <ActionCenterSectionGroup
            icon={ACTION_CENTER_SCOPE_ICONS.commands}
            label={t("field.commands")}
          >
            {displayedCommands.map(command => (
              <ProcessCommand.SpotlightAction
                key={command.id}
                command={command}
                highlightQuery={hasQuery}
                onClick={(): void =>
                {
                  recordUsage("commands", command.id);
                }}
              />
            ))}
            {hasMoreCommands === true && renderShowAllAction("commands", filteredCommands.length)}
          </ActionCenterSectionGroup>
        )}

        {isSectionVisible("recentImages") === true && displayedRecentImages.length > 0 && (
          <ActionCenterSectionGroup
            icon={ACTION_CENTER_SCOPE_ICONS.recentImages}
            label={t("actionsCenter.sections.recentImages")}
          >
            {displayedRecentImages.map(recentImageItem => (
              <RecentImageSpotlightAction
                key={recentImageItem.imageId}
                imageId={recentImageItem.imageId}
                image={recentImageItem.image}
                shouldHighlightQuery={hasQuery}
                onSelect={onSelectRecentImage}
              />
            ))}
            {hasMoreRecentImages === true && renderShowAllAction("recentImages", filteredRecentImages.length)}
          </ActionCenterSectionGroup>
        )}

        {isSectionVisible("extensions") === true && displayedExtensions.length > 0 && (
          <ActionCenterSectionGroup
            icon={ACTION_CENTER_SCOPE_ICONS.extensions}
            label={t("field.extensions")}
          >
            {displayedExtensions.map(extensionItem => (
              <Spotlight.Action
                key={`extension-${extensionItem.id}`}
                onClick={(): void =>
                {
                  handleSelectExtension(extensionItem.id);
                }}
                leftSection={<ExtensionIcon idOrExtension={extensionItem.id} url={extensionItem.iconUrl} size="sm"/>}
                label={extensionItem.manifest.name}
                description={extensionItem.manifest.description}
                highlightQuery={hasQuery}
              />
            ))}
            {hasMoreExtensions === true && renderShowAllAction("extensions", filteredExtensions.length)}
          </ActionCenterSectionGroup>
        )}

        {isSectionVisible("quickToggles") === true && displayedToggleActions.length > 0 && (
          <ActionCenterSectionGroup
            icon={ACTION_CENTER_SCOPE_ICONS.quickToggles}
            label={t("actionsCenter.sections.quickToggles")}
          >
            {displayedToggleActions.map(toggleAction => (
              <Spotlight.Action
                key={toggleAction.id}
                onClick={toggleAction.execute}
                leftSection={toggleAction.icon}
                label={toggleAction.label}
                highlightQuery={hasQuery}
              />
            ))}
          </ActionCenterSectionGroup>
        )}

        {totalResults === 0 && (
          <Spotlight.Empty>{t("actionsCenter.noResults")}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>

      <Spotlight.Footer>
        <Group gap="xs">
          <Group gap={2}>
            <Kbd size="xs">↑</Kbd>
            <Kbd size="xs">↓</Kbd>
          </Group>
          <Text size="xs" c="dimmed">{t("actionsCenter.navigate")}</Text>
          <Kbd size="xs">↵</Kbd>
          <Text size="xs" c="dimmed">{t("actionsCenter.select")}</Text>
          <Kbd size="xs">⇥</Kbd>
          <Text size="xs" c="dimmed">{t("actionsCenter.section")}</Text>
        </Group>
        <Group gap="xs">
          {hasUsageHistory === true && (
            <Tooltip label={t("actionsCenter.resetRanking")} withArrow zIndex={TOOLTIP_Z_INDEX}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                tabIndex={-1}
                onMouseDown={handlePreventFocusLoss}
                onClick={resetUsage}
              >
                <IconRestore size={13} stroke={Common.IconStrokeSize}/>
              </ActionIcon>
            </Tooltip>
          )}
          <Text size="xs" c="dimmed">
            {t("actionsCenter.resultsCount", { count: totalResults })}
          </Text>
        </Group>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}
