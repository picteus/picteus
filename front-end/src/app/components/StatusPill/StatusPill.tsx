import { ReactElement } from "react";
import { Badge, Box, Loader } from "@mantine/core";


type StatusPillPropsType = {
  readonly label: string;
  readonly color: string;
  readonly isLoading?: boolean;
};

export default function StatusPill({
  label,
  color,
  isLoading = false
}: StatusPillPropsType): ReactElement
{
  return (
    <Badge
      color={color}
      variant="light"
      size="sm"
      leftSection={
        isLoading === true ? (
          <Loader size={10} color={color}/>
        ) : (
          <Box w={6} h={6} bg={`var(--mantine-color-${color}-filled)`} bdrs={6}/>
        )
      }
    >
      {label}
    </Badge>
  );
}
