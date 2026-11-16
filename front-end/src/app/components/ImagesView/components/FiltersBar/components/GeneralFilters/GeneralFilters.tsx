import React from "react";
import { Badge, Box, Flex, Stack, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { LocalFiltersType } from "types";
import { FiltersService } from "app/services";
import { Common } from "app/components";
import { FilterSelect } from "..";


type GeneralFiltersType = {
  repositories: Repository[];
  filters: LocalFiltersType;
  lockedRepositoryId?: string;
  onChangeFilter: (key: string, value?: string []) => void;
};

export default function GeneralFilters({ repositories, filters, lockedRepositoryId, onChangeFilter }: GeneralFiltersType)
{
  const [ t ] = useTranslation();

  const lockedRepository = lockedRepositoryId !== undefined ? repositories.find((repository) => repository.id === lockedRepositoryId) : undefined;

  return (
    <Stack gap="md">
      <Stack gap={5}>
        <FilterSelect
          label={t("filters.searchTextIn")}
          selectedValues={filters.searchIn ?? []}
          options={FiltersService.searchInOptions}
          onChange={(values: string[]) => onChangeFilter("searchIn", values)}
        />
      </Stack>
      <Stack gap={5}>
        {lockedRepository !== undefined ? (
          <>
            <Flex align="center" gap={4}>
              <Text size="sm">{t("field.repositories")}</Text>
              <IconLock size={12} stroke={Common.IconStrokeSize} color="var(--mantine-color-dimmed)"/>
            </Flex>
            <Box bd="1px solid gray.3" bdrs="sm" p={4}>
              <Flex align="center" justify="space-between" gap="xs">
                <Badge variant="light" color="blue" radius="sm">{lockedRepository.name}</Badge>
                <IconLock size={14} stroke={Common.IconStrokeSize} color="var(--mantine-color-dimmed)"/>
              </Flex>
            </Box>
            <Text size="xs" c="dimmed">{t("repositoryScreen.imagesScreen.lockedRepositoryHint")}</Text>
          </>
        ) : (
          <FilterSelect
            label={t("field.repositories")}
            selectedValues={filters.repositories ?? []}
            options={repositories.map((repository) => ({
              value: repository.id,
              label: repository.name
            }))}
            onChange={(values: string[]) => onChangeFilter("repositories", values)}
          />
        )}
      </Stack>
      <Stack gap={5}>
        <FilterSelect
          label={t("field.formats")}
          selectedValues={filters.formats ?? []}
          options={FiltersService.formatsOptions}
          onChange={(values: string[]) => onChangeFilter("formats", values)}
        />
      </Stack>
    </Stack>
  );
}
