import { ReactElement } from "react";
import { Flex, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { RepositoryIdentity, RepositoryMenu, RepositoryPreviews, RepositoryStatusPill } from "../index.ts";
import style from "./RepositoryCard.module.scss";


type RepositoryCardType = {
  repository: Repository;
  imageCount?: number;
  activity?: RepositoryActivity;
  onOpen: (repository: Repository) => void;
  onViewImages?: (repository: Repository) => void;
  onOpenInNewWindow?: (repository: Repository) => void;
  onEdit?: (repository: Repository) => void;
  onDeleted: () => void;
};

export default function RepositoryCard({
  repository,
  imageCount,
  activity,
  onOpen,
  onViewImages,
  onOpenInNewWindow,
  onEdit,
  onDeleted
}: RepositoryCardType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <UnstyledButton
      className={style.card}
      w="100%"
      p={12}
      bd="1px solid var(--mantine-color-gray-2)"
      bdrs="md"
      onClick={() => onOpen(repository)}
    >
      <Flex direction="column" gap={10}>
        <RepositoryIdentity
          repository={repository}
          menu={
            <RepositoryMenu
              repository={repository}
              onViewImages={onViewImages !== undefined ? () => onViewImages(repository) : undefined}
              onOpenInNewWindow={onOpenInNewWindow !== undefined ? () => onOpenInNewWindow(repository) : undefined}
              onEdit={onEdit}
              onDeleted={onDeleted}
            />
          }
        />
        <RepositoryPreviews repositoryId={repository.id} count={3} edge={64}/>
        <Flex justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            {imageCount !== undefined ? t("repositoryScreen.imagesCount", { count: imageCount }) : ""}
          </Text>
          <RepositoryStatusPill repository={repository} activity={activity}/>
        </Flex>
      </Flex>
    </UnstyledButton>
  );
}
