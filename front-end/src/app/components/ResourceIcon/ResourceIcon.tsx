import { type ReactElement } from "react";
import { Image } from "@mantine/core";

import { computeResourceTypeUrl, ContentIconType } from "types";
import { Common } from "app/components";


export type ResourceIconType = {
  icon?: ContentIconType;
  isCompact?: boolean;
};

export default function ResourceIcon({ icon, isCompact }: ResourceIconType): ReactElement | null
{
  if (icon === undefined || !("url" in icon || "content" in icon))
  {
    return null;
  }
  const edge = isCompact === true ? Common.IconSmallSize : Common.IconLargeSize;
  return (
    <Image
      src={computeResourceTypeUrl(icon)}
      fallbackSrc={Common.FallbackImageUrl}
      h={edge}
      w={edge}
    />
  );
}
