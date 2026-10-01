import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ViewMode } from "types";
import { useImageCommands } from "app/hooks";
import { ImageCommand } from "app/components";


type ImageItemMenuPropsType = {
  image: ImageSummary;
  viewMode: ViewMode;
};

export default function ImageItemMenu({ image, viewMode }: ImageItemMenuPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { coreCommands, extensionCommands } = useImageCommands({ image, viewMode });

  function handleClick(event: React.MouseEvent<HTMLDivElement>): void
  {
    event.stopPropagation();
  }

  return (
    <Menu.Dropdown
      style={{ maxHeight: 400, overflowY: "auto" }}
      onClick={handleClick}
    >
      {coreCommands.length > 0 && (
        <>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          {coreCommands.map((command) =>
          {
            return (
              <ImageCommand.MenuItem
                key={command.id}
                image={image}
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
              <ImageCommand.MenuItem
                key={command.id}
                image={image}
                command={command}
              />
            );
          })}
        </>
      )}
    </Menu.Dropdown>
  );
}
