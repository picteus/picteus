import React from "react";
import { Badge } from "@mantine/core";

import style from "./OverlayIndicator.module.scss";


type OverlayIndicatorType = {
  text: string;
};

export default function OverlayIndicator({ text }: OverlayIndicatorType)
{
  return (<Badge
      size="lg"
      variant="filled"
      color="dark"
      radius="md"
      className={style.text}
    >
      {text}
    </Badge>
  );
}
