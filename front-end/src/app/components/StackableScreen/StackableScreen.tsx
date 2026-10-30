import { ReactElement, ReactNode } from "react";
import { Icon } from "@tabler/icons-react";

import { StackNavigator } from "app/components";


export interface StackableScreenPropsType
{
  children: ReactNode;
  title: ReactNode;
  icon: Icon;
  resetTrigger?: unknown;
}

export default function StackableScreen({
  children,
  title,
  icon,
  resetTrigger
}: StackableScreenPropsType): ReactElement
{
  return (
    <StackNavigator
      title={title}
      icon={icon}
      resetTrigger={resetTrigger}
    >
      {children}
    </StackNavigator>
  );
}
