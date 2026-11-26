import type { ReactElement } from "react";
import { Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Common } from "app/components";

import {
  ACTION_CENTER_SCOPE_ICONS,
  ACTION_CENTER_SCOPE_LABEL_KEYS,
  type ActionCenterSectionScopeType
} from "../../actionCenterRanking.ts";


type ActionCenterSectionBadgePropsType =
  {
    readonly section: ActionCenterSectionScopeType;
  };

export default function ActionCenterSectionBadge({
  section
}: ActionCenterSectionBadgePropsType): ReactElement
{
  const [ t ] = useTranslation();
  const SectionIcon = ACTION_CENTER_SCOPE_ICONS[section];

  return (
    <Badge
      size="xs"
      variant="light"
      color="gray"
      fw={500}
      leftSection={<SectionIcon size={11} stroke={Common.IconStrokeSize}/>}
    >
      {t(ACTION_CENTER_SCOPE_LABEL_KEYS[section])}
    </Badge>
  );
}
