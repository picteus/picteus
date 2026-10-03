import React, { ReactElement } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useProcessCommands } from "app/hooks";
import { Common, ProcessCommand } from "app/components";


export default function GeneralCommands(): ReactElement
{
  const [ t ] = useTranslation();
  const { coreCommands, extensionCommands } = useProcessCommands({ registerShortcuts: true });
  const hasCommands = coreCommands.length > 0 || extensionCommands.length > 0;

  return (
    <Menu
      withinPortal={true}
      withArrow={true}
      arrowSize={Common.ArrowSize}
      offset={Common.RightSideBarOffset}
      trigger="hover"
      trapFocus={false}
      openDelay={80}
      closeDelay={Common.HoverCloseDelayInMilliseconds}
      shadow="md"
      width={350}
    >
      <Menu.Target>
        <ActionIcon size="md">
          <IconPlayerPlayFilled stroke={Common.IconStrokeSize}/>
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {coreCommands.length > 0 && (
          <>
            <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
            {coreCommands.map((command) =>
            {
              return (
                <ProcessCommand.MenuItem
                  key={command.id}
                  command={command}
                />
              );
            })}
          </>
        )}
        {extensionCommands.length > 0 && (
          <>
            <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
            {extensionCommands.map((command) =>
            {
              return (
                <ProcessCommand.MenuItem
                  key={command.id}
                  command={command}
                />
              );
            })}
          </>
        )}
        {!hasCommands && (
          <Menu.Item disabled>
            {t("commands.noCommandsAvailable")}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
