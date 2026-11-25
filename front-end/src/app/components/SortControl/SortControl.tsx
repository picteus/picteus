import { ReactElement } from "react";
import { ActionIcon, Button, Flex, Menu, Tooltip } from "@mantine/core";
import { IconCheck, IconChevronDown, IconSortAscending, IconSortDescending } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import Common from "../Common/Common.ts";


export type SortCriterionOptionType<TCriterion extends string> = {
  readonly value: TCriterion;
  readonly label: string;
  readonly icon: ReactElement;
};

type SortControlPropsType<TCriterion extends string> = {
  readonly criteria: readonly SortCriterionOptionType<TCriterion>[];
  readonly value: TCriterion;
  readonly isAscending: boolean;
  readonly onCriterionChange: (criterion: TCriterion) => void;
  readonly onDirectionToggle: () => void;
  readonly menuWidth?: number;
};

export default function SortControl<TCriterion extends string>({
  criteria,
  value,
  isAscending,
  onCriterionChange,
  onDirectionToggle,
  menuWidth = 180
}: SortControlPropsType<TCriterion>): ReactElement
{
  const [ t ] = useTranslation();
  const activeCriterion = criteria.find(criterion => criterion.value === value) ?? criteria[0];

  return (
    <Flex gap={6} align="center">
      <Menu shadow="md" width={menuWidth} withinPortal>
        <Menu.Target>
          <Button
            variant="default"
            leftSection={activeCriterion.icon}
            rightSection={<IconChevronDown size={16} stroke={Common.IconStrokeSize}/>}
          >
            {activeCriterion.label}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {criteria.map(criterion => (
            <Menu.Item
              key={criterion.value}
              leftSection={criterion.icon}
              rightSection={value === criterion.value ? (
                <IconCheck size={16} stroke={Common.IconStrokeSize}/>
              ) : undefined}
              onClick={() => onCriterionChange(criterion.value)}
            >
              {criterion.label}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <Tooltip label={isAscending === true ? t("sort.ascending") : t("sort.descending")}>
        <ActionIcon
          variant="default"
          size="lg"
          onClick={onDirectionToggle}
        >
          {isAscending === true ? (
            <IconSortAscending size={18} stroke={Common.IconStrokeSize}/>
          ) : (
            <IconSortDescending size={18} stroke={Common.IconStrokeSize}/>
          )}
        </ActionIcon>
      </Tooltip>
    </Flex>
  );
}
