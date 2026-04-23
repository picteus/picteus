import React from "react";
import { Stack, Text } from "@mantine/core";
import { IconFolderOpen } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { removeFilePrefixFromUrl } from "utils";
import { ContentTitle, CopyText, EntityStatus, FieldValue, NoValue } from "app/components";


type RepositoryTopType = {
  repository: Repository;
};

export default function RepositoryTop({ repository }: RepositoryTopType) {
  const { t } = useTranslation();

  return (<>
      <ContentTitle text={t("repositoryDetail.title")} icon={{ icon: <IconFolderOpen /> }} />
      <Stack gap="md" pos="relative">
        <FieldValue name={t("field.id")} value={<CopyText size="xs" c="dimmed" text={repository.id} />} />
        <FieldValue name={t("field.url")}
                    value={<CopyText size="xs" c="dimmed" text={removeFilePrefixFromUrl(repository.url)} />} />
        <FieldValue name={t("field.name")} value={<Text size="lg" fw={500}>{repository.name}</Text>} />
        <FieldValue name={t("field.comment")}
                    value={repository.comment ? <Text>{repository.comment}</Text> : <NoValue />} />
        <FieldValue name={t("field.status")}
                    value={<EntityStatus type="repository" status={repository.status} size="sm" />} />
      </Stack>
    </>
  );
}
