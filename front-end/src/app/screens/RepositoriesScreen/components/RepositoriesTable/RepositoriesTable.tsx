import { ReactElement, useMemo } from "react";
import { Flex, Table, Text, UnstyledButton } from "@mantine/core";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { RepositoriesSortCriterionType } from "types";
import { FormatedDate } from "app/components";
import { RepositoryIdentity, RepositoryMenu, RepositoryPreviews, RepositoryStatusPill } from "../index.ts";


type RepositoriesTableType = {
  repositories: Repository[];
  imageCounts: Record<string, number>;
  activities: Map<string, RepositoryActivity>;
  sortCriterion: RepositoriesSortCriterionType;
  isSortAscending: boolean;
  onSort: (criterion: RepositoriesSortCriterionType) => void;
  onOpen: (repository: Repository) => void;
  onViewImages?: (repository: Repository) => void;
  onOpenInNewWindow?: (repository: Repository) => void;
  onEdit?: (repository: Repository) => void;
  onDeleted: () => void;
};

type SortableHeaderType = {
  criterion: RepositoriesSortCriterionType;
  label: string;
  activeCriterion: RepositoriesSortCriterionType;
  isSortAscending: boolean;
  onSort: (criterion: RepositoriesSortCriterionType) => void;
};

function SortableHeader({ criterion, label, activeCriterion, isSortAscending, onSort }: SortableHeaderType): ReactElement
{
  const isActive = activeCriterion === criterion;
  return (
    <Table.Th>
      <UnstyledButton onClick={() => onSort(criterion)}>
        <Flex gap={4} align="center">
          <Text size="sm" fw={isActive === true ? 600 : 400}>{label}</Text>
          {isActive === true && (isSortAscending === true ? <IconArrowUp size={14}/> : <IconArrowDown size={14}/>)}
        </Flex>
      </UnstyledButton>
    </Table.Th>
  );
}

export default function RepositoriesTable({
  repositories,
  imageCounts,
  activities,
  sortCriterion,
  isSortAscending,
  onSort,
  onOpen,
  onViewImages,
  onOpenInNewWindow,
  onEdit,
  onDeleted
}: RepositoriesTableType): ReactElement
{
  const [ t ] = useTranslation();

  const renderedRows = useMemo(
    () => repositories.map((repository) => (
      <Table.Tr
        key={repository.id}
        onClick={() => onOpen(repository)}
        style={{ cursor: "pointer" }}
      >
        <Table.Td>
          <RepositoryIdentity repository={repository}/>
        </Table.Td>
        <Table.Td>
          <RepositoryPreviews repositoryId={repository.id} count={3} edge={40}/>
        </Table.Td>
        <Table.Td>
          <Text size="sm">
            {imageCounts[repository.id] !== undefined ? t("repositoryScreen.imagesCount", { count: imageCounts[repository.id] }) : ""}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm"><FormatedDate timestamp={repository.creationDate}/></Text>
        </Table.Td>
        <Table.Td>
          <RepositoryStatusPill repository={repository} activity={activities.get(repository.id)}/>
        </Table.Td>
        <Table.Td onClick={(event) => event.stopPropagation()}>
          <RepositoryMenu
            repository={repository}
            onViewImages={onViewImages !== undefined ? () => onViewImages(repository) : undefined}
            onOpenInNewWindow={onOpenInNewWindow !== undefined ? () => onOpenInNewWindow(repository) : undefined}
            onEdit={onEdit}
            onDeleted={onDeleted}
          />
        </Table.Td>
      </Table.Tr>
    )),
    [ repositories, imageCounts, activities, onOpen, onViewImages, onOpenInNewWindow, onEdit, onDeleted, t ]
  );

  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <SortableHeader criterion="name" label={t("field.name")} activeCriterion={sortCriterion} isSortAscending={isSortAscending} onSort={onSort}/>
          <Table.Th>{t("repositoryScreen.table.recent")}</Table.Th>
          <SortableHeader criterion="imageCount" label={t("field.imageCount")} activeCriterion={sortCriterion} isSortAscending={isSortAscending} onSort={onSort}/>
          <SortableHeader criterion="createdOn" label={t("field.createdOn")} activeCriterion={sortCriterion} isSortAscending={isSortAscending} onSort={onSort}/>
          <Table.Th>{t("field.state")}</Table.Th>
          <Table.Th/>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{renderedRows}</Table.Tbody>
    </Table>
  );
}
