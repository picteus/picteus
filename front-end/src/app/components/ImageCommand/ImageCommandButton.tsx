import React, { ReactNode } from "react";
import { Button, Tooltip } from "@mantine/core";

import { useImageCommand } from "app/hooks";
import { ImageCommandButtonPropsType } from "./types.ts";


export default function ImageCommandButton({
  image,
  command,
  viewMode,
  renderUnavailable = false,
  iconOnly = false,
  withTooltip,
  loading,
  disabled,
  leftSection,
  children,
  size,
  px,
  onClick,
  ...others
}: ImageCommandButtonPropsType): ReactNode
{
  const { command: resolvedCommand, execute, isLoading, isAvailable } = useImageCommand({ image, command, viewMode });

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

  if (iconOnly)
  {
    const buttonElement = (
      <Button
        onClick={handleClick}
        loading={loading ?? isLoading}
        disabled={disabled ?? !isAvailable}
        size={size}
        px={px ?? "xs"}
        aria-label={resolvedCommand.label}
        {...others}
      >
        {resolvedCommand.icon(iconDimension)}
      </Button>
    );

    if (withTooltip === false)
    {
      return buttonElement;
    }

    return (
      <Tooltip label={resolvedCommand.label} withArrow position="bottom">
        {buttonElement}
      </Tooltip>
    );
  }

  const buttonElement = (
    <Button
      onClick={handleClick}
      loading={loading ?? isLoading}
      disabled={disabled ?? !isAvailable}
      leftSection={leftSection ?? resolvedCommand.icon(iconDimension)}
      size={size}
      px={px}
      {...others}
    >
      {children ?? resolvedCommand.label}
    </Button>
  );

  if (withTooltip === false)
  {
    return buttonElement;
  }

  return (
    <Tooltip label={resolvedCommand.subLabel ?? resolvedCommand.label} withArrow position="bottom">
      {buttonElement}
    </Tooltip>
  );
}
