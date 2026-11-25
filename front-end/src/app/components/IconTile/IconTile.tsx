import { ReactElement, ReactNode } from "react";
import { Flex, MantineColor, MantineRadius } from "@mantine/core";


type IconTilePropsType = {
  readonly size: number;
  readonly radius?: MantineRadius;
  readonly isBordered?: boolean;
  readonly bg?: MantineColor;
  readonly children: ReactNode;
};

export default function IconTile({
  size,
  radius = "sm",
  isBordered = true,
  bg = "var(--mantine-color-body)",
  children
}: IconTilePropsType): ReactElement
{
  return (
    <Flex
      w={size}
      h={size}
      miw={size}
      align="center"
      justify="center"
      bdrs={radius}
      bd={isBordered === true ? "1px solid var(--mantine-color-default-border)" : undefined}
      bg={bg}
      flex="0 0 auto"
    >
      {children}
    </Flex>
  );
}
