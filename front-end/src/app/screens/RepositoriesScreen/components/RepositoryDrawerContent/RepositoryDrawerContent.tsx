import { ReactElement, ReactNode } from "react";
import { Button, CopyButton, Divider, Flex, Stack, Text } from "@mantine/core";
import { IconAppWindow, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository, RepositoryActivity, RepositoryMode } from "@picteus/ws-client";

import { removeFilePrefixFromUrl } from "utils";
import { useOpenExplorer } from "app/hooks";
import { ActionLink, Common, CopyText, FormatedDate, NoValue } from "app/components";
import { REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED } from "../../RepositoriesConstants.ts";
import { RepositoryPreviews, RepositoryStatusPill } from "..";


const DRAWER_PREVIEWS_COUNT = 6;
const DRAWER_PREVIEW_EDGE = 138;
const DETAIL_LABEL_WIDTH = 96;


type RepositoryDrawerContentType = {
  repository: Repository;
  activity?: RepositoryActivity;
  imageCount?: number;
  onViewImages?: () => void;
  onOpenInNewWindow?: () => void;
};

export default function RepositoryDrawerContent({
  repository,
  activity,
  imageCount,
  onViewImages,
  onOpenInNewWindow
}: RepositoryDrawerContentType): ReactElement
{
  const [ t ] = useTranslation();
  const openExplorer = useOpenExplorer();

  const isDisabled = repository.mode === RepositoryMode.Disabled;
  const path = removeFilePrefixFromUrl(repository.url) ?? repository.url;
  const hasActions = onViewImages !== undefined || (REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED && onOpenInNewWindow !== undefined);

  function renderDetailRow(label: string, value: ReactNode): ReactElement
  {
    return (
      <Flex gap="xs" align="center">
        <Text size="xs" c="dimmed" w={DETAIL_LABEL_WIDTH} flex="0 0 auto">{label}</Text>
        {value}
      </Flex>
    );
  }

  return (
    <Stack gap="md">
      <Flex gap="xs" align="center">
        <RepositoryStatusPill repository={repository} activity={activity}/>
        {!isDisabled && imageCount !== undefined && (
          <Text size="sm" c="dimmed">{t("repositoryScreen.imagesCount", { count: imageCount })}</Text>
        )}
      </Flex>
      {hasActions === true && (
        <Stack gap="xs">
          {onViewImages !== undefined && (
            <Button
              disabled={isDisabled}
              leftSection={<IconPhoto size={16} stroke={Common.IconStrokeSize}/>}
              onClick={onViewImages}
            >
              {t("repositoryScreen.drawer.viewImages")}
            </Button>
          )}
          {REPOSITORY_OPEN_IN_NEW_WINDOW_ENABLED && onOpenInNewWindow !== undefined && (
            <Button
              disabled={isDisabled}
              variant="default"
              leftSection={<IconAppWindow size={16} stroke={Common.IconStrokeSize}/>}
              onClick={onOpenInNewWindow}
            >
              {t("repositoryScreen.drawer.openInNewWindow")}
            </Button>
          )}
        </Stack>
      )}
      <Flex justify="space-between" align="center">
        <Text size="sm" fw={600}>{t("repositoryScreen.drawer.recentImages")}</Text>
        {!isDisabled && onViewImages !== undefined && imageCount !== undefined && (
          <ActionLink size="xs" onClick={onViewImages}>
            {t("repositoryScreen.drawer.viewAll", { number: imageCount })}
          </ActionLink>
        )}
      </Flex>
      <RepositoryPreviews repositoryId={repository.id} count={DRAWER_PREVIEWS_COUNT} edge={DRAWER_PREVIEW_EDGE}/>
      <Divider/>
      <Stack gap={6}>
        <Text size="xs" fw={500} c="dimmed">{t("repositoryScreen.drawer.folder")}</Text>
        <Text size="sm">{path}</Text>
        <Flex gap="md" align="center">
          <ActionLink onClick={() => void openExplorer(path)}>
            {t("repositoryScreen.drawer.showInFinder")}
          </ActionLink>
          <CopyButton value={path} timeout={1200}>
            {({ copy }) => (
              <ActionLink onClick={copy}>
                {t("repositoryScreen.drawer.copyPath")}
              </ActionLink>
            )}
          </CopyButton>
        </Flex>
      </Stack>
      <Stack gap={6}>
        <Text size="xs" fw={500} c="dimmed">{t("field.comment")}</Text>
        {repository.comment ? <Text size="sm">{repository.comment}</Text> : <NoValue/>}
      </Stack>
      <Stack gap="xs">
        {renderDetailRow(
          t("field.id"),
          <CopyText value={repository.id} inline={true}><Text size="sm">{repository.id}</Text></CopyText>
        )}
        {renderDetailRow(
          t("field.createdOn"),
          <Text size="sm"><FormatedDate timestamp={repository.creationDate}/></Text>
        )}
        {renderDetailRow(
          t("field.modifiedOn"),
          <Text size="sm"><FormatedDate timestamp={repository.modificationDate}/></Text>
        )}
      </Stack>
    </Stack>
  );
}
