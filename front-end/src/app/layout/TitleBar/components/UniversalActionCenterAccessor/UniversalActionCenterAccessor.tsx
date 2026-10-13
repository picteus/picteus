import { type ReactElement, useMemo } from "react";
import { Group, Kbd, Text, UnstyledButton } from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import style from "./UniversalActionCenterAccessor.module.scss";


export default function UniversalActionCenterAccessor(): ReactElement
{
  const [ t ] = useTranslation();

  const isMac = useMemo(() =>
  {
    return typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent || window.navigator.platform);
  }, []);

  return (
    <UnstyledButton
      className={style.accessor}
      onClick={spotlight.open}
      data-no-drag
      aria-label={t("actionsCenter.searchOrJump", "Jump to or run a command...")}
    >
      <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <IconSearch size={14} style={{ flexShrink: 0, opacity: 0.6 }}/>
        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
          {t("actionsCenter.searchOrJump", "Jump to or run a command...")}
        </Text>
      </Group>
      <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
        <Kbd size="xs">{isMac ? "⌘" : "Ctrl"}</Kbd>
        <Kbd size="xs">K</Kbd>
      </Group>
    </UnstyledButton>
  );
}
