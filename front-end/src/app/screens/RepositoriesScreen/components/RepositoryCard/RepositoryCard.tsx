import { ReactElement } from "react";
import { Flex, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { InteractiveCard, RepositoryIdentity } from "app/components";
import { RepositoryMenu, RepositoryPreviews, RepositoryStatusPill } from "..";


type RepositoryCardType = {
  repository: Repository;
  imageCount: number | undefined;
  activity: RepositoryActivity | undefined;
  onOpen: (repository: Repository) => void;
  onViewImages: (repository: Repository) => void;
  onOpenInNewWindow: (repository: Repository) => void;
  onEdit: (repository: Repository) => void;
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
    <InteractiveCard p={12} onClick={() => onOpen(repository)}>
      <Flex direction="column" gap={10}>
        <RepositoryIdentity
          repository={repository}
          footer={
            <RepositoryMenu
              repository={repository}
              onViewImages={() => onViewImages(repository)}
              onOpenInNewWindow={() => onOpenInNewWindow(repository)}
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
    </InteractiveCard>
  );
}
