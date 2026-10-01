import { ReactNode } from "react";
import { ActionIconProps, ButtonProps, ElementProps, MenuItemProps } from "@mantine/core";

import { ImageSummary } from "@picteus/ws-client";

import { ImageCommandIdType, ImageCommandType, ViewMode } from "types";


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
  ButtonProps &
  ElementProps<"button", keyof ButtonProps> & {
  iconOnly?: boolean;
  withTooltip?: boolean;
};

export type ImageCommandActionIconPropsType = ImageCommandBasePropsType &
  ActionIconProps &
  ElementProps<"button", keyof ActionIconProps> & {
  withTooltip?: boolean;
};

export type ImageCommandMenuItemPropsType = ImageCommandBasePropsType &
  MenuItemProps &
  ElementProps<"button", keyof MenuItemProps> & {
  showSubLabel?: boolean;
};
