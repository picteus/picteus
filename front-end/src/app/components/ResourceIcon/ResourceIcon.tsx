import { type ReactElement } from "react";

import { computeResourceTypeUrl, IconSizeType, ResourceType } from "types";
import { Common, ImageThumbnail } from "app/components";


export type ResourceIconType = {
  icon?: ResourceType;
  size?: IconSizeType | number;
  withBorder?: boolean;
};

export default function ResourceIcon({ icon, size, withBorder }: ResourceIconType): ReactElement | null
{
  if (icon === undefined)
  {
    return null;
  }
  const edge = typeof size === "number" ? size : Common.IconFromStringToNumberSize(size);
  return (
    <ImageThumbnail imageOrUrl={computeResourceTypeUrl(icon)} edge={edge} withBorder={withBorder}/>
  );
}
