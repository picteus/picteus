import React, { type ReactElement, useMemo } from "react";
import { Group, Kbd, type MantineSize } from "@mantine/core";


function formatShortcutKey(key: string, isMac: boolean): string
{
  const normalizedKey = key.trim().toLowerCase();

  if (normalizedKey === "mod")
  {
    return isMac ? "⌘" : "Ctrl";
  }
  if (normalizedKey === "cmd" || normalizedKey === "meta")
  {
    return isMac ? "⌘" : "Win";
  }
  if (normalizedKey === "ctrl" || normalizedKey === "control")
  {
    return isMac ? "⌃" : "Ctrl";
  }
  if (normalizedKey === "alt" || normalizedKey === "option" || normalizedKey === "opt")
  {
    return isMac ? "⌥" : "Alt";
  }
  if (normalizedKey === "shift")
  {
    return isMac ? "⇧" : "Shift";
  }
  if (normalizedKey === "enter" || normalizedKey === "return")
  {
    return isMac ? "↵" : "Enter";
  }
  if (normalizedKey === "escape" || normalizedKey === "esc")
  {
    return "Esc";
  }
  if (normalizedKey === "backspace")
  {
    return isMac ? "⌫" : "Backspace";
  }
  if (normalizedKey === "delete" || normalizedKey === "del")
  {
    return "Del";
  }
  if (normalizedKey === "tab")
  {
    return "Tab";
  }
  if (normalizedKey === "space")
  {
    return "Space";
  }
  if (normalizedKey === "arrowup" || normalizedKey === "up")
  {
    return "↑";
  }
  if (normalizedKey === "arrowdown" || normalizedKey === "down")
  {
    return "↓";
  }
  if (normalizedKey === "arrowleft" || normalizedKey === "left")
  {
    return "←";
  }
  if (normalizedKey === "arrowright" || normalizedKey === "right")
  {
    return "→";
  }
  return normalizedKey.toUpperCase();
}

function parseShortcutKeys(combo: string): string[]
{
  return combo.split("+").map((part) => part.trim()).filter((part) => part.length > 0);
}

export type ShortcutBadgePropsType =
  {
    readonly combo: string;
    readonly size: MantineSize;
  };

export default function ShortcutBadge({
  combo,
  size
}: ShortcutBadgePropsType): ReactElement
{
  const isMac = useMemo<boolean>(() =>
  {
    return typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent || window.navigator.platform);
  }, []);

  const keys = useMemo<string[]>(() => parseShortcutKeys(combo), [ combo ]);

  return (
    <Group
      gap={2}
      wrap="nowrap"
      display="inline-flex"
    >
      {keys.map((key, keyIndex) =>
      {
        const formattedKey = formatShortcutKey(key, isMac);
        return (
          <React.Fragment key={`${key}-${keyIndex}`}>
            <Kbd size={size}>{formattedKey}</Kbd>
          </React.Fragment>
        );
      })}
    </Group>
  );
}
