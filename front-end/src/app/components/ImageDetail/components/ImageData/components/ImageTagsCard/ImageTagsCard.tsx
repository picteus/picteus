import React, { ReactElement } from "react";
import { Badge, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ExtensionImageTag } from "@picteus/ws-client";

import { ImageTag } from "app/components";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";


export type ImageTagsCardPropsType =
  {
    readonly tags: readonly ExtensionImageTag[];
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageTagsCard({
  tags,
  isOpened,
  onToggle,
  onHide
}: ImageTagsCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <ImageDataCard
      header={(
        <>
          <Text fw={600} size="sm">
            {t("imageDetail.tags")}
          </Text>
          <Badge size="xs" variant="light" color="gray">
            {tags.length}
          </Badge>
        </>
      )}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    >
      <Group gap="xs">
        {tags.map((imageTag, index) =>
          (<ImageTag key={`tag-${index}`} tag={imageTag} kind="badge"/>)
        )}
      </Group>
    </ImageDataCard>
  );
}
