import React, { ReactNode } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import { Text } from "@mantine/core";

import { useOpenExplorer } from "app/hooks";
import style from "./ExternalLink.module.scss";
import { removeFilePrefixFromUrl } from "utils";

type ExternalLinkType = {
  label: string;
  url?: string;
  icon?: ReactNode;
  overrideAction?: () => void;
};

export default function ExternalLink({
  label,
  url,
  icon,
  overrideAction,
}: ExternalLinkType) {
  const cleanUrl = removeFilePrefixFromUrl(url);
  const openExplorer = useOpenExplorer(cleanUrl);

  async function handleOnClick() {
    if (overrideAction) {
      return overrideAction();
    }
    await openExplorer();
  }

  return (
    <div className={style.container} onClick={handleOnClick}>
      <Text size={"sm"} td="underline" c={"blue"}>
        {removeFilePrefixFromUrl(label)}
      </Text>
      {icon || (
        <IconExternalLink
          stroke={1.5}
          size={18}
          color="var(--mantine-color-blue-filled)"
        />
      )}
    </div>
  );
}
