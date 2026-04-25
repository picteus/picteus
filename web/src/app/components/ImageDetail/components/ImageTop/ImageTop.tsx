import React from "react";
import { ActionIcon, Button, Menu, Text } from "@mantine/core";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image } from "@picteus/ws-client";

import { CopyText, ImageItemMenu, TopPanel } from "app/components";
import { ImageDimensions, ImageWeight } from "../index.ts";

import style from "./ImageTop.module.scss";


type ImageTopType = {
  image: Image;
  onClose: () => void;
};

export default function ImageTop({ image, onClose }: ImageTopType) {
  const [t] = useTranslation();

  return (<TopPanel
      info={<>
        <div className={style.titleBox}>
          <div className={style.title}>
            <CopyText size="md" text={image.name} />
            <Text c="dimmed" size="sm">
              {image.format} — {<ImageWeight image={image} />} — {<ImageDimensions
              dimensions={image.dimensions} />}
            </Text>
          </div>
        </div>
        <ActionIcon variant="default" onClick={onClose}>
          <IconX stroke={1.2} size={50} />
        </ActionIcon>
      </>}
      actions={<Menu
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
        <ImageItemMenu image={image} />
      </Menu>
      } />
  );
}
