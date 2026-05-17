import React, { ReactElement, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Box,
  Button,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Divider,
  Flex,
  Select,
  Stack,
  Text
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconPhotoOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { CommandEntity, Manifest } from "@picteus/ws-client";

import { ImageItemMode, UiCommandType, UiExtensionCommandType } from "types";
import { NotificationsService } from "utils";
import { useEventSocket, useImagesSelectedContext } from "app/context";
import { useConfirmAction, useExtensionCommand } from "app/hooks";
import { ExtensionsService, ImageService, StorageService } from "app/services";
import {
  computeIcon,
  EmptyResults,
  ExtensionIcon,
  ImageMasonry,
  ImageMenuSelectCommandEntry,
  ImageMenuSelectEntry
} from "app/components";

import style from "./SelectedImages.module.scss";


const commandSeparator = "$$";

type SelectedImagesType = {
  onProcessing: (value: boolean) => void;
};

export default function SelectedImages({ onProcessing }: SelectedImagesType) {
  const [t] = useTranslation();
  const confirmAction = useConfirmAction();
  const imagesContainerRef = useRef<HTMLDivElement>(null);
  const { ref: containerRef, height: containerHeight } = useElementSize();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);
  const { selectedImages, clearSelectedImages} = useImagesSelectedContext();
  const [extensionsImageCommands, setExtensionsImageCommands] = useState<UiExtensionCommandType[]>(ExtensionsService.getExtensionsCommands([CommandEntity.Images]));
  const callCommand = useExtensionCommand();
  const [selectedAction, setSelectedAction] = useState<string>();

  useEffect(() => {
    if (ExtensionsService.requiresCommandReload(event) === true) {
      void ExtensionsService.fetchAll().then(() => {
        setExtensionsImageCommands(ExtensionsService.getExtensionsCommands([CommandEntity.Images]));
      })
    }
  }, [event]);

  useEffect(() => {
    const latestAction = StorageService.getSelectedImagesAction();
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

  function computeSelectRenderOption(item: ComboboxLikeRenderOptionInput<ComboboxItem & ({ manifest: Manifest, command: UiCommandType } | {
    subLabel: string,
    icon: ReactElement
  })>) {
    return "manifest" in item.option ?  (<ImageMenuSelectCommandEntry manifest={item.option.manifest} command={item.option.command} />): (<ImageMenuSelectEntry icon={item.option.icon} label={item.option.label} subLabel={item.option.subLabel}/>);
  }

  function computeLeftSection() {
    if (selectedAction == null) {
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
    StorageService.setSelectedImagesAction(selectedAction);

    const imageIds = selectedImages.map((image) => image.id);

    if (selectedAction === synchronizeAction) {
      imageIds.forEach(imageId => ImageService.synchronize(imageId).catch(NotificationsService.apiCallError));
      return;
    }
    else if (selectedAction === deleteAction) {
      confirmAction(() => {
        imageIds.forEach(imageId => ImageService.destroy(imageId).catch(NotificationsService.apiCallError));
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
    onProcessing(true);
    void callCommand(extensionId, command.command, imageIds, () => {
      onProcessing(false);
    }, (wasAborted: boolean) => {
      if (wasAborted === true) {
        onProcessing(false);
      }
    });
  }

  return (<Stack ref={containerRef} align="stretch" justify="space-between" gap={10} className={style.container}>
      <Box ref={imagesContainerRef} flex={1} className={style.images}>
        {selectedImages.length === 0 ? (
          <EmptyResults
            icon={IconPhotoOff}
            isSmall={true}
            title={t("emptySelectedImages.title")}
            description={t("emptySelectedImages.description")}
          />
        ) : (
          <ImageMasonry
            imageSize={100}
            images={selectedImages}
            loadMore={() => {
            }}
            containerRef={imagesContainerRef}
            imageItemMode={ImageItemMode.SELECT}
          />
        )}
      </Box>
      <Stack gap={5} >
        <Divider />
        <Flex align="center" justify="space-between">
          <Text size="sm" fw={700}>
            {selectedImages?.length > 0 ? t("selectedImages.buttonLabelWithCount", { count: selectedImages?.length }) : " "}
          </Text>
          {selectedImages.length > 0 &&
            <Text
              onClick={clearSelectedImages}
              style={{ cursor: "pointer" }}
              size="xs"
              c="dimmed"
              td="underline"
            >
              {t("selectedImages.buttonUnselectAll")}
            </Text>}
        </Flex>
        <Flex align="flex-end" gap={5}>
          <Select
            allowDeselect={false}
            style={{ flex: 1 }}
            onChange={(value) => setSelectedAction(value)}
            value={selectedAction}
            leftSection={computeLeftSection()}
            placeholder={t("selectedImages.selectPlaceholder")}
            label={t("selectedImages.selectLabel")}
            data={computeSelectData()}
            renderOption={computeSelectRenderOption}
            maxDropdownHeight={containerHeight - 50}
            comboboxProps={{ withinPortal: false, position: "top" }}
          />
          <Button
            disabled={!selectedAction || selectedImages.length === 0}
            onClick={handleOnApplyAction}
          >
            {t("button.apply")}
          </Button>
        </Flex>
      </Stack>
    </Stack>
  );
}
