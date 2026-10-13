import { type ReactElement } from "react";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ShortcutBadge } from "app/components";

import style from "./UniversalActionCenterAccessor.module.scss";


export default function UniversalActionCenterAccessor(): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <UnstyledButton
      className={style.accessor}
      onClick={spotlight.open}
      data-no-drag
      aria-label={t("actionsCenter.searchOrJump")}
    >
      <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <IconSearch size={14} style={{ flexShrink: 0, opacity: 0.6 }}/>
        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
          {t("actionsCenter.searchOrJump")}
        </Text>
      </Group>
      <ShortcutBadge combo="mod+k" size="xs"/>
    </UnstyledButton>
  );
}
