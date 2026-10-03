import React, { ReactElement } from "react";
import { Box, Flex, Text } from "@mantine/core";

import { UiContainerView } from "app/components";
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
      defaultExpanded={defaultExpanded}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
      renderSection={(_extensionId, extensionFeatures) =>
        (
          <Flex direction="column" gap="xs">
            {extensionFeatures.map((feature, featureIndex) =>
              (
                <Box key={featureIndex}>
                  {feature.name && (
                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                      {feature.name}
                    </Text>
                  )}
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
