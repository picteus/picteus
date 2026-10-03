import React, { ReactElement, useMemo } from "react";
import { Badge, Box, Divider, Flex, Stack, Text, Tooltip } from "@mantine/core";

import { useExtensions } from "app/hooks";
import { ExtensionBadge, ExtensionIcon } from "app/components";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";


export type ExtensionGroupedCardPropsType<T> =
  {
    readonly title: string;
    readonly items: readonly T[];
    readonly getExtensionId: (item: T) => string;
    readonly defaultExpanded: boolean;
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
    readonly renderSection: (extensionId: string, items: readonly T[], index: number) => ReactElement;
  };

export default function ExtensionGroupedCard<T>({
  title,
  items,
  getExtensionId,
  defaultExpanded = true,
  isOpened,
  onToggle,
  onHide,
  renderSection
}: ExtensionGroupedCardPropsType<T>): ReactElement | null
{
  const { data: extensions = [] } = useExtensions();

  const resolvedEntries = useMemo((): readonly (readonly [ string, readonly T[] ])[] =>
    {
      if (items === undefined || items.length === 0)
      {
        return [];
      }

      const map = new Map<string, T[]>();
      for (const item of items)
      {
        const extensionId = getExtensionId(item);
        let extensionItems = map.get(extensionId);
        if (extensionItems === undefined)
        {
          extensionItems = [];
          map.set(extensionId, extensionItems);
        }
        extensionItems.push(item);
      }

      return Array.from(map.entries());
    },
    [ items, getExtensionId ]
  );

  if (resolvedEntries.length === 0)
  {
    return null;
  }

  const hasSingleExtension = resolvedEntries.length === 1;
  const singleExtensionId = hasSingleExtension ? resolvedEntries[0][0] : undefined;
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
        {title}
      </Text>
      {!hasSingleExtension && (
        <Badge size="xs" variant="light" color="gray">
          {resolvedEntries.length}
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
        {resolvedEntries.map(([ extensionId, extensionItems ], index) =>
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
                {renderSection(extensionId, extensionItems, index)}
              </Box>
            );
          }
        )}
      </Stack>
    </ImageDataCard>
  );
}
