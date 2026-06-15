import React from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";


export default function NoValue() {
  const [t] = useTranslation();

  return (<Text fs="italic" c="dimmed">{t("field.noValue")}</Text>);
}
