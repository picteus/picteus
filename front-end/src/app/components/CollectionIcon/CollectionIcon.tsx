import { ReactElement } from "react";
import { IconHandClick, IconWand } from "@tabler/icons-react";

import { Collection, SearchOriginNature } from "@picteus/ws-client";

import Common from "../Common/Common.ts";


type CollectionIconPropsType = {
  readonly collection: Collection;
  readonly size?: number;
};

export default function CollectionIcon({
  collection,
  size = 14
}: CollectionIconPropsType): ReactElement
{
  const isManual = collection.filter.origin?.kind === SearchOriginNature.Images;
  const Icon = isManual === true ? IconHandClick : IconWand;

  return (
    <Icon
      size={size}
      stroke={Common.IconStrokeSize}
      color="var(--mantine-color-dimmed)"
      style={{ flexShrink: 0 }}
    />
  );
}
