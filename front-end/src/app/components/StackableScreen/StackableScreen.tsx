import { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { APP_SCREENS, type AppScreenIdType } from "../AppScreens/AppScreens.ts";
import StackNavigator from "../StackNavigator/StackNavigator.tsx";


interface StackableScreenPropsType
{
  readonly screen: AppScreenIdType;
  readonly title?: ReactNode;
  readonly children: ReactNode;
}

export default function StackableScreen({
  screen,
  title,
  children
}: StackableScreenPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const screenDescriptor = APP_SCREENS[screen];

  return (
    <StackNavigator
      title={title ?? t(screenDescriptor.titleKey)}
      icon={screenDescriptor.icon}
    >
      {children}
    </StackNavigator>
  );
}
