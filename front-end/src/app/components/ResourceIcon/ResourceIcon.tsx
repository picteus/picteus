import { type ReactElement } from "react";
import { Image } from "@mantine/core";

import { computeResourceTypeUrl, ContentIconType, IconSizeType } from "types";
import { Common } from "app/components";


export type ResourceIconType = {
  icon?: ContentIconType;
  size?: IconSizeType;
};

export default function ResourceIcon({ icon, size }: ResourceIconType): ReactElement | null
{
  if (icon === undefined || !("url" in icon || "content" in icon))
  {
    return null;
  }
  const edge = Common.IconFromStringToNumberSize(size);
  return (
    <Image
      src={computeResourceTypeUrl(icon)}
      fallbackSrc={Common.FallbackImageUrl}
      h={edge}
      w={edge}
    />
  );
}
