import React, { useMemo } from "react";
import { Collection } from "@picteus/ws-client";
import { Badge } from "@mantine/core";
import { generateColorRGB } from "@marko19907/string-to-color";
import { IconHandClick, IconWand } from "@tabler/icons-react";


type CollectionIconType = {
  collection: Collection;
};

export default function CollectionIcon({ collection }: CollectionIconType)
{
  const color = useMemo(() =>
  {
    return generateColorRGB(collection.id.toString());
  }, [ collection ]);

  const isManual = collection.filter.origin?.kind === "images";
  const Icon = isManual ? IconHandClick : IconWand;

  return (
    <Badge autoContrast color={color} leftSection={<Icon size={12}/>}>
      {collection.name.substring(0, 1).toUpperCase()}
    </Badge>
  );
}
