import { ReactNode } from "react";
import { ActionIconProps, ButtonProps, ElementProps, MenuItemProps } from "@mantine/core";

import { ProcessCommandIdType, ProcessCommandType } from "types";


export type ProcessCommandTargetType = ProcessCommandType | ProcessCommandIdType;

export type ProcessCommandBasePropsType = {
  command: ProcessCommandTargetType;
  renderUnavailable?: boolean;
};

export type ProcessCommandRootPropsType = ProcessCommandBasePropsType & {
  children: ReactNode;
};

export type ProcessCommandButtonPropsType = ProcessCommandBasePropsType &
  ButtonProps &
  ElementProps<"button", keyof ButtonProps> & {
  iconOnly?: boolean;
  withTooltip?: boolean;
};

export type ProcessCommandActionIconPropsType = ProcessCommandBasePropsType &
  ActionIconProps &
  ElementProps<"button", keyof ActionIconProps> & {
  withTooltip?: boolean;
};

export type ProcessCommandMenuItemPropsType = ProcessCommandBasePropsType &
  MenuItemProps &
  ElementProps<"button", keyof MenuItemProps> & {
  showSubLabel?: boolean;
};
