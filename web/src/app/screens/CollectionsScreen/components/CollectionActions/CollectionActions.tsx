import React from "react";
import { ActionIcon, Flex, Tooltip } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Collection } from "@picteus/ws-client";

import { notifyApiCallI18nError, notifySuccess } from "utils";
import { useConfirmAction } from "app/hooks";
import { CollectionService } from "app/services";

interface CollectionActionsType {
  collection: Collection;
  onEdit?: (collection: Collection) => void;
  onDeleted: () => void;
}

export default function CollectionActions({
  collection,
  onEdit,
  onDeleted,
}: CollectionActionsType) {
  const [t] = useTranslation();
  const confirmAction = useConfirmAction();

  async function handleOnDeleteCollection(id: number) {
    try {
      await CollectionService.delete(id);
      notifySuccess(t("collectionsScreen.successDelete"));
      onDeleted();
    } catch (error) {
      notifyApiCallI18nError(error, "collectionsScreen.errorDelete");
    }
  }

  return (
    <Flex gap={10} onClick={(event) => event.stopPropagation()}>
      {onEdit && <Tooltip label={t("button.edit")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() => onEdit(collection)}
        >
          <IconEdit size={20} stroke={1} />
        </ActionIcon>
      </Tooltip>}
      <Tooltip label={t("button.delete")}>
        <ActionIcon
          size="md"
          variant="default"
          onClick={() =>
            confirmAction(() => handleOnDeleteCollection(collection.id), {
              title: t("collectionsScreen.confirmDeleteTitle"),
              message: t("collectionsScreen.confirmDeleteMessage", {
                name: collection.name,
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
