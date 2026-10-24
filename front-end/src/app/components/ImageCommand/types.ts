import { ReactNode } from "react";
import { ActionIconProps, ButtonProps, ElementProps, MenuItemProps } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { IconSizeType, ImageCommandIdType, ImageCommandType, ViewMode } from "types";


export type ImageCommandTargetType = ImageCommandType | ImageCommandIdType;

export type ImageCommandBasePropsType = {
  image: ImageSummary;
  command: ImageCommandTargetType;
  viewMode?: ViewMode;
  renderUnavailable?: boolean;
};

export type ImageCommandRootPropsType = ImageCommandBasePropsType & {
  children: ReactNode;
};

export type ImageCommandButtonPropsType = ImageCommandBasePropsType &
  Omit<ButtonProps, "size"> &
  Omit<ElementProps<"button", keyof ButtonProps>, "size"> &
  {
    size?: IconSizeType;
    iconOnly?: boolean;
    withTooltip?: boolean;
  };

export type ImageCommandActionIconPropsType = ImageCommandBasePropsType &
  Omit<ActionIconProps, "size"> &
  Omit<ElementProps<"button", keyof ActionIconProps>, "size"> &
  {
    size?: IconSizeType;
    withTooltip?: boolean;
  };

export type ImageCommandMenuItemPropsType = ImageCommandBasePropsType &
  MenuItemProps &
  Omit<ElementProps<"button", keyof MenuItemProps>, "size"> &
  {
    size?: IconSizeType;
    showSubLabel?: boolean;
  };
