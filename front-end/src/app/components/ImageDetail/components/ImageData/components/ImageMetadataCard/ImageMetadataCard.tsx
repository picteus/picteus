import React, { ReactElement, ReactNode, useMemo } from "react";
import { Badge, Box, Divider, Flex, Stack, Text } from "@mantine/core";
import {
  IconCamera,
  IconColorSwatch,
  IconFileCode,
  IconFileDescription,
  IconInfoCircle,
  IconPhoto,
  IconTag
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { UiContainer } from "@picteus/shared-core";
import { ImageMetadata as PicteusImageMetadata } from "@picteus/ws-client";

import { Common, UiContainerView } from "app/components";
import { inferMetadataUiContainer, isMetadataValuePresent } from "../../ImageDataComputer.ts";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";


type MetadataSourceConfigurationType =
  {
    readonly labelKey: string;
    readonly icon: ReactNode;
    readonly color: string;
  };

const METADATA_SOURCES_CONFIGURATION: Record<keyof PicteusImageMetadata, MetadataSourceConfigurationType> =
  {
    all:
      {
        labelKey: "imageDetail.metadataSources.all",
        icon: <IconInfoCircle size={Common.IconSmallSize}/>,
        color: "gray"
      },
    exif:
      {
        labelKey: "imageDetail.metadataSources.exif",
        icon: <IconCamera size={Common.IconSmallSize}/>,
        color: "blue"
      },
    iptc:
      {
        labelKey: "imageDetail.metadataSources.iptc",
        icon: <IconFileDescription size={Common.IconSmallSize}/>,
        color: "cyan"
      },
    xmp:
      {
        labelKey: "imageDetail.metadataSources.xmp",
        icon: <IconFileCode size={Common.IconSmallSize}/>,
        color: "violet"
      },
    icc:
      {
        labelKey: "imageDetail.metadataSources.icc",
        icon: <IconColorSwatch size={Common.IconSmallSize}/>,
        color: "teal"
      },
    tiffTagPhotoshop:
      {
        labelKey: "imageDetail.metadataSources.tiffTagPhotoshop",
        icon: <IconPhoto size={Common.IconSmallSize}/>,
        color: "indigo"
      },
    others:
      {
        labelKey: "imageDetail.metadataSources.others",
        icon: <IconTag size={Common.IconSmallSize}/>,
        color: "gray"
      }
  };

export function getMetadataEntriesCount(metadata: PicteusImageMetadata | undefined | null): number
{
  if (metadata === undefined || metadata === null)
  {
    return 0;
  }

  let count = 0;
  for (const metadataKey of Object.keys(METADATA_SOURCES_CONFIGURATION) as (keyof PicteusImageMetadata)[])
  {
    const rawValue = metadata[metadataKey];
    if (isMetadataValuePresent(rawValue))
    {
      count++;
    }
  }
  return count;
}

type MetadataSourceEntryType =
  {
    readonly name?: string;
    readonly uiContainer: UiContainer;
  };

type MetadataSourceGroupType =
  {
    readonly id: string;
    readonly label: string;
    readonly icon: ReactNode;
    readonly color: string;
    readonly entries: MetadataSourceEntryType[];
  };

export type ImageMetadataCardPropsType =
  {
    readonly metadata: PicteusImageMetadata;
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageMetadataCard({
  metadata,
  isOpened,
  onToggle,
  onHide
}: ImageMetadataCardPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const sourceGroups = useMemo<MetadataSourceGroupType[]>(() =>
    {
      if (metadata === undefined || metadata === null)
      {
        return [];
      }

      const groups: MetadataSourceGroupType[] = [];
      for (const [ metadataKey, sourceConfiguration ] of Object.entries(METADATA_SOURCES_CONFIGURATION))
      {
        const rawValue = metadata[metadataKey as keyof PicteusImageMetadata];
        if (isMetadataValuePresent(rawValue))
        {
          groups.push({
            id: metadataKey,
            label: t(sourceConfiguration.labelKey),
            icon: sourceConfiguration.icon,
            color: sourceConfiguration.color,
            entries: [ { uiContainer: inferMetadataUiContainer(rawValue) } ]
          });
        }
      }
      return groups;
    },
    [ metadata, t ]
  );

  const totalEntriesCount = sourceGroups.reduce((count, group) => count + group.entries.length, 0);
  if (totalEntriesCount === 0)
  {
    return null;
  }

  return (
    <ImageDataCard
      header={(
        <>
          <Text fw={600} size="sm">
            {t("imageDetail.metadata")}
          </Text>
          {totalEntriesCount > 1 && (
            <Badge size="xs" variant="light" color="gray">
              {totalEntriesCount}
            </Badge>
          )}
        </>
      )}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    >
      <Stack gap="md">
        {sourceGroups.map((sourceGroup, sourceIndex) =>
          (
            <Box key={sourceGroup.id}>
              {sourceIndex > 0 && <Divider mb="sm"/>}
              <Flex align="center" gap="xs" mb="xs">
                <Badge
                  size="sm"
                  variant="light"
                  color={sourceGroup.color}
                  leftSection={sourceGroup.icon}
                  radius="sm"
                >
                  {sourceGroup.label}
                </Badge>
              </Flex>
              <Stack gap="xs">
                {sourceGroup.entries.map((entry, entryIndex) =>
                  (
                    <Box key={`entry-${entryIndex}`}>
                      {entry.name && (
                        <Text size="xs" fw={600} c="dimmed" mb="xs">
                          {entry.name}
                        </Text>
                      )}
                      <UiContainerView uiContainer={entry.uiContainer}/>
                    </Box>
                  )
                )}
              </Stack>
            </Box>
          )
        )}
      </Stack>
    </ImageDataCard>
  );
}
