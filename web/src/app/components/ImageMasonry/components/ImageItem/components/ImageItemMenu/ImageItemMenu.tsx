import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Text } from "@mantine/core";
import { IconBolt, IconRefresh, IconTopologyRing3 } from "@tabler/icons-react";
import { CommandEntity, ExtensionImageTag, ImageSummary, ManifestCapabilityId } from "@picteus/ws-client";

import { ClosestEmbeddingsImagesModal } from "app/components/ActionModal";
import { ExtensionsService, ImageService } from "app/services";
import { useExtensionCommand } from "app/hooks";
import { useActionModalContext } from "app/context";

type ImageItemMenu = {
  imageSummary: ImageSummary;
};

export default function ImageItemMenu({ imageSummary }: ImageItemMenu) {
  const [, addModal] = useActionModalContext();
  const [imageTags, setImageTags] = useState<ExtensionImageTag[]>([]);
  const callCommand = useExtensionCommand();
  const [t] = useTranslation();

  async function load() {
    const tags = await ImageService.getAllTags(imageSummary.id);
    setImageTags(tags);
  }

  useEffect(() => {
    void load();
  }, []);

  function handleOnClickClosestImages(extensionId: string) {
    addModal({
      component: (
        <ClosestEmbeddingsImagesModal
          key={"ClosestEmbeddingsImagesModal" + imageSummary.id}
          imageId={imageSummary.id}
          extensionId={extensionId}
        />
      ),
      title: t("closestEmbeddingsImagesModal.title"),
    });
  }

  async function handleOnClickSynchronize() {
    await ImageService.synchronize(imageSummary.id)
  }

  const menu = useMemo(() => {
    const extensionsWithImageEmbeddingsCapability =
      ExtensionsService.getExtensionsWithCapability(
        ManifestCapabilityId.ImageEmbeddings,
      );

    const extensionsImageCommands = ExtensionsService.getExtensionsCommands([
      CommandEntity.Images,
      CommandEntity.Image,
    ]);

    function renderCoreFeatures() {
      return (
        <>
          <Menu.Label>{t("commands.coreFeatures")}</Menu.Label>
          {extensionsWithImageEmbeddingsCapability?.map((extension, index) => {
            return (
              <Menu.Item
                key={
                  "embeddingCapabilityItem-" +
                  extension.manifest.id +
                  "-" +
                  index
                }
                onClick={() =>
                  handleOnClickClosestImages(extension.manifest.id)
                }
                leftSection={
                  <IconTopologyRing3 style={{ width: 14, height: 14 }} />
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
              <IconRefresh style={{ width: 14, height: 14 }} />
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
              return (
                <Menu.Item
                  key={
                    "extensionImageCommands-" +
                    extensionCommand.extension.manifest.id +
                    "-" +
                    index
                  }
                  onClick={() =>
                    callCommand(
                      extensionCommand.extension.manifest.id,
                      extensionCommand.command,
                      [imageSummary.id],
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
    }

    return (
      <>
        {extensionsWithImageEmbeddingsCapability && renderCoreFeatures()}
        {extensionsImageCommands && renderExtensionsCommands()}
      </>
    );
  }, [imageSummary, imageTags]);

  return (
    <>
      <Menu.Dropdown style={{ maxHeight: 400, overflowY: "auto" }}>
        {menu}
      </Menu.Dropdown>
    </>
  );
}
