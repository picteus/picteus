import React from "react";
import { Button, CloseButton, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { IconChevronDown, IconSquare, IconSquareCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image } from "@picteus/ws-client";

import { ViewMode } from "types";
import { useImagesSelectedContext } from "app/context";
import { CopyText, ExternalLink, ImageItemMenu, TopPanel } from "app/components";
import { ImageDimensions, ImageRatio, ImageWeight } from "../index.ts";

import style from "./ImageTop.module.scss";


type ImageTopType = {
  image: Image;
  viewMode: ViewMode;
  onClose: () => void;
};

export default function ImageTop({ image, viewMode, onClose }: ImageTopType) {
  const [t] = useTranslation();
  const { toggleSelectedImage, isSelectedImage } = useImagesSelectedContext();
  const isSelected = isSelectedImage(image);

  return (<TopPanel
      info={<>
        <div className={style.titleBox}>
          <Stack className={style.title} gap={3}>
            <CopyText value={image.name} inline={true}>
              <Text size="md" truncate="end">{image.name}</Text>
            </CopyText>
            <Text c="dimmed" size="sm">
              {image.format} — {<ImageWeight image={image} />} — {<ImageDimensions
              dimensions={image.dimensions} />} ({<ImageRatio
              dimensions={image.dimensions} />})
            </Text>
            <CopyText value={image.id} inline={true}>
              <Text c="dimmed" size="sm">{image.id}</Text>
            </CopyText>
          </Stack>
        </div>
        <CloseButton size="lg" variant="subtle" onClick={onClose} />
      </>}
      actions={<Group>
        <Menu
          withinPortal={false}
          position="bottom-end"
          trigger="hover"
          trapFocus={false}
          openDelay={80}
          closeDelay={400}
          shadow="md"
          width={200}
        >
          <Menu.Target>
            <Button
              variant="default"
              rightSection={<IconChevronDown stroke={1.2} size={16} />}
            >
              {t("menu.imageCommands")}
            </Button>
          </Menu.Target>
          <ImageItemMenu image={image} viewMode={viewMode} />
        </Menu>
        <ExternalLink url={image.url} type="button" />
        <Tooltip
          label={t(`button.${isSelected ? "removeFromSelection" : "addToSelection"}`)}
          position="bottom"
        >
          <Button
            variant="default"
            leftSection={isSelected ? <IconSquareCheck size={16} /> : <IconSquare size={16} />}
            onClick={() => toggleSelectedImage(image)}
          >
            {t(`button.${isSelected ? "remove" : "add"}`)}
          </Button>
        </Tooltip>
      </Group>}
    />
  );
}
