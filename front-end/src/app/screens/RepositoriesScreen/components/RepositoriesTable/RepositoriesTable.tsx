import { ReactElement, useMemo } from "react";
import { Table, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { RepositoriesSortCriterionType } from "types";
import { FormatedDate, SortableTableHeader, TableHeaderCell } from "app/components";
import { RepositoryIdentity, RepositoryMenu, RepositoryPreviews, RepositoryStatusPill } from "..";


type RepositoriesTableType = {
  repositories: Repository[];
  imageCounts: Record<string, number>;
  activities: Map<string, RepositoryActivity>;
  sortCriterion: RepositoriesSortCriterionType;
  isSortAscending: boolean;
  onSort: (criterion: RepositoriesSortCriterionType) => void;
  onOpen: (repository: Repository) => void;
  onViewImages: (repository: Repository) => void;
  onOpenInNewWindow: (repository: Repository) => void;
  onEdit: (repository: Repository) => void;
  onDeleted: () => void;
};

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
    () => repositories.map(repository => (
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
        <Table.Td onClick={event => event.stopPropagation()}>
          <RepositoryMenu
            repository={repository}
            onViewImages={() => onViewImages(repository)}
            onOpenInNewWindow={() => onOpenInNewWindow(repository)}
            onEdit={onEdit}
            onDeleted={onDeleted}
          />
        </Table.Td>
      </Table.Tr>
    )),
    [ repositories, imageCounts, activities, onOpen, onViewImages, onOpenInNewWindow, onEdit, onDeleted, t ]
  );

  return (
    <Table highlightOnHover horizontalSpacing={12}>
      <Table.Thead>
        <Table.Tr>
          <SortableTableHeader
            criterion="name"
            label={t("field.name")}
            activeCriterion={sortCriterion}
            isSortAscending={isSortAscending}
            onSort={onSort}
          />
          <TableHeaderCell>{t("repositoryScreen.table.recent")}</TableHeaderCell>
          <SortableTableHeader
            criterion="imageCount"
            label={t("field.imageCount")}
            activeCriterion={sortCriterion}
            isSortAscending={isSortAscending}
            onSort={onSort}
          />
          <SortableTableHeader
            criterion="createdOn"
            label={t("field.createdOn")}
            activeCriterion={sortCriterion}
            isSortAscending={isSortAscending}
            onSort={onSort}
          />
          <TableHeaderCell>{t("field.state")}</TableHeaderCell>
          <TableHeaderCell/>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{renderedRows}</Table.Tbody>
    </Table>
  );
}
