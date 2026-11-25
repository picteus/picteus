import { type ReactElement } from "react";
import { Center, Flex, Skeleton, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { RepositoryMode } from "@picteus/ws-client";

import { useRepository, useRepositorySummaries } from "app/hooks";
import { ImageThumbnailStrip } from "app/components";


type RepositoryPreviewsType = {
  readonly repositoryId: string;
  readonly count: number;
  readonly edge: number;
};

export default function RepositoryPreviews({ repositoryId, count, edge }: RepositoryPreviewsType): ReactElement
{
  const [ t ] = useTranslation();
  const { data: repository } = useRepository(repositoryId);
  const isDisabled = repository?.mode === RepositoryMode.Disabled;
  const { data: summaries, isLoading } = useRepositorySummaries(repositoryId, count, !isDisabled);

  function renderPlaceholder(message: string): ReactElement
  {
    return (
      <Center
        h={edge}
        px="xs"
        bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
        bdrs="sm"
        ta="center"
      >
        <Text size="xs" c="dimmed">{message}</Text>
      </Center>
    );
  }

  if (isDisabled === true)
  {
    return renderPlaceholder(t("repositoryScreen.disabledPreview"));
  }

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
    return renderPlaceholder(t("repositoryScreen.noImagesIndexed"));
  }

  return (
    <ImageThumbnailStrip images={previews} edge={edge} gap={4} wrap={true}/>
  );
}
