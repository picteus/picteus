import { cloneElement, type CSSProperties, isValidElement, type ReactElement } from "react";
import { type Icon } from "@tabler/icons-react";

import { ContentIconType, IconSizeType, ResourceType } from "types";
import { Common, ResourceIcon } from "app/components";


const tablerIconCache = new WeakMap<object, boolean>();

function isTablerIcon(candidate: unknown): candidate is Icon
{
  if (!candidate)
  {
    return false;
  }

  const target = isValidElement(candidate) ? candidate.type : candidate;
  if (typeof target !== "function" && (typeof target !== "object" || target === null || !("render" in target)))
  {
    return false;
  }

  const cachedResult = tablerIconCache.get(target);
  if (cachedResult !== undefined)
  {
    return cachedResult;
  }

  let isTabler: boolean;
  try
  {
    if (typeof target === "function")
    {
      isTabler = target.name.startsWith("Icon") || target.toString().indexOf("tabler-icon") !== -1;
    }
    else
    {
      const render = (target as { render?: unknown }).render;
      isTabler = typeof render === "function" && render.toString().indexOf("tabler-icon") !== -1;
    }
  }
  catch (_error)
  {
    isTabler = false;
  }

  tablerIconCache.set(target, isTabler);
  return isTabler;
}

function isResourceType(candidate: unknown): candidate is ResourceType
{
  return typeof candidate === "object" && candidate !== null && ("url" in candidate || "content" in candidate);
}

export type ContentIconPropsType = {
  icon?: ContentIconType;
  size?: IconSizeType | number;
  withBorder?: boolean;
};

export default function ContentIcon({ icon, size, withBorder }: ContentIconPropsType): ReactElement | null
{
  if (icon === undefined)
  {
    return null;
  }

  const rawIcon = typeof icon === "object" && "icon" in icon ? icon.icon : icon;
  if (rawIcon === undefined)
  {
    return null;
  }

  if (isResourceType(rawIcon))
  {
    return (
      <ResourceIcon
        icon={rawIcon}
        size={size}
        withBorder={withBorder}
      />
    );
  }

  const edge = typeof size === "number" ? size : (size !== undefined ? Common.IconFromStringToNumberSize(size) : undefined);
  const border = withBorder === true ? Common.IconBorder : undefined;
  const borderStyle: CSSProperties | undefined = border !== undefined ? { border } : undefined;

  if (isValidElement(rawIcon))
  {
    const isTabler = isTablerIcon(rawIcon);
    if (!isTabler && borderStyle === undefined)
    {
      return rawIcon;
    }

    const element = rawIcon as ReactElement<{ stroke?: number; size?: number; style?: CSSProperties }>;
    return cloneElement(element, {
      ...(isTabler ? { stroke: element.props?.stroke ?? Common.IconStrokeSize } : {}),
      ...(isTabler && edge !== undefined && element.props?.size === undefined ? { size: edge } : {}),
      ...(borderStyle !== undefined ? { style: { ...element.props?.style, ...borderStyle } } : {})
    });
  }

  if (isTablerIcon(rawIcon))
  {
    const TheIcon = rawIcon as Icon;
    return (
      <TheIcon
        stroke={Common.IconStrokeSize}
        size={edge}
        style={borderStyle}
      />
    );
  }

  return null;
}
