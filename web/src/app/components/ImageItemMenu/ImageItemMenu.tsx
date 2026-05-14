import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";
import { IconTopologyRing3 } from "@tabler/icons-react";

import {
  CommandEntity,
  Extension,
  ExtensionImageTag,
  Image,
  ImageSummary,
  ManifestCapabilityId
} from "@picteus/ws-client";

import { UiExtensionCommandType, ViewMode } from "types";
import { notifyApiCallError } from "utils";
import { useActionModalContext, useEventSocket } from "app/context";
import { useConfirmAction, useExtensionCommand } from "app/hooks";
import { ExtensionsService, ImageService } from "app/services";
import { Common, computeIcon, MenuItemEntry } from "app/components";
import { ClosestEmbeddingsImages } from "./components";


const commandEntities = [CommandEntity.Images, CommandEntity.Image];

type ImageItemMenuType = {
  image: ImageSummary;
  viewMode: ViewMode;
};

export default function ImageItemMenu({ image, viewMode }: ImageItemMenuType) {
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
        <ClosestEmbeddingsImages
          image={image}
          extensionId={extensionId}
          viewMode={viewMode}
        />
      ),
      isStackable: true,
      title: t("closestEmbeddingsImagesModal.title"),
      size: "l",
    });
  }

  function handleOnClickSynchronize() {
    ImageService.synchronize(image.id).catch(notifyApiCallError)
  }

  function handleOnClickDelete() {
    confirmAction(() => ImageService.destroy(image.id).catch(notifyApiCallError), {
      title: t("commands.confirmImageDeleteTitle"),
      message: t("commands.confirmImageDeleteMessage")
    });

  }

  const menu = useMemo(() => {

    function renderCoreFeatures() {
      return (
        <>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          {extensionsWithImageEmbeddingsCapability?.map((extension, index) => (<MenuItemEntry
            key={`embeddingCapability-${extension.manifest.id}-${index}`}
            onClick={() =>
              handleOnClickClosestImages(extension.manifest.id)
            }
            extensionId={extension.manifest.id}
            icon={<IconTopologyRing3 style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }} />}
            label={t("commands.closestImages")}
            subLabel={extension.manifest.name}
          />))}
          <MenuItemEntry
            key={"synchronize"}
            onClick={handleOnClickSynchronize}
            icon={computeIcon("synchronize")}
            label={t("commands.synchronize")}
            subLabel={t("commands.allExtensionsDetails")}
          />
          <MenuItemEntry
            key={"delete"}
            onClick={handleOnClickDelete}
            icon={computeIcon("delete")}
            label={t("commands.delete")}
            subLabel={t("commands.noExtensionDetails")}
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
            .map((extensionCommand) => {
              const manifest = extensionCommand.extension.manifest;
              return (<MenuItemEntry
                key={`${extensionCommand.extension.manifest.id}-${extensionCommand.command.id}`}
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
