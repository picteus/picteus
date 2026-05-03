import React from "react";
import { ActionIcon, Button, Group, Menu, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image } from "@picteus/ws-client";

import { ViewMode } from "types";
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

  return (<TopPanel
      info={<>
        <div className={style.titleBox}>
          <Stack className={style.title}>
            <CopyText value={image.name} inline={true} >
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
        <ActionIcon variant="default" onClick={onClose}>
          <IconX stroke={1.2} size={50} />
        </ActionIcon>
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
          <ImageItemMenu image={image} viewMode={viewMode}/>
        </Menu>
        <ExternalLink url={image.url} type="button" />
      </Group>}
    />
  );
}
