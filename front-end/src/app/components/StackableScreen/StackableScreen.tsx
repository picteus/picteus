import { ReactElement, ReactNode } from "react";
import { Icon } from "@tabler/icons-react";

import { StackNavigator } from "app/components";


interface StackableScreenPropsType
{
  children: ReactNode;
  title: ReactNode;
  icon: Icon;
}

export default function StackableScreen({
  children,
  title,
  icon
}: StackableScreenPropsType): ReactElement
{
  return (
    <StackNavigator
      title={title}
      icon={icon}
    >
      {children}
    </StackNavigator>
  );
}
