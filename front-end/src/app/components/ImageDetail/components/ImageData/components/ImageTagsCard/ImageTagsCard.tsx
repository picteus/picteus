import React, { ReactElement, useMemo } from "react";
import { Badge, Box, Divider, Flex, Group, Stack, Text, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ExtensionImageTag } from "@picteus/ws-client";

import { useExtensions } from "app/hooks";
import { ExtensionBadge, ExtensionIcon, ImageTag } from "app/components";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";


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
}: ImageTagsCardPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: extensions = [] } = useExtensions();

  const tagEntries = useMemo((): [ string, ExtensionImageTag[] ][] =>
    {
      if (!tags || tags.length === 0)
      {
        return [];
      }

      const tagsByExtensionId = new Map<string, ExtensionImageTag[]>();
      for (const tag of tags)
      {
        let extensionTags = tagsByExtensionId.get(tag.id);
        if (extensionTags === undefined)
        {
          extensionTags = [];
          tagsByExtensionId.set(tag.id, extensionTags);
        }
        extensionTags.push(tag);
      }

      return Array.from(tagsByExtensionId.entries());
    },
    [ tags ]
  );

  if (tagEntries.length === 0)
  {
    return null;
  }

  const hasSingleExtension = tagEntries.length === 1;
  const singleExtensionId = hasSingleExtension ? tagEntries[0][0] : undefined;
  const singleExtension = singleExtensionId
    ? extensions.find((anExtension) => anExtension.manifest.id === singleExtensionId)
    : undefined;

  const headerNode = (
    <>
      {hasSingleExtension && singleExtensionId && (
        <Tooltip label={singleExtension?.manifest.name ?? singleExtensionId} position="top" withArrow>
          <Box style={{ display: "inline-flex" }}>
            <ExtensionIcon idOrExtension={singleExtensionId} size="sm"/>
          </Box>
        </Tooltip>
      )}
      <Text fw={600} size="sm">
        {t("imageDetail.tags")}
      </Text>
      {!hasSingleExtension && (
        <Badge size="xs" variant="light" color="gray">
          {tagEntries.length}
        </Badge>
      )}
    </>
  );

  return (
    <ImageDataCard
      header={headerNode}
      defaultExpanded={defaultExpanded}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    >
      <Stack gap="md">
        {tagEntries.map(([ extensionId, extensionTags ], index) =>
          {
            return (
              <Box key={`${extensionId}-${index}`}>
                {!hasSingleExtension && (
                  <>
                    {index > 0 && <Divider mb="sm"/>}
                    <Flex align="center" gap="xs" mb="xs">
                      <ExtensionBadge idOrExtension={extensionId} size="lg" color="gray"/>
                    </Flex>
                  </>
                )}
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
              </Box>
            );
          }
        )}
      </Stack>
    </ImageDataCard>
  );
}
