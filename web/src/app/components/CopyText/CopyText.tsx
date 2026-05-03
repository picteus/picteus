import React from "react";
import { ActionIcon, CopyButton, Flex, MantineSize, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import style from "./CopyText.module.scss";


type CopyTextType = {
  text: string;
  size?: MantineSize;
  c?: string;
  value?: string;
  style?: string;
};

export default function CopyText({ text, size = "sm", value, c, style: textStyle = style.ellipsis }: CopyTextType) {
  const width = 14;
  const [t] = useTranslation();

  return (
    <Flex align={"center"}>
      <Text className={textStyle} size={size} c={c} dangerouslySetInnerHTML={{ __html: text }}/>
      <CopyButton value={value || text} timeout={1200}>
        {({ copied, copy }) => (
          <Tooltip
            label={t(`button.${copied ? "copy" : "copied"}`)}
            withArrow
            position="right"
          >
            <ActionIcon
              color={copied ? "teal" : (c ?? "gray")}
              variant="subtle"
              onClick={copy}
            >
              {copied ? (
                <IconCheck style={{ width }} />
              ) : (
                <IconCopy style={{ width }} />
              )}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Flex>
  );
}
