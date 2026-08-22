import React from "react";
import { Flex, Image, Title } from "@mantine/core";

import { computeResourceTypeUrl, ContentIconType } from "types";
import { Common } from "app/components";

import style from "./ContentTitle.module.scss";


type ContentTitleType = {
  text: string;
  icon?: ContentIconType;
};

export default function ContentTitle({ text, icon }: ContentTitleType)
{
  return (<Flex className={style.content}>
    {(icon !== undefined && ("url" in icon || "content" in icon)) &&
      <Image src={computeResourceTypeUrl(icon)} fallbackSrc={Common.FallbackImageUrl} h={Common.IconLargeSize}
             w={Common.IconLargeSize}
             className={style.icon}/>}
    {(icon !== undefined && "icon" in icon) && icon.icon}
    <Title order={3}>{text}</Title>
  </Flex>);
}
