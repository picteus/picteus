import { ReactElement } from "react";
import { Button, Flex, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconLayoutGrid, IconList, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { RepositoriesViewModeType } from "types";
import { Common } from "app/components";


type RepositoriesHeaderType = {
  repositoriesCount: number;
  viewMode: RepositoriesViewModeType;
  onViewModeChange: (viewMode: RepositoriesViewModeType) => void;
  onAddRepository: () => void;
};

export default function RepositoriesHeader({
  repositoriesCount,
  viewMode,
  onViewModeChange,
  onAddRepository
}: RepositoriesHeaderType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <Flex justify="space-between" align="center" gap="md">
      <Stack gap={4}>
        <Title>{t("repositoryScreen.title")}</Title>
        <Flex gap={6} align="center">
          <Text size="sm" c="dimmed">{t("repositoryScreen.repositoriesCount", { count: repositoriesCount })}</Text>
          <Text size="sm" c="dimmed">·</Text>
          <Text size="sm" c="dimmed">{t("repositoryScreen.subtitle")}</Text>
        </Flex>
      </Stack>
      <Flex gap="sm" align="center">
        <SegmentedControl
          value={viewMode}
          onChange={(value) => onViewModeChange(value as RepositoriesViewModeType)}
          data={[
            {
              value: "cards",
              label: (
                <Flex gap={6} align="center">
                  <IconLayoutGrid size={16} stroke={Common.IconStrokeSize}/>
                  <Text size="sm">{t("repositoryScreen.view.cards")}</Text>
                </Flex>
              )
            },
            {
              value: "list",
              label: (
                <Flex gap={6} align="center">
                  <IconList size={16} stroke={Common.IconStrokeSize}/>
                  <Text size="sm">{t("repositoryScreen.view.list")}</Text>
                </Flex>
              )
            }
          ]}
        />
        <Button
          leftSection={<IconPlus size={20}/>}
          onClick={onAddRepository}
        >
          {t("repositoryScreen.addRepository")}
        </Button>
      </Flex>
    </Flex>
  );
}
