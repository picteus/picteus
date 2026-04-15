import React, { ReactElement, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Text } from "@mantine/core";
import { IconRefresh, IconTopologyRing3, IconTrash } from "@tabler/icons-react";

import {
  CommandEntity,
  Extension,
  ExtensionImageTag,
  Image,
  ImageSummary,
  ManifestCapabilityId
} from "@picteus/ws-client";

import { UiExtensionCommandType } from "types";
import { notifyApiCallError } from "utils";
import { useActionModalContext, useConfirmAction, useEventSocket } from "app/context";
import { useExtensionCommand } from "app/hooks";
import { ExtensionsService, ImageService } from "app/services";
import { Common, ExtensionIcon } from "app/components";
import { ClosestEmbeddingsImagesModal } from "./components";


const commandEntities = [CommandEntity.Images, CommandEntity.Image];


type ImageItemMenuEntryType = {
  extensionId?: string;
  icon?: ReactElement;
  label: string;
  subLabel: string;
  onClick: () => void;
};

function ImageItemMenuEntry({extensionId, icon, label, subLabel, onClick} : ImageItemMenuEntryType)  {
  return (
    <Menu.Item
      onClick={onClick}
      leftSection={icon ?? <ExtensionIcon id={extensionId} size="sm" />}
    >
      <Text size="sm">{label}</Text>
      <Text size="xs" c="dimmed">{subLabel}</Text>
    </Menu.Item>
  );
}

type ImageItemMenuType = {
  image: ImageSummary;
};

export default function ImageItemMenu({ image }: ImageItemMenuType) {
  const [, addModal] = useActionModalContext();
  const confirmAction = useConfirmAction();
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
          imageId={image.id}
          extensionId={extensionId}
        />
      ),
      title: t("closestEmbeddingsImagesModal.title"),
      size: "l",
    });
  }

  function handleOnClickSynchronize() {
    ImageService.synchronize(image.id).catch(notifyApiCallError)
  }

  function handleOnClickDelete() {
    confirmAction(() => ImageService.destroy(image.id).catch(notifyApiCallError), {
      title: t("commands.confirmDeleteTitle"),
      message: t("commands.confirmDeleteMessage")
    });

  }

  const menu = useMemo(() => {
    function renderCoreFeatures() {
      return (
        <>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          {extensionsWithImageEmbeddingsCapability?.map((extension, index) => (<ImageItemMenuEntry
            key={`embeddingCapability-${extension.manifest.id}-${index}`}
            onClick={() =>
              handleOnClickClosestImages(extension.manifest.id)
            }
            extensionId={extension.manifest.id}
            icon={<IconTopologyRing3 style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }} />}
            label={t("commands.closestImages")}
            subLabel={extension.manifest.name}
          />))}
          <ImageItemMenuEntry
            key={"synchronize"}
            onClick={handleOnClickSynchronize}
            icon={<IconRefresh style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }} />}
            label={t("commands.synchronize")}
            subLabel={t("commands.allExtensionsDetails")}
          />
          <ImageItemMenuEntry
            key={"delete"}
            onClick={handleOnClickDelete}
            icon={<IconTrash style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }} />}
            label={t("commands.delete")}
            subLabel={t("commands.allExtensionsDetails")}
          />
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
              return (<ImageItemMenuEntry
                key={`command-${extensionCommand.extension.manifest.id}-${index}`}
                onClick={() => callCommand(manifest.id, extensionCommand.command, [image.id])}
                extensionId={manifest.id}
                label={extensionCommand.command.label}
                subLabel={extensionCommand.extension.manifest.name}
              />);
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
