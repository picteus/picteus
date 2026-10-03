import React from "react";
import { Image } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { Common } from "app/components";

import variables from "../../../assets/style/variablesExport.module.scss";


type EntityVisualType = {
  illustrationUri?: string;
  isCompact: boolean;
  onClick?: () => void;
};

export default function EntityVisual({ illustrationUri, isCompact, onClick }: EntityVisualType)
{
  const size = isCompact === true ? Common.ToastIconEdge : Common.NotificationIllustrationEdge;
  if (illustrationUri === undefined)
  {
    return <IconInfoCircle color="grey" stroke={Common.IconStrokeSize} size={size}/>;
  }
  return <Image
    alt={"EntityVisual"}
    w={size}
    h={size}
    fit="contain"
    radius={variables.imageRadius}
    src={illustrationUri}
    fallbackSrc={Common.FallbackImageUrl}
    onClick={onClick}
    style={{ cursor: onClick === undefined ? undefined : "pointer" }}
  />;
}
