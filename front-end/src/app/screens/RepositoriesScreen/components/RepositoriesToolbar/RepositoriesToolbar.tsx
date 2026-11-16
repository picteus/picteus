import { ReactElement } from "react";
import { ActionIcon, Box, Button, Flex, Menu, SegmentedControl, TextInput, Tooltip } from "@mantine/core";
import {
  IconCalendarPlus,
  IconCheck,
  IconChevronDown,
  IconLetterCase,
  IconPhoto,
  IconSearch,
  IconSortAscending,
  IconSortDescending
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RepositoriesOriginFilterType, RepositoriesSortCriterionType } from "types";
import { Common } from "app/components";


type OriginCountsType = {
  all: number;
  user: number;
  extensions: number;
};

type RepositoriesToolbarType = {
  searchText: string;
  onSearchTextChange: (searchText: string) => void;
  originFilter: RepositoriesOriginFilterType;
  onOriginFilterChange: (originFilter: RepositoriesOriginFilterType) => void;
  originCounts: OriginCountsType;
  sortCriterion: RepositoriesSortCriterionType;
  isSortAscending: boolean;
  onSortCriterionChange: (criterion: RepositoriesSortCriterionType) => void;
  onSortDirectionToggle: () => void;
};

const SORT_CRITERIA: { value: RepositoriesSortCriterionType; icon: ReactElement; }[] = [
  { value: "name", icon: <IconLetterCase size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/> },
  { value: "imageCount", icon: <IconPhoto size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/> },
  { value: "createdOn", icon: <IconCalendarPlus size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/> }
];

export default function RepositoriesToolbar({
  searchText,
  onSearchTextChange,
  originFilter,
  onOriginFilterChange,
  originCounts,
  sortCriterion,
  isSortAscending,
  onSortCriterionChange,
  onSortDirectionToggle
}: RepositoriesToolbarType): ReactElement
{
  const [ t ] = useTranslation();

  const activeCriterion = SORT_CRITERIA.find((criterion) => criterion.value === sortCriterion) ?? SORT_CRITERIA[0];

  return (
    <Flex gap="md" align="center" wrap="wrap">
      <TextInput
        w={340}
        h={36}
        leftSection={<IconSearch size={16} stroke={Common.IconStrokeSize}/>}
        placeholder={t("repositoryScreen.searchPlaceholder")}
        value={searchText}
        onChange={(event) => onSearchTextChange(event.currentTarget.value)}
      />
      <SegmentedControl
        value={originFilter}
        onChange={(value) => onOriginFilterChange(value as RepositoriesOriginFilterType)}
        data={[
          { value: "all", label: t("repositoryScreen.origin.all", { number: originCounts.all }) },
          { value: "user", label: t("repositoryScreen.origin.user", { number: originCounts.user }) },
          { value: "extensions", label: t("repositoryScreen.origin.extensions", { number: originCounts.extensions }) }
        ]}
      />
      <Box flex={1}/>
      <Flex gap={6} align="center">
        <Menu shadow="md" width={200} withinPortal>
          <Menu.Target>
            <Button
              variant="default"
              leftSection={activeCriterion.icon}
              rightSection={<IconChevronDown size={16} stroke={Common.IconStrokeSize}/>}
            >
              {t(`field.${sortCriterion}`)}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {SORT_CRITERIA.map((criterion) => (
              <Menu.Item
                key={criterion.value}
                leftSection={criterion.icon}
                rightSection={sortCriterion === criterion.value ?
                  <IconCheck size={16} stroke={Common.IconStrokeSize}/> : undefined}
                onClick={() => onSortCriterionChange(criterion.value)}
              >
                {t(`field.${criterion.value}`)}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Tooltip label={isSortAscending === true ? t("sort.ascending") : t("sort.descending")}>
          <ActionIcon variant="default" size="lg" onClick={onSortDirectionToggle}>
            {isSortAscending === true ? <IconSortAscending size={18} stroke={Common.IconStrokeSize}/> :
              <IconSortDescending size={18} stroke={Common.IconStrokeSize}/>}
          </ActionIcon>
        </Tooltip>
      </Flex>
    </Flex>
  );
}
