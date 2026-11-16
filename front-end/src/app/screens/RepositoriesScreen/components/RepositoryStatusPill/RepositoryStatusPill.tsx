import { ReactElement } from "react";
import { Badge, Box } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity, RepositoryActivityKind, RepositoryState } from "@picteus/ws-client";


type RepositoryStatusPillType = {
  repository: Repository;
  activity?: RepositoryActivity;
};

export default function RepositoryStatusPill({ repository, activity }: RepositoryStatusPillType): ReactElement
{
  const [ t ] = useTranslation();

  const isIndexing = repository.state === RepositoryState.Indexing ||
    repository.state === RepositoryState.UnavailableIndexing ||
    activity?.kind === RepositoryActivityKind.Synchronizing;
  const isUnavailable = isIndexing === false && repository.state === RepositoryState.Unavailable;

  const color = isIndexing === true ? "yellow" : (isUnavailable === true ? "gray" : "green");
  const label = isIndexing === true ? t("repositoryScreen.status.indexing") : (isUnavailable === true ? t("repositoryScreen.status.unavailable") : t("repositoryScreen.status.ready"));

  return (
    <Badge
      color={color}
      variant="light"
      size="sm"
      leftSection={<Box w={6} h={6} bg={`var(--mantine-color-${color}-filled)`} bdrs={6}/>}
    >
      {label}
    </Badge>
  );
}
