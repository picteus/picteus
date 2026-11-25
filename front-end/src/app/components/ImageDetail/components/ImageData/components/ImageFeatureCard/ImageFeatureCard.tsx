import React, { ReactElement, ReactNode } from "react";
import { Box, Flex } from "@mantine/core";

import { UiContainerView } from "app/components";
import { ImageFeatureContainerType } from "../../ImageDataComputer.ts";
import ExtensionGroupedCard from "../ExtensionGroupedCard/ExtensionGroupedCard.tsx";
import ExtensionItemHeader from "../ExtensionItemHeader/ExtensionItemHeader.tsx";


export type ImageFeatureCardType =
  {
    readonly title: string;
    readonly featureContainers: ImageFeatureContainerType[];
    readonly isOpened?: boolean;
    readonly onToggle?: () => void;
    readonly onHide?: () => void;
    readonly renderItemRightSection?: (feature: ImageFeatureContainerType) => ReactNode;
  };

export default function ImageFeatureCard({
  title,
  featureContainers,
  isOpened,
  onToggle,
  onHide,
  renderItemRightSection
}: ImageFeatureCardType): ReactElement | null
{
  return (
    <ExtensionGroupedCard
      title={title}
      items={featureContainers}
      getExtensionId={(feature) => feature.extensionId}
      showExtensionBadge={false}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
      renderSection={(hasSingleExtension, extensionId, extensionFeatures) =>
        (
          <Flex direction="column" gap="xs">
            {extensionFeatures.map((feature, featureIndex) =>
              (
                <Box key={featureIndex}>
                  <ExtensionItemHeader
                    extensionId={extensionId}
                    name={feature.name}
                    hasSingleExtension={hasSingleExtension}
                    rightSection={renderItemRightSection?.(feature)}
                  />
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
