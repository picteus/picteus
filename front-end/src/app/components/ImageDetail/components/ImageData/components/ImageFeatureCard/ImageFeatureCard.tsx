import React, { ReactElement } from "react";
import { Box, Flex, Text } from "@mantine/core";

import { ExtensionBadge, UiContainerView } from "app/components";
import { ImageFeatureContainerType } from "../../ImageDataComputer.ts";
import ExtensionGroupedCard from "../ExtensionGroupedCard/ExtensionGroupedCard.tsx";


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
}: ImageFeatureCardType): ReactElement | null
{
  return (
    <ExtensionGroupedCard
      title={title}
      items={featureContainers}
      getExtensionId={(feature) => feature.extensionId}
      showExtensionBadge={false}
      defaultExpanded={defaultExpanded}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
      renderSection={(hasSingleExtension, extensionId, extensionFeatures) =>
        (
          <Flex direction="column" gap="xs">
            {extensionFeatures.map((feature, featureIndex) =>
              (
                <Box key={featureIndex}>
                  <Flex align="center" gap="xs" mb="xs">
                    {hasSingleExtension === false &&
                      <ExtensionBadge idOrExtension={extensionId} size="lg" color="gray"/>}
                    {feature.name && (
                      <Text size="xs" fw={500} c="dimmed">
                        {hasSingleExtension === false && <span>•</span>} {feature.name}
                      </Text>
                    )}
                  </Flex>
                  <UiContainerView uiContainer={feature.uiContainer}/>
                </Box>
              )
            )}
          </Flex>
        )
      }
    />
  );
}
