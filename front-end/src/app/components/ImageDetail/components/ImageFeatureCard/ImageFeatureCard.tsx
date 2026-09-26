import React, { ReactNode, useMemo } from "react";
import { Badge, Box, Divider, Flex, Stack, Text, Tooltip } from "@mantine/core";

import { ImageFeatureType } from "@picteus/ws-client";
import { UiContainer } from "@picteus/shared-core";
import { useExtensions } from "app/hooks";
import { ExtensionBadge, ExtensionIcon, UiContainerView } from "app/components";
import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";


export type ImageFeatureContainerType =
  {
    readonly extensionId: string;
    readonly type: ImageFeatureType;
    readonly name?: string;
    readonly uiContainer: UiContainer;
  };

export type ImageFeatureCardType =
  {
    readonly title: string;
    readonly featureContainers: ImageFeatureContainerType[];
    readonly defaultExpanded?: boolean;
    readonly isOpened?: boolean;
    readonly onToggle?: () => void;
    readonly onHide?: () => void;
  };

export default function ImageFeatureCard({
  title,
  featureContainers,
  defaultExpanded = true,
  isOpened,
  onToggle,
  onHide
}: ImageFeatureCardType): ReactNode
{
  const { data: extensions = [] } = useExtensions();
  const featureEntries = useMemo((): [ string, ImageFeatureContainerType[] ][] =>
    {
      if (!featureContainers || featureContainers.length === 0)
      {
        return [];
      }

      const featuresByExtensionId = new Map<string, ImageFeatureContainerType[]>();
      for (const feature of featureContainers)
      {
        let extensionFeatures = featuresByExtensionId.get(feature.extensionId);
        if (extensionFeatures === undefined)
        {
          extensionFeatures = [];
          featuresByExtensionId.set(feature.extensionId, extensionFeatures);
        }
        extensionFeatures.push(feature);
      }

      return Array.from(featuresByExtensionId.entries());
    },
    [ featureContainers ]
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
    <ImageDataCard
      header={headerNode}
      defaultExpanded={defaultExpanded}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    >
      <Stack gap="md">
        {featureEntries.map(([ extensionId, extensionFeatures ], index) =>
          {
            return (<Box key={`${extensionId}-${index}`}>
              {!hasSingleExtension && (
                <>
                  {index > 0 && <Divider mb="sm"/>}
                  <Flex align="center" gap="xs" mb="xs">
                    <ExtensionBadge idOrExtension={extensionId} size="lg" color="gray"/>
                  </Flex>
                </>
              )}
              <Flex direction="column" gap="xs">
                {extensionFeatures.map(
                  (feature, featureIndex) =>
                  {
                    return (
                      <Box key={featureIndex}>
                        {feature.name && (
                          <Text size="xs" fw={600} c="dimmed" mb={4}>
                            {feature.name}
                          </Text>
                        )}
                        <UiContainerView
                          uiContainer={feature.uiContainer}
                        />
                      </Box>
                    );
                  }
                )}
              </Flex>
            </Box>);
          }
        )}
      </Stack>
    </ImageDataCard>
  );
}
