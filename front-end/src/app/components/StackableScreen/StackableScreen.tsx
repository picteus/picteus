import { ReactElement, ReactNode } from "react";

import { StackNavigator } from "app/components";


export interface StackableScreenPropsType
{
  children: ReactNode;
  title: ReactNode;
  resetTrigger?: unknown;
}

export default function StackableScreen({
  children,
  title,
  resetTrigger
}: StackableScreenPropsType): ReactElement
{
  return (
    <StackNavigator title={title} resetTrigger={resetTrigger}>
      {children}
    </StackNavigator>
  );
}
