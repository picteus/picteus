import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu } from "@mantine/core";
import { IconTopologyRing3 } from "@tabler/icons-react";

import {
  CommandEntity,
  ExtensionImageTag,
  Image,
  ImageSummary,
  ManifestCapabilityId,
  SearchOriginNature
} from "@picteus/ws-client";

import { ViewMode } from "types";
import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import {
  useConfirmAction,
  useExtensionCommandRunner,
  useExtensionCommandsWithCapability,
  useExtensionCommandsWithEntities
} from "app/hooks";
import { ImageService } from "app/services";
import { CommandIcon, Common, computeIcon, MenuItemEntry } from "app/components";
import { ClosestEmbeddingsImages } from "./components";


const commandEntities = [ CommandEntity.Images, CommandEntity.Image ];

type ImageItemMenuType = {
  image: ImageSummary;
  viewMode: ViewMode;
};

export default function ImageItemMenu({ image, viewMode }: ImageItemMenuType)
{
  const [ t ] = useTranslation();
  const [ , addModal ] = useActionModalContext();
  const confirmAction = useConfirmAction();
  const [ imageTags, setImageTags ] = useState<ExtensionImageTag[]>([]);
  const extensionsImageCommands = useExtensionCommandsWithEntities(commandEntities);
  const extensionsWithImageEmbeddingsCapability = useExtensionCommandsWithCapability(ManifestCapabilityId.ImageEmbeddings);
  const commandRunner = useExtensionCommandRunner();

  async function load()
  {
    const tags = "tags" in image ? (image as Image).tags : await ImageService.getAllTags(image.id);
    setImageTags(tags);
  }

  useEffect(() =>
  {
    void load();
  }, []);


  function handleOnClickClosestImages()
  {
    addModal({
      component: (
        <ClosestEmbeddingsImages
          image={image}
          viewMode={viewMode}
        />
      ),
      isStackable: true,
      title: t("closestEmbeddingsImagesModal.title"),
      size: "l"
    });
  }

  function handleOnClickSynchronize()
  {
    ImageService.synchronize(image.id).catch(ToastService.apiCallError);
  }

  function handleOnClickDelete()
  {
    confirmAction(() => ImageService.destroy(image.id).catch(ToastService.apiCallError), {
      title: t("commands.confirmImageDeleteTitle"),
      message: t("commands.confirmImageDeleteMessage")
    });
  }

  const menu = useMemo(() =>
  {

    function renderCoreFeatures()
    {
      return (
        <>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          {extensionsWithImageEmbeddingsCapability && (<MenuItemEntry
            onClick={() => handleOnClickClosestImages()}
            icon={<IconTopologyRing3 style={{ width: Common.IconSmallSize, height: Common.IconSmallSize }}/>}
            label={t("commands.closestImages")}
            subLabel={t("commands.allExtensionsDetails")}
          />)}
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

    function renderExtensionsCommands()
    {
      return (
        <>
          <Menu.Label>{t("commands.extensionsCommands")}</Menu.Label>
          {extensionsImageCommands
            ?.filter((extensionCommand) =>
            {
              const { withTags } = extensionCommand.command;

              if (withTags?.length)
              {
                return withTags.some((tag) =>
                  imageTags.some((imageTag) => imageTag.value === tag)
                );
              }
              return true;
            })
            .map((extensionCommand) =>
            {
              const manifest = extensionCommand.extension.manifest;
              return (<MenuItemEntry
                key={`${extensionCommand.extension.manifest.id}-${extensionCommand.command.id}`}
                onClick={() => commandRunner(manifest.id, extensionCommand.command, {
                  origin: {
                    kind: SearchOriginNature.Images,
                    ids: [ image.id ]
                  }
                })}
                extensionId={manifest.id}
                icon={<CommandIcon extensionId={manifest.id} command={extensionCommand.command} size="sm"/>}
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
  }, [ image, imageTags, extensionsImageCommands, extensionsWithImageEmbeddingsCapability ]);

  return (
    <>
      <Menu.Dropdown style={{ maxHeight: 400, overflowY: "auto" }}>
        {menu}
      </Menu.Dropdown>
    </>
  );
}
