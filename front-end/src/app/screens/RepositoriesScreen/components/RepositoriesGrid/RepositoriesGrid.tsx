import { ReactElement, useMemo } from "react";
import { SimpleGrid } from "@mantine/core";

import { Repository, RepositoryActivity } from "@picteus/ws-client";

import { RepositoryCard } from "../index.ts";


type RepositoriesGridType = {
  repositories: Repository[];
  imageCounts: Record<string, number>;
  activities: Map<string, RepositoryActivity>;
  onOpen: (repository: Repository) => void;
  onViewImages?: (repository: Repository) => void;
  onOpenInNewWindow?: (repository: Repository) => void;
  onEdit?: (repository: Repository) => void;
  onDeleted: () => void;
};

export default function RepositoriesGrid({
  repositories,
  imageCounts,
  activities,
  onOpen,
  onViewImages,
  onOpenInNewWindow,
  onEdit,
  onDeleted
}: RepositoriesGridType): ReactElement
{
  const renderedCards = useMemo(
    () => repositories.map((repository) => (
      <RepositoryCard
        key={repository.id}
        repository={repository}
        imageCount={imageCounts[repository.id]}
        activity={activities.get(repository.id)}
        onOpen={onOpen}
        onViewImages={onViewImages}
        onOpenInNewWindow={onOpenInNewWindow}
        onEdit={onEdit}
        onDeleted={onDeleted}
      />
    )),
    [ repositories, imageCounts, activities, onOpen, onViewImages, onOpenInNewWindow, onEdit, onDeleted ]
  );

  return (
    <SimpleGrid minColWidth={248} spacing="md" verticalSpacing="md">
      {renderedCards}
    </SimpleGrid>
  );
}
