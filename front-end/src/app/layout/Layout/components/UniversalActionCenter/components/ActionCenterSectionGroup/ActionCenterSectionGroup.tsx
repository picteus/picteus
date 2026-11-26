import type { ReactElement, ReactNode } from "react";
import { Group, Stack, Text } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";

import { Common } from "app/components";


type ActionCenterSectionGroupPropsType =
  {
    readonly icon: Icon;
    readonly label: string;
    readonly children: ReactNode;
  };

export default function ActionCenterSectionGroup({
  icon: HeaderIcon,
  label,
  children
}: ActionCenterSectionGroupPropsType): ReactElement
{
  return (
    <Stack gap={0} mt="sm">
      <Group gap={6} px="md" pb={4} align="center" c="dimmed">
        <HeaderIcon size={13} stroke={Common.IconStrokeSize}/>
        <Text component="span" size="xs" fw={700} tt="uppercase" lh={1}>
          {label}
        </Text>
      </Group>
      {children}
    </Stack>
  );
}
