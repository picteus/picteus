import { ReactNode } from "react";
import { ActionIconProps, ButtonProps, ElementProps, MenuItemProps } from "@mantine/core";
import { SpotlightActionProps } from "@mantine/spotlight";

import { IconSizeType, ProcessCommandIdType, ProcessCommandType } from "types";


export type ProcessCommandTargetType = ProcessCommandType | ProcessCommandIdType;

export type ProcessCommandBasePropsType = {
  command: ProcessCommandTargetType;
  renderUnavailable?: boolean;
};

export type ProcessCommandRootPropsType = ProcessCommandBasePropsType & {
  children: ReactNode;
};

export type ProcessCommandButtonPropsType = ProcessCommandBasePropsType &
  Omit<ButtonProps, "size"> &
  Omit<ElementProps<"button", keyof ButtonProps>, "size"> &
  {
    size?: IconSizeType;
    iconOnly?: boolean;
    withTooltip?: boolean;
  };

export type ProcessCommandActionIconPropsType = ProcessCommandBasePropsType &
  Omit<ActionIconProps, "size"> &
  Omit<ElementProps<"button", keyof ActionIconProps>, "size"> &
  {
    size?: IconSizeType;
    withTooltip?: boolean;
  };

export type ProcessCommandMenuItemPropsType = ProcessCommandBasePropsType &
  MenuItemProps &
  Omit<ElementProps<"button", keyof MenuItemProps>, "size"> &
  {
    size?: IconSizeType;
    showSubLabel?: boolean;
  };

export type ProcessCommandSpotlightActionPropsType = ProcessCommandBasePropsType &
  SpotlightActionProps &
  ElementProps<"button", keyof SpotlightActionProps> & {
  showSubLabel?: boolean;
};
