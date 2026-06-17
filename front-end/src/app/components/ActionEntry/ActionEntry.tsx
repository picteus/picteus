import React, { ReactElement, ReactNode } from "react";
import { Flex, Menu, Text } from "@mantine/core";
import { IconRefresh, IconTrash } from "@tabler/icons-react";

import { Manifest } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { Common, ExtensionIcon } from "app/components";


export function computeIcon(action: "synchronize" | "delete"): ReactElement
{
  switch (action)
  {
    case "synchronize":
      return <IconRefresh style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }}/>;
    case "delete":
      return <IconTrash color="red" style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }}/>;
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
    leftSection={icon ?? <ExtensionIcon idOrExtension={extensionId} size="sm"/>}
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
  return (<ImageMenuSelectEntry icon={<ExtensionIcon idOrExtension={manifest.id} size="sm"/>} label={command.label}
                                subLabel={manifest.name}/>);
}
