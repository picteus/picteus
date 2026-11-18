import { ReactElement } from "react";
import { Badge, Box } from "@mantine/core";
import { useTranslation } from "react-i18next";

import {
  Repository,
  RepositoryActivity,
  RepositoryActivityKind,
  RepositoryMode,
  RepositoryState
} from "@picteus/ws-client";


type RepositoryStatusPillType = {
  repository: Repository;
  activity?: RepositoryActivity;
};

export default function RepositoryStatusPill({ repository, activity }: RepositoryStatusPillType): ReactElement
{
  const [ t ] = useTranslation();

  let color: string;
  let i18nLabel: string;

  if (repository.available === false)
  {
    color = "gray";
    i18nLabel = "repositoryScreen.status.unavailable";
  }
  else if (repository.mode === RepositoryMode.Disabled)
  {
    color = "gray";
    i18nLabel = "repositoryScreen.status.disabled";
  }
  else if (repository.state === RepositoryState.Indexing || activity?.kind === RepositoryActivityKind.Synchronizing)
  {
    color = "yellow";
    i18nLabel = "repositoryScreen.status.indexing";
  }
  else if (repository.mode === RepositoryMode.Watching || activity?.kind === RepositoryActivityKind.Watching)
  {
    color = "blue";
    i18nLabel = "repositoryScreen.status.watching";
  }
  else
  {
    color = "green";
    i18nLabel = "repositoryScreen.status.ready";
  }

  return (
    <Badge
      color={color}
      variant="light"
      size="sm"
      leftSection={<Box w={6} h={6} bg={`var(--mantine-color-${color}-filled)`} bdrs={6}/>}
    >
      {t(i18nLabel)}
    </Badge>
  );
}
