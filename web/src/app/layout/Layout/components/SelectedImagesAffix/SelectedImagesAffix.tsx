import React, { ReactElement, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  Affix,
  Button,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Divider,
  Flex,
  HoverCard,
  Select,
  Text,
  Transition
} from "@mantine/core";

import { CommandEntity, Manifest } from "@picteus/ws-client";

import { ImageItemMode, UiCommandType, UiExtensionCommandType } from "types";
import { notifyApiCallError, ROUTES } from "utils";
import { useEventSocket, useImagesSelectedContext } from "app/context";
import { useConfirmAction, useExtensionCommand } from "app/hooks";
import { ExtensionsService, ImageService, StorageService } from "app/services";
import {
  computeIcon,
  ExtensionIcon,
  ImageMasonry,
  ImageMenuSelectCommandEntry,
  ImageMenuSelectEntry
} from "app/components";

import style from "./SelectedImagesAffix.module.scss";


const commandSeparator = "$$";

export default function SelectedImagesAffix() {
  const [t] = useTranslation();
  const location = useLocation();
  const confirmAction = useConfirmAction();
  const imagesContainerRef = useRef<HTMLDivElement>(null);
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const { selectedImages, clearSelectedImages} = useImagesSelectedContext();
  const [extensionsImageCommands, setExtensionsImageCommands] = useState<UiExtensionCommandType[]>(ExtensionsService.getExtensionsCommands([CommandEntity.Images]));
  const callCommand = useExtensionCommand();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>();

  useEffect(() => {
    if (ExtensionsService.requiresCommandReload(event) === true) {
      void ExtensionsService.fetchAll().then(() => {
        setExtensionsImageCommands(ExtensionsService.getExtensionsCommands([CommandEntity.Images]));
      })
    }
  }, [event]);

  useEffect(() => {
    const latestAction = StorageService.getSelectedImagesAffixAction();
    if (latestAction) {
      setSelectedAction(latestAction);
    }
  }, []);

  const synchronizeAction = "synchronize";
  const deleteAction = "delete";

  function computeSelectData() {
    return [
      {
        group: t("commands.coreFeatures"),
        items: [
          {
            value: synchronizeAction,
            label: t("commands.synchronize"),
            subLabel: t("commands.allExtensionsDetails"),
            icon: computeIcon("synchronize")
          },
          {
            value: deleteAction,
            label: t("commands.delete"),
            subLabel: t("commands.noExtensionDetails"),
            icon: computeIcon("delete")
          }
        ]
      },
      {
        group: t("commands.extensionsCommands"),
        items: extensionsImageCommands?.map((extensionCommand) => ({
          value: `${extensionCommand.command.id}${commandSeparator}${extensionCommand.extension.manifest.id}`,
          label: extensionCommand.command.label,
          command: extensionCommand.command,
          manifest: extensionCommand.extension.manifest
        }))
      }
    ];
  }

  type SelectRenderOptionType = ComboboxLikeRenderOptionInput<ComboboxItem & ({ manifest: Manifest, command: UiCommandType } | {
    subLabel: string,
    icon: ReactElement
  })>;

  function computeSelectRenderOption(item: SelectRenderOptionType) {
    return "manifest" in item.option ?  (<ImageMenuSelectCommandEntry manifest={item.option.manifest} command={item.option.command} />): (<ImageMenuSelectEntry icon={item.option.icon} label={item.option.label} subLabel={item.option.subLabel}/>);
  }

  function computeLeftSection() {
    if (selectedAction === undefined) {
      return undefined;
    }
    if (selectedAction === synchronizeAction) {
      return computeIcon("synchronize");
    }
    else if (selectedAction === deleteAction) {
      return computeIcon("delete");
    }
    const [, extensionId] = selectedAction.split(commandSeparator);
    return <ExtensionIcon idOrExtension={extensionId} size="sm" />
  }

  function handleOnApplyAction() {
    StorageService.setSelectedImagesAffixAction(selectedAction);

    const imageIds = selectedImages.map((image) => image.id);

    if (selectedAction === synchronizeAction) {
      imageIds.forEach(imageId => ImageService.synchronize(imageId).catch(notifyApiCallError));
      return;
    }
    else if (selectedAction === deleteAction) {
      confirmAction(() => {
        imageIds.forEach(imageId => ImageService.destroy(imageId).catch(notifyApiCallError));
        clearSelectedImages();
      }, {
        title: t(`commands.confirmImage${imageIds.length > 1 ? "s" : ""}DeleteTitle`),
        message: t(`commands.confirmImage${imageIds.length > 1 ? "s" : ""}DeleteMessage`)
      });
      return;
    }

    const [commandId, extensionId] = selectedAction.split(commandSeparator);

    const command = extensionsImageCommands.find(
      (imageCommand) => imageCommand.command.id === commandId && imageCommand.extension.manifest.id === extensionId
    );
    setIsProcessing(true);
    void callCommand(extensionId, command.command, imageIds, () => {
      setIsProcessing(false);
    }, (wasAborted: boolean) => {
      if (wasAborted === true) {
        setIsProcessing(false);
      }
    });
  }

  function shouldAffixBeVisible() {
    return location.pathname === ROUTES.home && selectedImages?.length >= 1 && isProcessing === false;
  }


  return (
    <Affix className={style.container} classNames={{ root: style.root }}>
      <Transition transition="slide-up" mounted={shouldAffixBeVisible()}>
        {(transitionStyles) => (
          <HoverCard
            withinPortal={false}
            position="top-end"
            shadow="lg"
            withArrow
            closeDelay={200}
            width={400}
          >
            <HoverCard.Target>
              <Button
                className={style.affixButton}
                variant={"gradient"}
                size="lg"
                style={transitionStyles}
                rightSection={<IconPhoto size={23} />}
              >
                {selectedImages?.length}{" "}
                {t("selectedImagesAffix.buttonLabelWithCount", {
                  count: selectedImages?.length,
                })}
              </Button>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <div className={style.affixThumbnailContainer}>
                <Flex align="center" justify="space-between">
                  <Text size="sm" fw={700}>
                    {selectedImages?.length}{" "}
                    {t("selectedImagesAffix.buttonLabelWithCount", {
                      count: selectedImages?.length,
                    })}
                  </Text>
                  <Text
                    onClick={clearSelectedImages}
                    style={{ cursor: "pointer" }}
                    size="xs"
                    c="dimmed"
                    td="underline"
                  >
                    {t("selectedImagesAffix.buttonUnselectAll")}
                  </Text>
                </Flex>
                <Divider mb="sm" />
                <div ref={imagesContainerRef} className={style.affixThumbnailGrid}>
                  <ImageMasonry
                    imageSize={133}
                    images={selectedImages}
                    loadMore={() => {}}
                    containerRef={imagesContainerRef}
                    imageItemMode={ImageItemMode.SELECT}
                  />
                </div>
              </div>
              <Divider mb="md" mt="md" />
              <Flex align="flex-end" gap={5}>
                <Select
                  allowDeselect={false}
                  style={{ flex: 1 }}
                  onChange={(value) => setSelectedAction(value)}
                  value={selectedAction}
                  leftSection={computeLeftSection()}
                  placeholder={t("selectedImagesAffix.selectPlaceholder")}
                  label={t("selectedImagesAffix.selectLabel")}
                  data={computeSelectData()}
                  renderOption={computeSelectRenderOption}
                  maxDropdownHeight={350}
                />
                <Button
                  disabled={!selectedAction}
                  onClick={handleOnApplyAction}
                >
                  {t("button.apply")}
                </Button>
              </Flex>
            </HoverCard.Dropdown>
          </HoverCard>
        )}
      </Transition>
    </Affix>
  );
}
