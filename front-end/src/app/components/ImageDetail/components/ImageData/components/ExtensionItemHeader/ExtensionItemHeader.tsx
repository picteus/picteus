import React, { ReactElement, ReactNode } from "react";
import { Flex, Text } from "@mantine/core";

import { Common, ExtensionBadge } from "app/components";


export type ExtensionItemHeaderPropsType =
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

  const leftContent = (
    <Flex align="center" gap="xs">
      {showBadge && (
        <ExtensionBadge idOrExtension={extensionId} size="lg" color="gray"/>
      )}
      {showName && (
        <Text size="xs" fw={500} c="dimmed">
          {showBadge && <span>{Common.DotSeparator}</span>} {name}
        </Text>
      )}
    </Flex>
  );

  if (rightSection !== undefined)
  {
    return (
      <Flex align="center" justify="space-between" gap="xs" mb="xs">
        {leftContent}
        {rightSection}
      </Flex>
    );
  }

  return (
    <Flex align="center" gap="xs" mb="xs">
      {showBadge && (
        <ExtensionBadge idOrExtension={extensionId} size="lg" color="gray"/>
      )}
      {showName && (
        <Text size="xs" fw={500} c="dimmed">
          {showBadge && <span>{Common.DotSeparator}</span>} {name}
        </Text>
      )}
    </Flex>
  );
}

