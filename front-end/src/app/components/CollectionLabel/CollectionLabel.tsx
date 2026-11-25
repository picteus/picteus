import { ReactElement } from "react";
import { Badge, Group, Text } from "@mantine/core";

import { Collection } from "@picteus/ws-client";

import CollectionIcon from "../CollectionIcon/CollectionIcon.tsx";
import Common from "../Common/Common.ts";


type CollectionLabelPropsType = {
  readonly collection: Collection;
  readonly size?: "sm" | "md";
  readonly variant?: "plain" | "pill";
};

export default function CollectionLabel({
  collection,
  size = "sm",
  variant = "plain"
}: CollectionLabelPropsType): ReactElement
{
  if (variant === "pill")
  {
    return (
      <Badge
        variant="default"
        size={size === "md" ? "lg" : "md"}
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
        tt="none"
        pl={6}
        pr={7}
        leftSection={<CollectionIcon collection={collection} size={size === "md" ? 14 : 12}/>}
      >
        {collection.name}
      </Badge>
    );
  }

  const iconSize = size === "md" ? Common.IconXSmallSize : 14;

  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      <CollectionIcon collection={collection} size={iconSize}/>
      <Text size={size} fw={500} truncate="end">
        {collection.name}
      </Text>
    </Group>
  );
}
