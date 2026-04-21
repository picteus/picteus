import React from "react";
import { ActionIcon, Button, Text, Tooltip } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { useOpenExplorer } from "app/hooks";
import { removeFilePrefixFromUrl } from "utils";

import style from "./ExternalLink.module.scss";


type ExternalLinkType = {
  url: string;
  type: "link" | "action" | "button";
};

export default function ExternalLink({
  url,
  type,
}: ExternalLinkType) {
  const [t] = useTranslation();
  const cleanUrl = removeFilePrefixFromUrl(url);
  const openExplorer = useOpenExplorer(cleanUrl);

  async function handleOnClick() {
    await openExplorer();
  }

  if (type === "action") {
    return (<Tooltip label={t("button.externalLinkOpen")}>
      <ActionIcon
        variant="default"
        onClick={handleOnClick}
      >
        <IconExternalLink size={20} stroke={1} />
      </ActionIcon>
    </Tooltip>);
  }
  else if (type === "button") {
    return (<Button
        leftSection={<IconExternalLink size={16} />}
        onClick={handleOnClick}
      >
        {t("button.externalLinkOpen")}
      </Button>
    );
  }
  else {
    return (
      <div className={style.container} onClick={handleOnClick}>
        <Text size={"sm"} td="underline" c={"blue"}>
          {cleanUrl}
        </Text>
        <IconExternalLink
          stroke={1.5}
          size={18}
          color="var(--mantine-color-blue-filled)"
        />
      </div>
    );
  }
}
