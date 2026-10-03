import React, { ReactElement } from "react";
import { ActionIcon, Tooltip } from "@mantine/core";

import { useProcessCommand } from "app/hooks";
import { ProcessCommandActionIconPropsType } from "./types.ts";


export default function ProcessCommandActionIcon({
  command,
  renderUnavailable = false,
  withTooltip = true,
  loading,
  disabled,
  children,
  size,
  onClick,
  ...others
}: ProcessCommandActionIconPropsType): ReactElement | null
{
  const { command: resolvedCommand, execute, isLoading, isAvailable } = useProcessCommand({ command });

  if (!resolvedCommand || (!isAvailable && !renderUnavailable))
  {
    return null;
  }

  function handleClick(event: React.MouseEvent<HTMLButtonElement>): void
  {
    if (onClick)
    {
      onClick(event);
    }
    if (!event.defaultPrevented)
    {
      void execute();
    }
  }

  const iconDimension = size === "lg" || size === "xl" ? "md" : "sm";

  const actionIconElement = (
    <ActionIcon
      onClick={handleClick}
      loading={loading ?? isLoading}
      disabled={disabled ?? !isAvailable}
      size={size}
      {...others}
    >
      {children ?? resolvedCommand.icon(iconDimension)}
    </ActionIcon>
  );

  if (withTooltip === false)
  {
    return actionIconElement;
  }

  return (
    <Tooltip label={resolvedCommand.label} withArrow position="bottom">
      {actionIconElement}
    </Tooltip>
  );
}
