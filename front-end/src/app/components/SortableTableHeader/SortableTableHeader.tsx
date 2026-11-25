import { ReactElement } from "react";
import { Flex, Text, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconSelector } from "@tabler/icons-react";

import TableHeaderCell from "../TableHeaderCell/TableHeaderCell.tsx";


type SortableTableHeaderPropsType<TCriterion extends string> = {
  readonly criterion: TCriterion;
  readonly label: string;
  readonly activeCriterion: TCriterion;
  readonly isSortAscending: boolean;
  readonly onSort: (criterion: TCriterion) => void;
};

export default function SortableTableHeader<TCriterion extends string>({
  criterion,
  label,
  activeCriterion,
  isSortAscending,
  onSort
}: SortableTableHeaderPropsType<TCriterion>): ReactElement
{
  const isActive = activeCriterion === criterion;

  return (
    <TableHeaderCell>
      <UnstyledButton display="flex" onClick={() => onSort(criterion)}>
        <Flex gap={4} align="center">
          <Text fz={13} fw={500} c={isActive === true ? "var(--mantine-color-text)" : "dimmed"}>
            {label}
          </Text>
          <Flex
            align="center"
            c={isActive === true ? "var(--mantine-color-text)" : "light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))"}
          >
            {isActive === true ? (
              isSortAscending === true ? <IconArrowUp size={12}/> : <IconArrowDown size={12}/>
            ) : (
              <IconSelector size={12}/>
            )}
          </Flex>
        </Flex>
      </UnstyledButton>
    </TableHeaderCell>
  );
}
