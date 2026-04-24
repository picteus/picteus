import React from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconEdit, IconReload, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { notifyApiCallI18nError, notifySuccess } from "utils";
import { useConfirmAction } from "app/hooks";
import { RepositoriesService } from "app/services";
import { ExternalLink } from "app/components";


interface RepositoryActionsType {
  repository: Repository;
  onEdit?: (repository: Repository) => void;
  onDeleted: () => void;
}

export default function RepositoryActions({
  repository,
  onEdit,
  onDeleted,
}: RepositoryActionsType) {
  const [t] = useTranslation();
  const confirmAction = useConfirmAction();

  async function handleOnSynchronizeRepository(id: string) {
    await RepositoriesService.synchronize({ id });
  }

  async function handleOnDeleteRepository(id: string) {
    try {
      await RepositoriesService.remove({ id });
      notifySuccess(t("repositoryScreen.successRemove"));
      onDeleted();
    } catch (error) {
      notifyApiCallI18nError(error, "repositoryScreen.errorRemove");
    }
  }

  return (
    <Flex gap={10} onClick={(event) => event.stopPropagation()}>
      <ExternalLink url={repository.url} type="action" />
      {onEdit && <Tooltip label={t("button.edit")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => onEdit(repository)}
        >
          <IconEdit size={20} stroke={1} />
        </ActionIcon>
      </Tooltip>}
      <Tooltip label={t("button.synchronize")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => handleOnSynchronizeRepository(repository.id)}
        >
          <IconReload size={20} stroke={1} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("button.delete")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() =>
            confirmAction(() => handleOnDeleteRepository(repository.id), {
              title: t("repositoryScreen.confirmDeleteTitle"),
              message: t("repositoryScreen.confirmDeleteMessage", {
                name: repository.name,
              }),
            })
          }
        >
          <IconTrash color="red" size={20} stroke={1} />
        </ActionIcon>
      </Tooltip>
    </Flex>
  );
}
