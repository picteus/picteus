import React, { ReactNode } from "react";
import { ActionIcon, Box, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";


type CopyTextType = {
  value: string;
  inline?: boolean;
  children: ReactNode;
};

export default function CopyText({ value, inline = false, children }: CopyTextType) {
  const width = 14;
  const [t] = useTranslation();

  const copyButtonNode = (
    <CopyButton value={value} timeout={1200}>
      {({ copied, copy }) => (
        <Tooltip
          label={t(`button.${copied ? "copied" : "copy"}`)}
          withArrow
          position="right"
        >
          <ActionIcon
            color={copied ? "teal" : "gray"}
            variant="subtle"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              copy();
            }}
            style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 4 }}
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
  );

  return (
    <Box component="span" style={{ display: inline ? "inline-flex" : "inline", alignItems: inline ? "end" : undefined }}>
      {children}
      {copyButtonNode}
    </Box>
  );
}
