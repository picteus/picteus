import { ReactElement, ReactNode } from "react";
import { Flex, Stack, Text, Title } from "@mantine/core";

import DotSeparated from "../DotSeparated/DotSeparated.tsx";


type ScreenHeaderPropsType = {
  readonly title: ReactNode;
  readonly countLabel: string;
  readonly subtitle: string;
  readonly actions: ReactNode;
};

export default function ScreenHeader({
  title,
  countLabel,
  subtitle,
  actions
}: ScreenHeaderPropsType): ReactElement
{
  return (
    <Flex justify="space-between" align="center" gap="md" wrap="wrap">
      <Stack gap={4}>
        <Title>{title}</Title>
        <DotSeparated size="sm">
          <Text size="sm" c="dimmed">{countLabel}</Text>
          <Text size="sm" c="dimmed">{subtitle}</Text>
        </DotSeparated>
      </Stack>
      <Flex gap="sm" align="center">
        {actions}
      </Flex>
    </Flex>
  );
}
