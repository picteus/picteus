import React from "react";
import { Flex, Stack, Text } from "@mantine/core";
import { IconLibrary } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Collection } from "@picteus/ws-client";

import { ContentTitle, CopyText, FieldValue, NoValue } from "app/components";
import { CollectionActions } from "../index.ts";


type CollectionTopType = {
  collection: Collection;
  onEdit?: (collection: Collection) => void;
  onDeleted: () => void;
};

export default function CollectionTop({ collection, onEdit, onDeleted }: CollectionTopType) {
  const { t } = useTranslation();

  return (<>
      <ContentTitle text={t("collectionDetail.title")} icon={{ icon: <IconLibrary /> }} />
      <Stack gap="md" pos="relative">
        <FieldValue name={t("field.id")} value={<CopyText value={collection.id.toString()}>
          <Text size="xs" c="dimmed">{collection.id}</Text>
        </CopyText>} />
        <FieldValue name={t("field.name")} value={<Text size="lg" fw={500}>{collection.name}</Text>} />
        <FieldValue name={t("field.comment")}
                    value={collection.comment ? <Text>{collection.comment}</Text> : <NoValue />} />
        <Flex gap="sm" mt="lg">
          <CollectionActions
            collection={collection}
            onEdit={onEdit}
            onDeleted={onDeleted}
          />
        </Flex>
      </Stack>
    </>
  );
}
