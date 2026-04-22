import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Kbd, Menu, Text } from "@mantine/core";
import { IconBox } from "@tabler/icons-react";

import { CommandEntity, ManifestCapabilityId } from "@picteus/ws-client";

import { UiCommandType } from "types";
import { useActionModalContext, useEventSocket } from "app/context";
import { useExtensionCommand } from "app/hooks";
import { ExtensionsService } from "app/services";
import { ExtensionIcon, TextToImages } from "app/components";


export default function GeneralCommands() {
  const callCommand = useExtensionCommand();
  const [, addModal] = useActionModalContext();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);

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
    if (ExtensionsService.requiresCommandReload(event) === true) {
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
  }, [event]);

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
      component: <TextToImages extensionId={extensionId} />,
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
              leftSection={<ExtensionIcon idOrExtension={extension} size="sm" />}
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
          const extension = extensionCommand.extension;
          const command = extensionCommand.command;
          const manifest = extension.manifest;
          return (
            <Menu.Item
              key={`command-${manifest.id}-${index}`}
              onClick={() =>
                handleOnClickExtensionCommand(manifest.id, command,)
              }
              leftSection={<ExtensionIcon idOrExtension={extension} size="sm" />}
            >
              <Text size="sm"> {extensionCommand.command.label}</Text>
              <Text size="xs" c="dimmed">
                {manifest.name}
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
      trapFocus={false}
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
