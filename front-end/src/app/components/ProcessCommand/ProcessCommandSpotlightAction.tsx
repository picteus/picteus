import React, { ReactElement } from "react";
import { Spotlight } from "@mantine/spotlight";

import { useProcessCommand } from "app/hooks";
import { ProcessCommandSpotlightActionPropsType } from "./types.ts";


export default function ProcessCommandSpotlightAction({
  command,
  disabled,
  children,
  onClick,
  ...others
}: ProcessCommandSpotlightActionPropsType): ReactElement | null
{
  const { command: resolvedCommand, execute, isAvailable } = useProcessCommand({ command });

  if (!resolvedCommand || !isAvailable)
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
    <Spotlight.Action
      onClick={handleClick}
      leftSection={resolvedCommand.icon("sm")}
      rightSection={resolvedCommand.shortcut?.label}
      disabled={disabled ?? !isAvailable}
      label={resolvedCommand.label}
      description={resolvedCommand.subLabel}
      keywords={[ resolvedCommand.label, resolvedCommand.subLabel ?? "" ]}
      {...others}
    >
      {children}
    </Spotlight.Action>
  );
}
