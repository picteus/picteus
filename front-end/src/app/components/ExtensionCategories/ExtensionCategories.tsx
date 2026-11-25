import { ReactElement } from "react";
import { Text, TextProps } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ExtensionCategory } from "@picteus/ws-client";


type ExtensionCategoriesPropsType = Omit<TextProps, "children"> &
  {
    readonly categories: readonly ExtensionCategory[];
  };

export default function ExtensionCategories({
  categories,
  ...textProps
}: ExtensionCategoriesPropsType): ReactElement | null
{
  const [ t ] = useTranslation();

  if (categories.length === 0)
  {
    return null;
  }

  const label = categories.map(category => t(`extension.categories.${category}`)).join(", ");

  return (
    <Text {...textProps}>
      {label}
    </Text>
  );
}
