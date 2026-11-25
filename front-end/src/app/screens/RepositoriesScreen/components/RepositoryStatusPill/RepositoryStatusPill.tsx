import { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import {
  Repository,
  RepositoryActivity,
  RepositoryActivityKind,
  RepositoryMode,
  RepositoryState
} from "@picteus/ws-client";

import { StatusPill } from "app/components";


type RepositoryStatusPillType = {
  repository: Repository;
  activity: RepositoryActivity | undefined;
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
    <StatusPill
      label={t(i18nLabel)}
      color={color}
    />
  );
}
