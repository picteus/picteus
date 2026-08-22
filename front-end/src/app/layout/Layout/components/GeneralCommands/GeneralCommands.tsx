import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Kbd, Menu } from "@mantine/core";
import { IconPlayerPlayFilled } from "@tabler/icons-react";

import { CommandEntity, ManifestCapabilityId, SearchOriginNature } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { useActionModalContext } from "app/context";
import {
  useExtensionCommandRunner,
  useExtensionCommandsWithCapability,
  useExtensionCommandsWithEntities
} from "app/hooks";
import { CommandIcon, Common, MenuItemEntry, TextToImages } from "app/components";


export default function GeneralCommands()
{
  const [ t ] = useTranslation();
  const [ , addModal ] = useActionModalContext();
  const commandRunner = useExtensionCommandRunner();
  const extensionsProcessCommands = useExtensionCommandsWithEntities([ CommandEntity.Process ]);
  const extensionsWithTextEmbeddingsCapability = useExtensionCommandsWithCapability(ManifestCapabilityId.TextEmbeddings);

  useEffect(() =>
  {
    function handleKeyDown(event: KeyboardEvent)
    {
      if (
        event.shiftKey &&
        event.metaKey &&
        (event.key === "F" || event.key === "f")
      )
      {
        void handleOnClickTextToImage(
          extensionsWithTextEmbeddingsCapability[0].manifest.id
        );
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () =>
    {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ extensionsWithTextEmbeddingsCapability ]);

  async function handleOnClickExtensionCommand(
    extensionId: string,
    command: UiCommandType,
    imageIds?: string[]
  )
  {
    void commandRunner(extensionId, command, imageIds === undefined ? undefined : {
      origin: {
        kind: SearchOriginNature.Images,
        ids: imageIds
      }
    });
  }

  async function handleOnClickTextToImage(extensionId: string)
  {
    addModal({
      component: <TextToImages extensionId={extensionId}/>,
      title: t("textToImagesModal.title"),
      size: "l"
    });
  }

  const menu = useMemo(() =>
  {
    return (
      <>
        <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>

        {extensionsWithTextEmbeddingsCapability?.map((extension, index) =>
        {
          return (<MenuItemEntry key={`${extension.manifest.id}-${index}`} extensionId={extension.manifest.id}
                                 label={t("commands.textToImages")}
                                 subLabel={extension.manifest.name}
                                 keyShortcut={<><Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>F</Kbd></>}
                                 onClick={() => handleOnClickTextToImage(extension.manifest.id)}/>);
        })}
        <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
        {extensionsProcessCommands?.map((extensionCommand) =>
        {
          const extension = extensionCommand.extension;
          const command = extensionCommand.command;
          const manifest = extension.manifest;
          return (
            <MenuItemEntry key={`${manifest.id}-${command.id}`} extensionId={manifest.id}
                           icon={<CommandIcon extensionId={manifest.id} command={command} size="sm"/>}
                           label={command.label}
                           subLabel={manifest.name}
                           onClick={() => handleOnClickExtensionCommand(manifest.id, command)}/>);
        })}
      </>
    );
  }, [ extensionsProcessCommands, extensionsWithTextEmbeddingsCapability ]);

  return (
    <Menu
      withinPortal={true}
      position="left"
      withArrow
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
      <Menu.Dropdown>{menu}</Menu.Dropdown>
    </Menu>
  );
}
