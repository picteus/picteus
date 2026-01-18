import React from "react";
import { ActionIcon, CopyButton, Flex, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

import style from "./CopyText.module.scss";

type CopyTextType = {
  text: string;
  size?: "sm" | "md" | "lg";
  value?: string;
  style?: string;
};

export default function CopyText({ text, size = "sm", value, style: textStyle = style.ellipsis }: CopyTextType) {
  return (
    <Flex align={"center"}>
      <Text className={textStyle} size={size} dangerouslySetInnerHTML={{ __html: text }}/>
      <CopyButton value={value || text} timeout={1200}>
        {({ copied, copy }) => (
          <Tooltip
            label={copied ? "Copied" : "Copy"}
            withArrow
            position="right"
          >
            <ActionIcon
              color={copied ? "teal" : "gray"}
              variant="subtle"
              onClick={copy}
            >
              {copied ? (
                <IconCheck style={{ width: 14 }} />
              ) : (
                <IconCopy style={{ width: 14 }} />
              )}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Flex>
  );
}
