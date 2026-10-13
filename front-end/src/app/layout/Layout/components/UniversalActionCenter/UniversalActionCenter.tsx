import { type ReactElement, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Group, Kbd, Text, useMantineColorScheme } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { Spotlight } from "@mantine/spotlight";
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

import { ROUTES } from "utils";
import { StorageService } from "app/services";
import { useDeskTabsContext } from "app/context";
import { useImage, useProcessCommands } from "app/hooks";
import { ImageThumbnail, ProcessCommand } from "app/components";
import style from "./UniversalActionCenter.module.scss";


function RecentImageSpotlightAction({
  imageId,
  onSelect
}: {
  readonly imageId: string;
  readonly onSelect: (imageId: string) => void;
}): ReactElement
{
  const { data: image } = useImage(imageId);

  const subLabel = useMemo(() =>
  {
    if (!image)
    {
      return undefined;
    }
    if (image.dimensions)
    {
      return `${image.dimensions.width} × ${image.dimensions.height}`;
    }
    return image.format;
  }, [ image ]);

  const edge = 28;
  return (
    <Spotlight.Action
      onClick={() => onSelect(imageId)}
      leftSection={<ImageThumbnail imageOrUrl={image ?? imageId} width={edge} height={edge}/>}
      label={image?.name ?? imageId}
      description={subLabel}
      keywords={[ image?.name ?? "" ]}
    />
  );
}

export default function UniversalActionCenter(): ReactElement
{
  const [ t ] = useTranslation();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { commands } = useProcessCommands();
  const { addTab } = useDeskTabsContext();

  const [ searchQuery, setSearchQuery ] = useState("");

  const isDark = colorScheme === "dark";

  const [ recentImageIds, setRecentImageIds ] = useState<string[]>(() =>
  {
    return StorageService.getRecentImageIds();
  });

  const navActions = useMemo(() =>
  {
    return [
      {
        id: "nav-explore",
        label: t("actionsCenter.routes.explore", "Explore"),
        icon: <IconPhoto size={18}/>,
        execute: () => navigate(ROUTES.home)
      },
      {
        id: "nav-repositories",
        label: t("actionsCenter.routes.repositories", "Repositories"),
        icon: <IconFolderOpen size={18}/>,
        execute: () => navigate(ROUTES.repositories)
      },
      {
        id: "nav-extensions",
        label: t("actionsCenter.routes.extensions", "Extensions"),
        icon: <IconLayout size={18}/>,
        execute: () => navigate(ROUTES.extensions)
      },
      {
        id: "nav-activity",
        label: t("actionsCenter.routes.activity", "Activity"),
        icon: <IconActivity size={18}/>,
        execute: () => navigate(ROUTES.activity)
      },
      {
        id: "nav-settings",
        label: t("actionsCenter.routes.settings", "Settings"),
        icon: <IconSettings size={18}/>,
        execute: () => navigate(ROUTES.settings)
      },
      {
        id: "nav-desk",
        label: t("actionsCenter.routes.desk", "Desk"),
        icon: <IconLayout size={18}/>,
        execute: () => navigate(ROUTES.desk)
      },
      {
        id: "nav-collections",
        label: t("actionsCenter.routes.collections", "Collections"),
        icon: <IconBooks size={18}/>,
        execute: () => navigate(ROUTES.collections)
      }
    ];
  }, [ navigate ]);

  const toggleActions = useMemo(() =>
  {
    return [
      {
        id: "toggle-color-scheme",
        label: isDark ? t("actionsCenter.switchToLight", "Switch to light mode") : t("actionsCenter.switchToDark", "Switch to dark mode"),
        icon: isDark ? <IconSun size={18}/> : <IconMoon size={18}/>,
        execute: () => setColorScheme(isDark ? "light" : "dark")
      }
    ];
  }, [ isDark, setColorScheme, t ]);

  const query = searchQuery.trim().toLowerCase();

  const filteredNavActions = useMemo(() =>
  {
    if (!query)
    {
      return navActions;
    }
    return navActions.filter((item) => item.label.toLowerCase().includes(query));
  }, [ navActions, query ]);

  const filteredCommands = useMemo(() =>
  {
    if (!query)
    {
      return commands;
    }
    return commands.filter((cmd) =>
    {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const subLabelMatch = cmd.subLabel?.toLowerCase().includes(query);
      const idMatch = cmd.commandId.toLowerCase().includes(query);
      return labelMatch || subLabelMatch || idMatch;
    });
  }, [ commands, query ]);

  const filteredToggleActions = useMemo(() =>
  {
    if (!query)
    {
      return toggleActions;
    }
    return toggleActions.filter((item) => item.label.toLowerCase().includes(query));
  }, [ toggleActions, query ]);

  const filteredRecentImageIds = useMemo(() =>
  {
    if (!query)
    {
      return recentImageIds;
    }
    return recentImageIds.filter((id) => id.toLowerCase().includes(query));
  }, [ recentImageIds, query ]);

  const totalResults =
    filteredNavActions.length +
    filteredCommands.length +
    filteredToggleActions.length +
    filteredRecentImageIds.length;

  function handleSelectRecentImage(imageId: string): void
  {
    addTab({
      id: randomId(),
      label: "Image",
      content: {
        kind: "image",
        imageId
      }
    }, true);
    navigate(ROUTES.desk);
  }

  return (
    <Spotlight.Root
      shortcut="mod + k"
      query={searchQuery}
      onQueryChange={setSearchQuery}
      onSpotlightOpen={() =>
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
        footer: style.footer
      }}
    >
      <Spotlight.Search
        placeholder={t("actionsCenter.placeholder", "Jump to, search images, run a command...")}
        leftSection={<IconSearch size={18} style={{ opacity: 0.6 }}/>}
        rightSection={<Kbd size="xs">ESC</Kbd>}
      />

      <Spotlight.ActionsList>
        {filteredNavActions.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.jumpTo", "JUMP TO")}>
            {filteredNavActions.map((item) => (
              <Spotlight.Action
                key={item.id}
                onClick={item.execute}
                leftSection={item.icon}
                label={item.label}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredCommands.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.commands", "PROCESS COMMANDS")}>
            {filteredCommands.map((command) => (
              <ProcessCommand.SpotlightAction
                key={command.id}
                command={command}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredToggleActions.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.quickToggles", "QUICK TOGGLES")}>
            {filteredToggleActions.map((item) => (
              <Spotlight.Action
                key={item.id}
                onClick={item.execute}
                leftSection={item.icon}
                label={item.label}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {filteredRecentImageIds.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.recentImages", "RECENT IMAGES")}>
            {filteredRecentImageIds.map((imageId) => (
              <RecentImageSpotlightAction
                key={imageId}
                imageId={imageId}
                onSelect={handleSelectRecentImage}
              />
            ))}
          </Spotlight.ActionsGroup>
        )}

        {totalResults === 0 && (
          <Spotlight.Empty>{t("actionsCenter.noResults", "No results found")}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>

      <Spotlight.Footer className={style.footer}>
        <Group gap="xs">
          <Group gap={2}>
            <Kbd size="xs">↑</Kbd>
            <Kbd size="xs">↓</Kbd>
          </Group>
          <Text size="xs" c="dimmed">{t("actionsCenter.navigate", "navigate")}</Text>
          <Kbd size="xs">↵</Kbd>
          <Text size="xs" c="dimmed">{t("actionsCenter.select", "select")}</Text>
        </Group>
        <Text size="xs" c="dimmed">
          {t("actionsCenter.resultsCount", { count: totalResults, defaultValue: String(totalResults) + " results" })}
        </Text>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}
