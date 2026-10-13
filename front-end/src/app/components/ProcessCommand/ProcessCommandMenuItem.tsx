import React, { ReactElement } from "react";
import { Menu, Text } from "@mantine/core";

import { useProcessCommand } from "app/hooks";
import { ShortcutBadge } from "app/components";
import { ProcessCommandMenuItemPropsType } from "./types.ts";


export default function ProcessCommandMenuItem({
  command,
  renderUnavailable = false,
  showSubLabel = true,
  leftSection,
  rightSection,
  disabled,
  children,
  onClick,
  ...others
}: ProcessCommandMenuItemPropsType): ReactElement | null
{
  const { command: resolvedCommand, execute, isAvailable } = useProcessCommand({ command });

  if (!resolvedCommand || (!isAvailable && !renderUnavailable))
  {
    return null;
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>): void
  {
    event.stopPropagation();
    if (onClick)
    {
      onClick(event);
    }
    if (!event.defaultPrevented)
    {
      void execute();
    }
  }

  const shortcutDisplay = resolvedCommand.shortcut?.label ?? (resolvedCommand.shortcut?.combo ? (
    <ShortcutBadge combo={resolvedCommand.shortcut.combo} size="xs"/>
  ) : undefined);

  return (
    <Menu.Item
      onClick={handleClick}
      leftSection={leftSection ?? resolvedCommand.icon("sm")}
      rightSection={rightSection ?? shortcutDisplay}
      disabled={disabled ?? !isAvailable}
      {...others}
    >
      <Text size="sm">{children ?? resolvedCommand.label}</Text>
      {showSubLabel && resolvedCommand.subLabel && (
        <Text size="xs" c="dimmed">
          {resolvedCommand.subLabel}
        </Text>
      )}
    </Menu.Item>
  );
}
