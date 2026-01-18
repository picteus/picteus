import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CommandEntity } from "@picteus/ws-client";
import { IconBolt, IconPhoto } from "@tabler/icons-react";
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
import { ImageMasonry } from "app/components";
import { ImageItemMode } from "types";
import { useImagesSelectedContext } from "app/context";
import { ROUTES } from "utils";
import { ExtensionsService } from "app/services";
import { useExtensionCommand } from "app/hooks";

import style from "./SelectedImagesAffix.module.scss";

export default function SelectedImagesAffix() {
  const location = useLocation();
  const [selectedImages, setSelectedImages] = useImagesSelectedContext();
  const callCommand = useExtensionCommand();
  const [selectedAction, setSelectedAction] = useState<string>();
  const [t] = useTranslation();

  function shouldAffixBeVisible() {
    return location.pathname === ROUTES.home && selectedImages?.length >= 1;
  }
  const extensionsImageCommands = useMemo(() => {
    return ExtensionsService.getExtensionsCommands([
      CommandEntity.Images,
    ]);
  }, []);
  function computeBulkActionsOptions() {
    return extensionsImageCommands?.map((extensionCommand) => {
      return {
        value:
          extensionCommand.command.id +
          "$$" +
          extensionCommand.extension.manifest.id,
        label: extensionCommand.command.label,
        extensionName: extensionCommand.extension.manifest.name,
      };
    });
  }

  function renderSelectOption(
    item: ComboboxLikeRenderOptionInput<
      ComboboxItem & { extensionName: string }
    >,
  ) {
    return (
      <Flex align="center" gap={5}>
        <IconBolt style={{ width: 14, height: 14 }} />
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
    const [action, extensionId] = selectedAction?.split("$$") || [];

    const command = extensionsImageCommands.find(
      (imageCommand) => imageCommand.command.id === action,
    );
    void callCommand(
      extensionId,
      command.command,
      selectedImages.map((image) => image.id),
    );
  }

  function handleOnClickUnselectAllImages() {
    setSelectedImages([]);
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
                    onClick={handleOnClickUnselectAllImages}
                    style={{ cursor: "pointer" }}
                    size="xs"
                    c="dimmed"
                    td="underline"
                  >
                    {t("selectedImagesAffix.buttonUnselectAll")}
                  </Text>
                </Flex>

                <Divider mb="sm" />
                <div className={style.affixThumbnailGrid}>
                  <ImageMasonry
                    containerWidth={400}
                    imageSize={133}
                    imageItemMode={ImageItemMode.SELECT}
                    loadMore={() => {}}
                    keyPrefix="selectedImages"
                    data={{
                      imageSummaries: selectedImages.map((imageSummary) => ({
                        ...imageSummary,
                        caption: undefined,
                      })),
                      currentPage: 1,
                      total: selectedImages.length,
                    }}
                  />
                </div>
              </div>
              <Divider mb="md" mt="md" />
              <Flex align="flex-end" gap={5}>
                <Select
                  allowDeselect={false}
                  style={{ flex: 1 }}
                  onChange={setSelectedAction}
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
