import React, { ReactNode } from "react";
import { Divider, Flex } from "@mantine/core";

import style from "./TopPanel.module.scss";


type TopPanelType = {
  info: ReactNode;
  actions: ReactNode;
};

export default function TopPanel({ info, actions }: TopPanelType) {
  return <div className={style.content}>
    <Flex align="center" justify="space-between" gap={10} p={20}>
      {info}
    </Flex>
    <Flex px="md">
      {actions}
    </Flex>
    <Divider my="md" />
  </div>;
}
