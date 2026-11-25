import { type ReactElement, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Group, Kbd, Text, useMantineColorScheme } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { Spotlight } from "@mantine/spotlight";
import { useQuery } from "@tanstack/react-query";
import {
  IconActivity,
  IconBooks,
  IconFolderOpen,
  IconLayout,
  IconMoon,
  IconPhoto,
  IconSearch,
  IconSettings,
  IconSun
} from "@tabler/icons-react";
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
import { ExtensionsService, ImageService, StorageService } from "app/services";
import { useDeskTabsContext } from "app/context";
import { useExtensions, useMarketplaceExtensions, useProcessCommands } from "app/hooks";
import {
  Common,
  createOpenExtensionNavigationState,
  ExtensionIcon,
  ImageSubtitle,
  ImageThumbnail,
  ProcessCommand
} from "app/components";

import style from "./UniversalActionCenter.module.scss";


type RecentImageSpotlightActionPropsType = {
  readonly imageId: string;
  readonly image: ImageSummary;
  readonly onSelect: (imageId: string, image?: ImageSummary) => void;
};

function RecentImageSpotlightAction({
  imageId,
  image,
  onSelect
}: RecentImageSpotlightActionPropsType): ReactElement
{
  return (
    <Spotlight.Action
      onClick={(): void =>
      {
        onSelect(imageId, image);
      }}
      leftSection={image && <ImageThumbnail imageOrUrl={image} edge={28}/>}
      label={image && image.name}
      description={image && <ImageSubtitle image={image}/> as unknown as string}
      keywords={[ image?.name ?? "" ]}
    />
  );
}

type RecentImageItemType = {
  readonly imageId: string;
  readonly image: ImageSummary;
  readonly isLoading: boolean;
};

type ActionItemType = {
  readonly id: string;
  readonly label: string;
  readonly icon: ReactElement;
  readonly execute: () => void;
};

type ExtensionSpotlightItemType = {
  readonly id: string;
  readonly manifest: Manifest;
  readonly iconUrl?: string;
};


export default function UniversalActionCenter(): ReactElement
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { commands } = useProcessCommands();
  const { data: extensions = [] } = useExtensions();
  const { data: marketplaceExtensions = [] } = useMarketplaceExtensions();
  const { addTab } = useDeskTabsContext();
  const [ searchQuery, setSearchQuery ] = useState("");
  const isDark = colorScheme === "dark";
  const iconSize = 18;

  const [ recentImageIds, setRecentImageIds ] = useState<string[]>(() =>
  {
    return StorageService.getRecentImageIds();
  });

  const screenActions = useMemo<ActionItemType[]>(() =>
  {
    return [
      {
        id: "explorer",
        label: t("actionsCenter.routes.explorer"),
        icon: <IconPhoto size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.home);
        }
      },
      {
        id: "desk",
        label: t("actionsCenter.routes.desk"),
        icon: <IconLayout size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.desk);
        }
      },
      {
        id: "repositories",
        label: t("actionsCenter.routes.repositories"),
        icon: <IconFolderOpen size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.repositories);
        }
      },
      {
        id: "collections",
        label: t("actionsCenter.routes.collections"),
        icon: <IconBooks size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.collections);
        }
      },
      {
        id: "extensions",
        label: t("actionsCenter.routes.extensions"),
        icon: <IconLayout size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.extensions);
        }
      },
      {
        id: "activity",
        label: t("actionsCenter.routes.activity"),
        icon: <IconActivity size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.activity);
        }
      },
      {
        id: "settings",
        label: t("actionsCenter.routes.settings"),
        icon: <IconSettings size={iconSize}/>,
        execute: (): void =>
        {
          navigate(ROUTES.settings);
        }
      }
    ];
  }, [ navigate, t ]);

  const toggleActions = useMemo<ActionItemType[]>(() =>
  {
    return [
      {
        id: "toggle-color-scheme",
        label: isDark ? t("actionsCenter.switchToLight") : t("actionsCenter.switchToDark"),
        icon: isDark ? <IconSun size={iconSize}/> : <IconMoon size={iconSize}/>,
        execute: (): void =>
        {
          setColorScheme(isDark ? "light" : "dark");
        }
      }
    ];
  }, [ isDark, setColorScheme, t ]);

  const query = searchQuery.trim().toLowerCase();

  const filteredScreenActions = useMemo<ActionItemType[]>(() =>
  {
    if (!query)
    {
      return screenActions;
    }
    return screenActions.filter((action) =>
    {
      return action.label.toLowerCase().includes(query);
    });
  }, [ screenActions, query ]);

  const filteredExtensions = useMemo<ExtensionSpotlightItemType[]>(() =>
  {
    const installedIds = new Set<string>(extensions.map(extension => extension.manifest.id));
    const items: ExtensionSpotlightItemType[] = extensions.map(extension => ({
      id: extension.manifest.id,
      manifest: extension.manifest
    }));

    if (query.length > 0)
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

    const filtered = query.length === 0
      ? items
      : items.filter(item => ExtensionsService.matchesSearch(item.manifest, query));

    return filtered.sort((first, second) => first.manifest.name.localeCompare(second.manifest.name));
  }, [ extensions, marketplaceExtensions, query ]);

  const filteredCommands = useMemo<ProcessCommandType[]>(() =>
  {
    if (!query)
    {
      return commands;
    }
    return commands.filter((command) =>
    {
      const labelMatch = command.label.toLowerCase().includes(query);
      const subLabelMatch = command.subLabel?.toLowerCase().includes(query);
      const idMatch = command.commandId.toLowerCase().includes(query);
      return Boolean(labelMatch || subLabelMatch || idMatch);
    });
  }, [ commands, query ]);

  const filteredToggleActions = useMemo<ActionItemType[]>(() =>
  {
    if (!query)
    {
      return toggleActions;
    }
    return toggleActions.filter((action) =>
    {
      return action.label.toLowerCase().includes(query);
    });
  }, [ toggleActions, query ]);

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
      const summariesById = new Map<string, ImageSummary>(summaryItems.map((summary): [ string, ImageSummary ] => ([ summary.id, summary ])));

      return recentImageIds.map((imageId): RecentImageItemType =>
        {
          return {
            imageId,
            image: summariesById.get(imageId),
            isLoading: isRecentImagesLoading
          };
        }
      );
    },
    [ recentImageIds, recentImagesResult, isRecentImagesLoading ]
  );

  const filteredRecentImages = useMemo<RecentImageItemType[]>(() =>
    {
      return recentImages.filter(
        (recentImageItem): boolean =>
        {
          if (!recentImageItem.image)
          {
            return recentImageItem.isLoading;
          }
          if (!query)
          {
            return true;
          }
          const nameMatch = recentImageItem.image.name.toLowerCase().includes(query);
          const idMatch = recentImageItem.imageId.toLowerCase().includes(query);
          return Boolean(nameMatch || idMatch);
        }
      );
    },
    [ recentImages, query ]
  );

  const totalResults =
    filteredScreenActions.length +
    filteredExtensions.length +
    filteredCommands.length +
    filteredToggleActions.length +
    filteredRecentImages.length;

  function handleSelectExtension(extensionId: string): void
  {
    navigate(ROUTES.extensions, {
      state: createOpenExtensionNavigationState(extensionId)
    });
  }

  async function handleSelectRecentImage(imageId: string, image?: ImageSummary): Promise<void>
  {
    const targetImage = image ?? recentImages.find((item) => item.imageId === imageId)?.image;
    const iconUrl = targetImage?.url ? await ImageService.computeImageUriFromUrls([ targetImage.url ], Common.NotificationIllustrationEdge) : await ImageService.computeImageUriFromIds([ imageId ], Common.NotificationIllustrationEdge);
    const icon = { url: iconUrl };

    const tabId = addTab({
      id: randomId(),
      label: targetImage?.name ?? t("actionsCenter.imageTab"),
      icon,
      content: {
        kind: "image",
        imageId
      }
    }, true);
    navigate(computeDeskRoute(tabId));
  }

  return (
    <Spotlight.Root
      shortcut="mod + k"
      query={searchQuery}
      onQueryChange={setSearchQuery}
      onSpotlightOpen={(): void =>
      {
        setRecentImageIds(StorageService.getRecentImageIds());
      }}
      size={580}
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
      />

      <Spotlight.ActionsList>
        {filteredScreenActions.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.jumpTo")}>
            {filteredScreenActions.map((navAction) => (
              <Spotlight.Action
                key={navAction.id}
                onClick={navAction.execute}
                leftSection={navAction.icon}
                label={navAction.label}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredExtensions.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.extensions")}>
            {filteredExtensions.map(extensionItem => (
              <Spotlight.Action
                key={`extension-${extensionItem.id}`}
                onClick={() => handleSelectExtension(extensionItem.id)}
                leftSection={<ExtensionIcon idOrExtension={extensionItem.id} url={extensionItem.iconUrl} size="sm"/>}
                label={extensionItem.manifest.name}
                description={extensionItem.manifest.description}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredCommands.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.commands")}>
            {filteredCommands.map((command) => (
              <ProcessCommand.SpotlightAction
                key={command.id}
                command={command}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredToggleActions.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.quickToggles")}>
            {filteredToggleActions.map((toggleAction) => (
              <Spotlight.Action
                key={toggleAction.id}
                onClick={toggleAction.execute}
                leftSection={toggleAction.icon}
                label={toggleAction.label}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredRecentImages.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.recentImages")}>
            {filteredRecentImages.map((recentImageItem) => (
              <RecentImageSpotlightAction
                key={recentImageItem.imageId}
                imageId={recentImageItem.imageId}
                image={recentImageItem.image}
                onSelect={handleSelectRecentImage}
              />
            ))}
          </Spotlight.ActionsGroup>
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
        </Group>
        <Text size="xs" c="dimmed">
          {t("actionsCenter.resultsCount", { count: totalResults })}
        </Text>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}
