import React, { ReactElement } from "react";
import { Group } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ExtensionImageTag } from "@picteus/ws-client";

import { ImageTag } from "app/components";
import ExtensionGroupedCard from "../ExtensionGroupedCard/ExtensionGroupedCard.tsx";


export type ImageTagsCardPropsType =
  {
    readonly tags: readonly ExtensionImageTag[];
    readonly defaultExpanded?: boolean;
    readonly isOpened?: boolean;
    readonly onToggle?: () => void;
    readonly onHide?: () => void;
  };

export default function ImageTagsCard({
  tags,
  defaultExpanded = true,
  isOpened,
  onToggle,
  onHide
}: ImageTagsCardPropsType): ReactElement | null
{
  const [ t ] = useTranslation();

  return (
    <ExtensionGroupedCard
      title={t("imageDetail.tags")}
      items={tags}
      getExtensionId={(tag) => tag.id}
      defaultExpanded={defaultExpanded}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
      renderSection={(_extensionId, extensionTags) =>
        (
          <Group gap="xs">
            {extensionTags.map((imageTag, tagIndex) =>
              (
                <ImageTag
                  key={`tag-${tagIndex}`}
                  tag={imageTag}
                  kind="badge"
                  withExtensionPrefix={false}
                />
              )
            )}
          </Group>
        )
      }
    />
  );
}
