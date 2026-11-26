import type { MouseEvent, ReactElement } from "react";
import { Button, Divider, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Common } from "app/components";

import {
  ACTION_CENTER_SCOPE_ICONS,
  ACTION_CENTER_SCOPE_LABEL_KEYS,
  ACTION_CENTER_SCOPES,
  type ActionCenterScopeType
} from "../../actionCenterRanking.ts";


type ActionCenterScopeBarPropsType =
  {
    readonly activeScope: ActionCenterScopeType;
    readonly countsByScope: Readonly<Record<ActionCenterScopeType, number>>;
    readonly hasQuery: boolean;
    readonly onSelectScope: (scope: ActionCenterScopeType) => void;
  };

export default function ActionCenterScopeBar({
  activeScope,
  countsByScope,
  hasQuery,
  onSelectScope
}: ActionCenterScopeBarPropsType): ReactElement
{
  const [ t ] = useTranslation();

  function handleMouseDown(event: MouseEvent<HTMLButtonElement>): void
  {
    event.preventDefault();
  }

  return (
    <Stack gap={0} flex="0 0 auto">
      <ScrollArea scrollbars="x" type="never">
        <Group gap={4} px="sm" py={6} wrap="nowrap">
          {ACTION_CENTER_SCOPES.map(scope =>
          {
            const isActive = activeScope === scope;
            const count = countsByScope[scope];
            const isDimmed = hasQuery === true && count === 0 && isActive === false;
            const ScopeIcon = ACTION_CENTER_SCOPE_ICONS[scope];

            return (
              <Button
                key={scope}
                size="compact-xs"
                radius="sm"
                variant={isActive === true ? "light" : "subtle"}
                color={isActive === true ? "blue" : "gray"}
                fw={isActive === true ? 600 : 500}
                tabIndex={-1}
                px={7}
                opacity={isDimmed === true ? 0.45 : 1}
                flex="0 0 auto"
                onMouseDown={handleMouseDown}
                onClick={(): void =>
                {
                  onSelectScope(scope);
                }}
              >
                <Group gap={4} wrap="nowrap">
                  <ScopeIcon size={13} stroke={Common.IconStrokeSize}/>
                  <span>{t(ACTION_CENTER_SCOPE_LABEL_KEYS[scope])}</span>
                  {hasQuery === true && (
                    <Text
                      component="span"
                      size="xs"
                      c={isActive === true ? "blue" : "dimmed"}
                      fw={500}
                    >
                      {count}
                    </Text>
                  )}
                </Group>
              </Button>
            );
          })}
        </Group>
      </ScrollArea>
      <Divider/>
    </Stack>
  );
}
