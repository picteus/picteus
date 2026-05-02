import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

import { CommandEntity } from "@picteus/ws-client";

import { ImageItemMode, UiExtensionCommandType } from "types";
import { ROUTES } from "utils";
import { useEventSocket, useImagesSelectedContext } from "app/context";
import { ExtensionsService } from "app/services";
import { useExtensionCommand } from "app/hooks";
import { ExtensionIcon, ImageMasonry } from "app/components";

import style from "./SelectedImagesAffix.module.scss";


const commandSeparator = "$$";

export default function SelectedImagesAffix() {
  const [t] = useTranslation();
  const location = useLocation();
  const imagesContainerRef = useRef<HTMLDivElement>(null);
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const { selectedImages, clearSelectedImages} = useImagesSelectedContext();
  const [extensionsImageCommands, setExtensionsImageCommands] = useState<UiExtensionCommandType[]>(ExtensionsService.getExtensionsCommands([CommandEntity.Images]));
  const callCommand = useExtensionCommand();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>();

  function shouldAffixBeVisible() {
    return location.pathname === ROUTES.home && selectedImages?.length >= 1 && isProcessing === false;
  }

  useEffect(() => {
    if (ExtensionsService.requiresCommandReload(event) === true) {
      void ExtensionsService.fetchAll().then(() => {
        setExtensionsImageCommands(ExtensionsService.getExtensionsCommands([CommandEntity.Images]));
      })
    }
  }, [event]);

  function computeBulkActionsOptions() {
    return extensionsImageCommands?.map((extensionCommand) => {
      return {
        value: `${extensionCommand.command.id}${commandSeparator}${extensionCommand.extension.manifest.id}`,
        label: extensionCommand.command.label,
        extensionId: extensionCommand.extension.manifest.id,
        extensionName: extensionCommand.extension.manifest.name,
      };
    });
  }

  function renderSelectOption(
    item: ComboboxLikeRenderOptionInput<
      ComboboxItem & { extensionId: string, extensionName: string }
    >,
  ) {
    return (
      <Flex align="center" gap={10}>
        <ExtensionIcon idOrExtension={item.option.extensionId} size="sm" />
        <Flex direction="column">
          <Text size="sm"> {item.option.label}</Text>
          <Text size="xs" c="dimmed">
            {item.option.extensionName}
          </Text>
        </Flex>
      </Flex>
    );
  }

  function handleOnApplyAction() {
    const [action, extensionId] = selectedAction?.split(commandSeparator) || [];

    const command = extensionsImageCommands.find(
      (imageCommand) => imageCommand.command.id === action && imageCommand.extension.manifest.id === extensionId
    );
    setIsProcessing(true);
    void callCommand(extensionId, command.command, selectedImages.map((image) => image.id), () => {
      setIsProcessing(false);
    }, (wasAborted: boolean) => {
      if (wasAborted === true) {
        setIsProcessing(false);
      }
    });
  }

  return (
    <Affix style={{ zIndex: 200 }} position={{ bottom: 50, right: 50 }}>
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
                    displayDetailInContainer={false}
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
                  placeholder={t("selectedImagesAffix.selectPlaceholder")}
                  label={t("selectedImagesAffix.selectLabel")}
                  data={computeBulkActionsOptions()}
                  renderOption={renderSelectOption}
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
