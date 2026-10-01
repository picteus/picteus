import React, { ReactNode } from "react";
import { Menu, Text } from "@mantine/core";

import { useImageCommand } from "app/hooks";
import { ImageCommandMenuItemPropsType } from "./types.ts";


export default function ImageCommandMenuItem({
  image,
  command,
  viewMode,
  renderUnavailable = false,
  showSubLabel = true,
  leftSection,
  rightSection,
  disabled,
  children,
  onClick,
  ...others
}: ImageCommandMenuItemPropsType): ReactNode
{
  const { command: resolvedCommand, execute, isAvailable } = useImageCommand({ image, command, viewMode });

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

  return (
    <Menu.Item
      onClick={handleClick}
      leftSection={leftSection ?? resolvedCommand.icon("sm")}
      rightSection={rightSection}
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
