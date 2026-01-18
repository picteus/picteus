import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Kbd, Menu, Text } from "@mantine/core";
import { CommandEntity, ManifestCapabilityId } from "@picteus/ws-client";
import { IconBolt, IconBox, IconSearch } from "@tabler/icons-react";

import { ChannelEnum, UiCommandType } from "types";
import { ExtensionsService } from "app/services";
import { useActionModalContext, useEventSocket } from "app/context";
import { useExtensionCommand } from "app/hooks";
import { TextToImagesModal } from "app/components/ActionModal";

export default function GeneralCommands() {
  const callCommand = useExtensionCommand();
  const [, addModal] = useActionModalContext();
  const eventSocket = useEventSocket();

  const [t] = useTranslation();

  const [extensionsProcessCommands, setExtensionsProcessCommands] = useState(
    ExtensionsService.getExtensionsCommands([CommandEntity.Process]),
  );

  const [
    extensionsWithTextEmbeddingsCapability,
    setExtensionsWithTextEmbeddingsCapability,
  ] = useState(
    ExtensionsService.getExtensionsWithCapability(
      ManifestCapabilityId.TextEmbeddings,
    ),
  );

  useEffect(() => {
    if (eventSocket?.channel === ChannelEnum.EXTENSION_UPDATED || eventSocket?.channel === ChannelEnum.EXTENSION_INSTALLED || eventSocket?.channel === ChannelEnum.EXTENSION_UNINSTALLED || eventSocket?.channel === ChannelEnum.EXTENSION_PAUSED || eventSocket?.channel === ChannelEnum.EXTENSION_RESUMED) {
      void ExtensionsService.fetchAll().then(() => {
        setExtensionsProcessCommands(
          ExtensionsService.getExtensionsCommands([CommandEntity.Process]),
        );
        setExtensionsWithTextEmbeddingsCapability(
          ExtensionsService.getExtensionsWithCapability(
            ManifestCapabilityId.TextEmbeddings,
          ),
        );
      });
    }
  }, [eventSocket]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.shiftKey &&
        event.metaKey &&
        (event.key === "F" || event.key === "f")
      ) {
        void handleOnClickTextToImage(
          extensionsWithTextEmbeddingsCapability[0].manifest.id,
        );
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [extensionsWithTextEmbeddingsCapability]);

  async function handleOnClickExtensionCommand(
    extensionId: string,
    command: UiCommandType,
    imageIds?: string[],
  ) {
    void callCommand(extensionId, command, imageIds);
  }

  async function handleOnClickTextToImage(extensionId: string) {
    addModal({
      component: <TextToImagesModal extensionId={extensionId} />,
      title: t("textToImagesModal.title"),
    });
  }

  const menu = useMemo(() => {
    return (
      <>
        <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>

        {extensionsWithTextEmbeddingsCapability?.map((extension, index) => {
          return (
            <Menu.Item
              key={
                "textEmbeddingCapabilityItem-" +
                extension.manifest.id +
                "-" +
                index
              }
              onClick={() => handleOnClickTextToImage(extension.manifest.id)}
              leftSection={<IconSearch style={{ width: 14, height: 14 }} />}
              rightSection={
                index === 0 && (
                  <>
                    <Kbd>⌘</Kbd> + <Kbd>Shift</Kbd> + <Kbd>F</Kbd>
                  </>
                )
              }
            >
              <Text size="sm"> {t("commands.textToImages")}</Text>
              <Text size="xs" c="dimmed">
                {extension.manifest.name}
              </Text>
            </Menu.Item>
          );
        })}
        <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
        {extensionsProcessCommands?.map((extensionCommand, index) => {
          return (
            <Menu.Item
              key={
                "extensionsProcessCommands-" +
                extensionCommand.extension.manifest.id +
                "-" +
                index
              }
              onClick={() =>
                handleOnClickExtensionCommand(
                  extensionCommand.extension.manifest.id,
                  extensionCommand.command,
                )
              }
              leftSection={<IconBolt style={{ width: 14, height: 14 }} />}
            >
              <Text size="sm"> {extensionCommand.command.label}</Text>
              <Text size="xs" c="dimmed">
                {extensionCommand.extension.manifest.name}
              </Text>
            </Menu.Item>
          );
        })}
      </>
    );
  }, [extensionsProcessCommands, extensionsWithTextEmbeddingsCapability]);

  return (
    <Menu
      withinPortal={false}
      position="left-start"
      offset={12}
      withArrow
      trigger="hover"
      openDelay={80}
      closeDelay={200}
      shadow="md"
      width={350}
    >
      <Menu.Target>
        <ActionIcon size="md">
          <IconBox stroke={1.2} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>{menu}</Menu.Dropdown>
    </Menu>
  );
}
