import { ReactElement } from "react";
import { Flex, Skeleton, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useRepositorySummaries } from "app/hooks";
import { ImageThumbnail } from "app/components";


type RepositoryPreviewsType = {
  repositoryId: string;
  count: number;
  edge: number;
};

export default function RepositoryPreviews({ repositoryId, count, edge }: RepositoryPreviewsType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: summaries, isLoading } = useRepositorySummaries(repositoryId, count);

  const previews = summaries?.items ?? [];

  if (isLoading === true)
  {
    return (
      <Flex gap={4} wrap="wrap">
        {Array.from({ length: count }, (_, index) => <Skeleton key={index} w={edge} h={edge} radius="sm"/>)}
      </Flex>
    );
  }

  if (previews.length === 0)
  {
    return (
      <Flex h={edge} align="center" justify="center" bg="gray.1" bdrs="sm" ta="center">
        <Text size="xs" c="dimmed">{t("repositoryScreen.noImagesIndexed")}</Text>
      </Flex>
    );
  }

  return (
    <Flex gap={4} wrap="wrap">
      {previews.map((image) => <ImageThumbnail key={image.id} imageOrUrl={image} edge={edge}/>)}
    </Flex>
  );
}
