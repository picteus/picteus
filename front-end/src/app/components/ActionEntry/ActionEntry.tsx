import React, { ReactElement, ReactNode } from "react";
import { Flex, Menu, Text } from "@mantine/core";
import { IconDownload, IconExternalLink, IconPin, IconRefresh, IconTrash } from "@tabler/icons-react";

import { Manifest } from "@picteus/ws-client";

import { IconSizeType, UiCommandType } from "types";
import { CommandIcon, Common, ExtensionIcon } from "app/components";


export function computeIcon(action: "synchronize" | "pin" | "open" | "download" | "delete", size?: IconSizeType): ReactElement
{
  const edge = typeof size === "number" ? size : Common.IconFromStringToNumberSize(size);
  switch (action)
  {
    case "synchronize":
      return <IconRefresh style={{ width: edge, height: edge }}/>;
    case "pin":
      return <IconPin style={{ width: edge, height: edge }}/>;
    case "open":
      return <IconExternalLink style={{ width: edge, height: edge }}/>;
    case "download":
      return <IconDownload style={{ width: edge, height: edge }}/>;
    case "delete":
      return <IconTrash color="red" style={{ width: edge, height: edge }}/>;
  }
}

type MenuItemEntryType = {
  extensionId?: string;
  icon?: ReactElement;
  label: string;
  subLabel: string;
  keyShortcut?: ReactNode;
  onClick: () => void;
};

export function MenuItemEntry({ extensionId, icon, label, subLabel, keyShortcut, onClick }: MenuItemEntryType)
{
  return (<Menu.Item
    onClick={onClick}
    leftSection={icon ?? <ExtensionIcon idOrExtension={extensionId} size="xs"/>}
    rightSection={keyShortcut}
  >
    <Text size="sm">{label}</Text>
    <Text size="xs" c="dimmed">{subLabel}</Text>
  </Menu.Item>);
}

type ImageMenuSelectEntryType = {
  icon: ReactElement;
  label: string;
  subLabel: string;
};

export function ImageMenuSelectEntry({ icon, label, subLabel }: ImageMenuSelectEntryType)
{
  return (<Flex align="center" gap={10}>
    {icon}
    <Flex direction="column">
      <Text size="sm">{label}</Text>
      <Text size="xs" c="dimmed">
        {subLabel}
      </Text>
    </Flex>
  </Flex>);
}

type ImageMenuSelectCommandEntryType = {
  manifest: Manifest;
  command: UiCommandType;
};

export function ImageMenuSelectCommandEntry({ manifest, command }: ImageMenuSelectCommandEntryType)
{
  return (<ImageMenuSelectEntry icon={<CommandIcon extensionId={manifest.id} command={command} size="xs"/>}
                                label={command.label}
                                subLabel={manifest.name}/>);
}
