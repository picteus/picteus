import React from "react";
import { Button, Center, Group, Stack, Text, Title } from "@mantine/core";
import { IconProps } from "@tabler/icons-react";

import style from "./EmptyResults.module.scss";


type EmptyResultsType = {
  icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  isSmall?: boolean;
  title: string;
  description: string;
  buttonText?: string;
  buttonAction?: () => void;
};

export default function EmptyResults({
  icon,
  isSmall,
  title,
  description,
  buttonText,
  buttonAction
}: EmptyResultsType)
{
  return (
    <Center className={style.container}>
      <Stack gap={isSmall ? "md" : "lg"} align="center">
        <Center>
          {React.createElement(icon, { size: isSmall ? 100 : 140, stroke: 1, className: style.icon })}
        </Center>
        <Title size={isSmall ? "lg" : undefined}>{title}</Title>
        <Text c="dimmed" size={isSmall ? "md" : "lg"} ta="center">
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
