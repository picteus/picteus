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

import type { ProcessCommandType } from "types";
import { ROUTES } from "utils";
import { StorageService } from "app/services";
import { useDeskTabsContext } from "app/context";
import { useImage, useProcessCommands } from "app/hooks";
import { ImageThumbnail, ProcessCommand } from "app/components";

import style from "./UniversalActionCenter.module.scss";


type RecentImageSpotlightActionPropsType = {
  readonly imageId: string;
  readonly onSelect: (imageId: string, imageName?: string) => void;
};

type ActionItemType = {
  readonly id: string;
  readonly label: string;
  readonly icon: ReactElement;
  readonly execute: () => void;
};

function RecentImageSpotlightAction(props: RecentImageSpotlightActionPropsType): ReactElement
{
  const { imageId, onSelect } = props;
  const { data: image } = useImage(imageId);

  const subLabel = useMemo<string | undefined>(() =>
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
      onClick={(): void =>
      {
        onSelect(imageId, image?.name);
      }}
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

  const navActions = useMemo<ActionItemType[]>(() =>
  {
    return [
      {
        id: "nav-explore",
        label: t("actionsCenter.routes.explore"),
        icon: <IconPhoto size={18}/>,
        execute: (): void =>
        {
          navigate(ROUTES.home);
        }
      },
      {
        id: "nav-desk",
        label: t("actionsCenter.routes.desk"),
        icon: <IconLayout size={18}/>,
        execute: (): void =>
        {
          navigate(ROUTES.desk);
        }
      },
      {
        id: "nav-repositories",
        label: t("actionsCenter.routes.repositories"),
        icon: <IconFolderOpen size={18}/>,
        execute: (): void =>
        {
          navigate(ROUTES.repositories);
        }
      },
      {
        id: "nav-collections",
        label: t("actionsCenter.routes.collections"),
        icon: <IconBooks size={18}/>,
        execute: (): void =>
        {
          navigate(ROUTES.collections);
        }
      },
      {
        id: "nav-extensions",
        label: t("actionsCenter.routes.extensions"),
        icon: <IconLayout size={18}/>,
        execute: (): void =>
        {
          navigate(ROUTES.extensions);
        }
      },
      {
        id: "nav-activity",
        label: t("actionsCenter.routes.activity"),
        icon: <IconActivity size={18}/>,
        execute: (): void =>
        {
          navigate(ROUTES.activity);
        }
      },
      {
        id: "nav-settings",
        label: t("actionsCenter.routes.settings"),
        icon: <IconSettings size={18}/>,
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
        icon: isDark ? <IconSun size={18}/> : <IconMoon size={18}/>,
        execute: (): void =>
        {
          setColorScheme(isDark ? "light" : "dark");
        }
      }
    ];
  }, [ isDark, setColorScheme, t ]);

  const query = searchQuery.trim().toLowerCase();

  const filteredNavActions = useMemo<ActionItemType[]>(() =>
  {
    if (!query)
    {
      return navActions;
    }
    return navActions.filter((navAction) =>
    {
      return navAction.label.toLowerCase().includes(query);
    });
  }, [ navActions, query ]);

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
    return toggleActions.filter((toggleAction) =>
    {
      return toggleAction.label.toLowerCase().includes(query);
    });
  }, [ toggleActions, query ]);

  const filteredRecentImageIds = useMemo<string[]>(() =>
  {
    if (!query)
    {
      return recentImageIds;
    }
    return recentImageIds.filter((imageId) =>
    {
      return imageId.toLowerCase().includes(query);
    });
  }, [ recentImageIds, query ]);

  const totalResults =
    filteredNavActions.length +
    filteredCommands.length +
    filteredToggleActions.length +
    filteredRecentImageIds.length;

  function handleSelectRecentImage(imageId: string, imageName?: string): void
  {
    addTab({
      id: randomId(),
      label: imageName ?? t("actionsCenter.imageTab"),
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
        footer: style.footer
      }}
    >
      <Spotlight.Search
        placeholder={t("actionsCenter.placeholder")}
        leftSection={<IconSearch size={18} style={{ opacity: 0.6 }}/>}
        rightSection={<Kbd size="xs">{t("actionsCenter.keys.esc")}</Kbd>}
      />

      <Spotlight.ActionsList>
        {filteredNavActions.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.jumpTo")}>
            {filteredNavActions.map((navAction) => (
              <Spotlight.Action
                key={navAction.id}
                onClick={navAction.execute}
                leftSection={navAction.icon}
                label={navAction.label}
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

        {filteredRecentImageIds.length > 0 && (
          <Spotlight.ActionsGroup label={t("actionsCenter.sections.recentImages")}>
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
          <Spotlight.Empty>{t("actionsCenter.noResults")}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>

      <Spotlight.Footer className={style.footer}>
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
