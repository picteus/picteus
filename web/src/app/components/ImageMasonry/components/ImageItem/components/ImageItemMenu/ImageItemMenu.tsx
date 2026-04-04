import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Text } from "@mantine/core";
import { IconRefresh, IconTopologyRing3 } from "@tabler/icons-react";
import {
  CommandEntity,
  Extension,
  ExtensionImageTag,
  Image,
  ImageSummary,
  ManifestCapabilityId
} from "@picteus/ws-client";

import { UiExtensionCommandType } from "types";
import { Common, ExtensionIcon } from "app/components";
import { ClosestEmbeddingsImagesModal } from "app/components/ActionModal";
import { ExtensionsService, ImageService } from "app/services";
import { useExtensionCommand } from "app/hooks";
import { useActionModalContext, useEventSocket } from "app/context";

type ImageItemMenu = {
  image: ImageSummary;
};

const commandEntities = [
  CommandEntity.Images,
  CommandEntity.Image,
];

export default function ImageItemMenu({ image }: ImageItemMenu) {
  const [, addModal] = useActionModalContext();
  const [imageTags, setImageTags] = useState<ExtensionImageTag[]>([]);
  const [extensionsImageCommands, setExtensionsImageCommands] = useState<UiExtensionCommandType[]>(ExtensionsService.getExtensionsCommands(commandEntities));
  const [extensionsWithImageEmbeddingsCapability, setExtensionsWithImageEmbeddingsCapability] = useState<Extension[]>(ExtensionsService.getExtensionsWithCapability(
    ManifestCapabilityId.ImageEmbeddings));
  const callCommand = useExtensionCommand();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [t] = useTranslation();

  async function load() {
    const tags = "tags" in image ? (image as Image).tags : await ImageService.getAllTags(image.id);
    setImageTags(tags);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (ExtensionsService.requiresCommandReload(event) === true) {
      void ExtensionsService.fetchAll().then(() => {
        setExtensionsImageCommands(ExtensionsService.getExtensionsCommands(commandEntities));
        setExtensionsWithImageEmbeddingsCapability(ExtensionsService.getExtensionsWithCapability(
          ManifestCapabilityId.ImageEmbeddings));
      })
    }
  }, [event]);

  function handleOnClickClosestImages(extensionId: string) {
    addModal({
      component: (
        <ClosestEmbeddingsImagesModal
          key={"ClosestEmbeddingsImagesModal" + image.id}
          imageId={image.id}
          extensionId={extensionId}
        />
      ),
      title: t("closestEmbeddingsImagesModal.title"),
    });
  }

  async function handleOnClickSynchronize() {
    await ImageService.synchronize(image.id)
  }

  const menu = useMemo(() => {
    function renderCoreFeatures() {
      return (
        <>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          {extensionsWithImageEmbeddingsCapability?.map((extension, index) => {
            return (
              <Menu.Item
                key={`embeddingCapability-${extension.manifest.id}-${index}`}
                onClick={() =>
                  handleOnClickClosestImages(extension.manifest.id)
                }
                leftSection={
                  <IconTopologyRing3 style={{ width: "sm", height: Common.IconSmallSize }} />
                }
              >
                <Text size="sm"> {t("commands.closestImages")}</Text>
                <Text size="xs" c="dimmed">
                  {extension.manifest.name}
                </Text>
              </Menu.Item>
            );
          })}
          <Menu.Item
            key={"synchronize"}
            onClick={() =>
              handleOnClickSynchronize()
            }
            leftSection={
              <IconRefresh style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }} />
            }
          >
            <Text size="sm"> {t("commands.synchronize")}</Text>
            <Text size="xs" c="dimmed">{t("commands.synchronizeDetails")}</Text>
          </Menu.Item>
        </>
      );
    }
    function renderExtensionsCommands() {
      return (
        <>
          <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
          {extensionsImageCommands
            ?.filter((extensionCommand) => {
              const { withTags } = extensionCommand.command;

              if (withTags?.length) {
                return withTags.some((tag) =>
                  imageTags.some((imageTag) => imageTag.value === tag),
                );
              }
              return true;
            })
            .map((extensionCommand, index) => {
              const manifest = extensionCommand.extension.manifest;
              return (
                <Menu.Item
                  key={`command-${extensionCommand.extension.manifest.id}-${index}`}
                  onClick={() =>
                    callCommand(
                      manifest.id,
                      extensionCommand.command,
                      [image.id],
                    )
                  }
                  leftSection={<ExtensionIcon id={extensionCommand.extension.manifest.id} size="sm" />}
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
    }

    return (
      <>
        {extensionsWithImageEmbeddingsCapability && renderCoreFeatures()}
        {extensionsImageCommands && renderExtensionsCommands()}
      </>
    );
  }, [image, imageTags, extensionsImageCommands, extensionsWithImageEmbeddingsCapability]);

  return (
    <>
      <Menu.Dropdown style={{ maxHeight: 400, overflowY: "auto" }}>
        {menu}
      </Menu.Dropdown>
    </>
  );
}
