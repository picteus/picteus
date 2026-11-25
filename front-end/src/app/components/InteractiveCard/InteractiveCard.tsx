import { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from "react";
import { Box, MantineSpacing, StyleProp } from "@mantine/core";

import style from "./InteractiveCard.module.scss";


type InteractiveCardPropsType = {
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly p: StyleProp<MantineSpacing>;
  readonly h?: StyleProp<CSSProperties["height"]>;
};

export default function InteractiveCard({
  onClick,
  children,
  p,
  h
}: InteractiveCardPropsType): ReactElement
{
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void
  {
    if (event.target !== event.currentTarget)
    {
      return;
    }
    if (event.key === "Enter" || event.key === " ")
    {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      className={style.card}
      w="100%"
      p={p}
      h={h}
      bdrs="md"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </Box>
  );
}
