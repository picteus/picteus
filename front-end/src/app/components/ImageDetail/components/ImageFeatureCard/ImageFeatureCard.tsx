import React, { ReactNode, useMemo } from "react";
import { Badge, Box, Divider, Flex, Stack, Text, Tooltip } from "@mantine/core";

import { ImageFeatureType } from "@picteus/ws-client";
import { UiAction, UiContainer } from "@picteus/shared-core";

import { ViewMode } from "types";
import { useExtensions } from "app/hooks";
import { ExtensionIcon, UiContainerView } from "app/components";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";


export type ImageFeatureCardType =
  {
    readonly title: string;
    readonly type: ImageFeatureType;
    readonly perExtensionIdContainers: Map<string, UiContainer[]>;
    readonly viewMode: ViewMode;
    readonly onAction?: (action: UiAction) => void;
    readonly defaultExpanded?: boolean;
  };

// noinspection JSUnusedLocalSymbols
export default function ImageFeatureCard({
  title,
  type,
  perExtensionIdContainers,
  viewMode,
  onAction,
  defaultExpanded = true
}: ImageFeatureCardType): ReactNode
{
  const { data: extensions = [] } = useExtensions();
  const featureEntries = useMemo((): [ string, UiContainer[] ][] =>
    {
      if (!perExtensionIdContainers)
      {
        return [];
      }
      return Array.from(perExtensionIdContainers.entries()).filter(([ , features ]) => features.length > 0);
    },
    [ perExtensionIdContainers ]
  );

  if (featureEntries.length === 0)
  {
    return null;
  }

  const hasSingleExtension = featureEntries.length === 1;
  const singleExtensionId = hasSingleExtension ? featureEntries[0][0] : undefined;
  const singleExtension = singleExtensionId ? extensions.find((anExtension) => anExtension.manifest.id === singleExtensionId) : undefined;

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
          {featureEntries.length}
        </Badge>
      )}
    </>
  );

  return (
    <ImageDataCard header={headerNode} defaultExpanded={defaultExpanded}>
      <Stack gap="md">
        {featureEntries.map(
          ([ extensionId, features ], index) =>
          {
            const extension = extensions.find((availableExtension) => availableExtension.manifest.id === extensionId);
            const extensionName = extension?.manifest.name ?? extensionId;

            return (
              <Box key={extensionId}>
                {!hasSingleExtension && (
                  <>
                    {index > 0 && <Divider mb="sm"/>}
                    <Flex align="center" gap="xs" mb="xs">
                      <ExtensionIcon idOrExtension={extensionId} size="sm"/>
                      <Text size="xs" fw={500} c="dimmed">
                        {extensionName}
                      </Text>
                    </Flex>
                  </>
                )}
                <Flex direction="column" gap="xs">
                  {features.map(
                    (feature, featureIndex) =>
                    {
                      return (
                        <UiContainerView
                          key={featureIndex}
                          uiContainer={feature}
                          onAction={onAction}
                        />
                      );
                    }
                  )}
                </Flex>
              </Box>
            );
          }
        )}
      </Stack>
    </ImageDataCard>
  );
}
