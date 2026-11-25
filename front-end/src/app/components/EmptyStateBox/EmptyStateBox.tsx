import { type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Stack, type StyleProp, Text } from "@mantine/core";


type EmptyStateBoxPropsType = {
  readonly icon?: ReactNode;
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly minHeight?: StyleProp<CSSProperties["minHeight"]>;
};

export default function EmptyStateBox({
  icon,
  title,
  description,
  action,
  minHeight
}: EmptyStateBoxPropsType): ReactElement
{
  return (
    <Stack
      justify="center"
      align="center"
      flex={1}
      w="100%"
      mih={minHeight}
      mx="auto"
      p="xl"
      gap="xs"
      bd="1px dashed var(--mantine-color-default-border)"
      bdrs="md"
      bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
      ta="center"
    >
      {icon !== undefined && icon}
      {title !== undefined && (
        <Text size="md" fw={600} ta="center">
          {title}
        </Text>
      )}
      {description !== undefined && (
        <Text size="sm" c="dimmed" ta="center" maw={440}>
          {description}
        </Text>
      )}
      {action !== undefined && (
        <Box mt={4}>
          {action}
        </Box>
      )}
    </Stack>
  );
}
