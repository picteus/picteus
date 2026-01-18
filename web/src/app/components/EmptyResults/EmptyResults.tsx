import React, { ReactElement } from "react";
import { Button, Center, Group, Stack, Text, Title } from "@mantine/core";
import { IconZoomQuestion } from "@tabler/icons-react";
import i18n from "i18next";

import style from "./EmptyResults.module.scss";

type EmptyResultsType = {
  icon: ReactElement;
  title: string;
  description: string;
  buttonText?: string;
  buttonAction?: () => void;
};

export default function EmptyResults({
  icon = <IconZoomQuestion size={140} stroke={1} />,
  title = i18n.t("emptyResults.title"),
  description = i18n.t("emptyResults.description"),
  buttonText = i18n.t("emptyResults.buttonText"),
  buttonAction,
}: EmptyResultsType) {
  return (
    <Center className={style.container}>
      <Stack gap="xl">
        <Center> {React.cloneElement(icon, { className: style.icon })}</Center>
        <Title>{title}</Title>
        <Text c="dimmed" size="lg" ta="center">
          {description}
        </Text>
        {buttonAction && (
          <Group justify="center">
            <Button size="md" onClick={buttonAction}>
              {buttonText}
            </Button>
          </Group>
        )}
      </Stack>
    </Center>
  );
}
