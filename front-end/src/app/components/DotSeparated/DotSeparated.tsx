import { Children, Fragment, ReactElement, ReactNode } from "react";
import { Flex, FlexProps, MantineSize, MantineSpacing, StyleProp, Text } from "@mantine/core";

import Common from "../Common/Common.ts";


type DotSeparatedPropsType = {
  readonly children: ReactNode;
  readonly inline?: boolean;
  readonly size?: MantineSize;
  readonly gap?: StyleProp<MantineSpacing>;
  readonly wrap?: FlexProps["wrap"];
  readonly mt?: StyleProp<MantineSpacing>;
  readonly mb?: StyleProp<MantineSpacing>;
};

function isVisibleChild(child: ReactNode): boolean
{
  if (child === null || child === undefined || typeof child === "boolean")
  {
    return false;
  }
  if (typeof child === "string")
  {
    return child.trim().length > 0;
  }
  return true;
}

export default function DotSeparated({
  children,
  inline = false,
  size = "xs",
  gap = 6,
  wrap = "wrap",
  mt,
  mb
}: DotSeparatedPropsType): ReactElement | null
{
  const items = Children.toArray(children).filter(isVisibleChild);
  if (items.length === 0)
  {
    return null;
  }

  if (inline === true)
  {
    return (
      <>
        {items.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <span aria-hidden="true">{Common.DotSeparator}</span>}
            {item}
          </Fragment>
        ))}
      </>
    );
  }

  return (
    <Flex align="center" gap={gap} wrap={wrap} miw={0} mt={mt} mb={mb}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <Text span size={size} c="dimmed" flex="0 0 auto" aria-hidden="true">
              {Common.DotSymbol}
            </Text>
          )}
          {item}
        </Fragment>
      ))}
    </Flex>
  );
}
