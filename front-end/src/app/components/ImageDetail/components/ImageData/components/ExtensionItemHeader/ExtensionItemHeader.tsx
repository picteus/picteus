import React, { ReactElement, ReactNode } from "react";
import { Box, Flex, Text } from "@mantine/core";

import { DotSeparated, ExtensionBadge } from "app/components";


type ExtensionItemHeaderPropsType =
  {
    readonly extensionId: string;
    readonly name?: string;
    readonly hasSingleExtension: boolean;
    readonly rightSection?: ReactNode;
  };

export default function ExtensionItemHeader({
  extensionId,
  name,
  hasSingleExtension,
  rightSection
}: ExtensionItemHeaderPropsType): ReactElement | null
{
  const showBadge = hasSingleExtension === false;
  const showName = name !== undefined && name.length > 0;

  if (showBadge === false && showName === false && rightSection === undefined)
  {
    return null;
  }

  const hasLeftContent = showBadge || showName;
  const leftContent = hasLeftContent ? (
    <DotSeparated size="xs" gap="xs" mb={rightSection === undefined ? "xs" : undefined}>
      {showBadge && (
        <ExtensionBadge idOrExtension={extensionId} size="lg" color="gray"/>
      )}
      {showName && (
        <Text size="xs" fw={500} c="dimmed">
          {name}
        </Text>
      )}
    </DotSeparated>
  ) : null;

  if (rightSection !== undefined)
  {
    return (
      <Flex align="center" justify="space-between" gap="xs" mb="xs">
        {leftContent ?? <Box/>}
        {rightSection}
      </Flex>
    );
  }

  return leftContent;
}

