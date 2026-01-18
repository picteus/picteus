import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActionIcon,
  Button,
  Flex,
  Group,
  MantineSize,
  Pill,
  Popover,
  Select,
  Space,
  Stack,
  Text,
  TextInput
} from "@mantine/core";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { ImageFormat, Repository } from "@picteus/ws-client";

import { useDebouncedCallback } from "app/hooks";
import { FiltersService, RepositoriesService, StorageService } from "app/services";
import { FilterSelect } from "app/components";
import { LocalFiltersType } from "types";

export default function FiltersBar({
  initialFilters,
  onChange,
}: {
  initialFilters: LocalFiltersType;
  onChange: (filters: LocalFiltersType) => void;
}) {
  const [t] = useTranslation();
  const [searchText, setSearchText] = useState(undefined);
  const [tagOptions, setTagOptions] = useState<{ value: string, label: string }[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [popoverOpened, setPopoverOpened] = useState(false);

  const {
    defaultFilters,
    sortByOptions,
    sortOrderOptions,
    searchInOptions,
    formatsOptions,
    computeTagsOptions,
  } = FiltersService;

  const [filters, setFilters] = useState<LocalFiltersType>(
    initialFilters
      ? { ...defaultFilters, ...initialFilters }
      : StorageService.getSearchFilters() || defaultFilters,
  );

  const debouncedSearchCallback = useDebouncedCallback(async () => {
    setFilters({
      ...filters,
      keyword: searchText,
    });
  }, 400);

  useEffect(() => {
    if (searchText !== undefined) {
      debouncedSearchCallback(searchText);
    }
  }, [searchText]);

  useEffect(() => {
    StorageService.setSearchFilters(filters);
    onChange(filters);
  }, [filters]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    async function loadTagOptions() {
      setTagOptions(await computeTagsOptions());
    }

    loadTagOptions().catch(console.error);
  }, []);

  // Removing repositories that no longer exist
  useEffect(() => {
    if (repositories.length) {
      const repositoriesStillExisting = filters.repositories?.filter(
        (repositoryId) =>
          repositories.find((repository) => repository.id === repositoryId),
      );
      setFilters({
        ...filters,
        repositories: repositoriesStillExisting,
      });
    }
  }, [repositories]);

  function load() {
    const _repositories = RepositoriesService.list();
    setRepositories(_repositories);
  }

  function handleOnClearAll() {
    setFilters(initialFilters);
  }

  function renderFiltersDropdown() {
    return (
      <Stack>
        <Group>
          <Stack gap={5}>
            <Text size="sm">{t("sort.sortBy")}</Text>
            <Select
              onChange={(value) => handleOnChangeFilter("sortBy", value)}
              value={filters.sortBy}
              placeholder={t("sort.sortByPlaceholder")}
              comboboxProps={{ withinPortal: false }}
              width={200}
              data={sortByOptions}
              allowDeselect={false}
            />
          </Stack>
          <Stack gap={5}>
            <Text size="sm">{t("sort.sortOrder")}</Text>
            <Select
              onChange={(value) => handleOnChangeFilter("sortOrder", value)}
              value={filters.sortOrder}
              placeholder={t("sort.sortOrderPlaceholder")}
              data={sortOrderOptions}
              comboboxProps={{ withinPortal: false }}
              allowDeselect={false}
            />
          </Stack>
        </Group>
        <Stack mt="xs">
          <FilterSelect
            label={t("filters.searchTextIn")}
            selectedValues={filters.searchIn}
            options={searchInOptions}
            onChange={(value: string[]) =>
              handleOnChangeFilter("searchIn", value)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.repositories")}
            selectedValues={filters.repositories}
            options={repositories.map((repository) => ({
              value: repository.id,
              label: repository.name,
            }))}
            onChange={(value: string[]) =>
              handleOnChangeFilter("repositories", value)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.formats")}
            selectedValues={filters.formats}
            options={formatsOptions}
            onChange={(value: string[]) =>
              handleOnChangeFilter("formats", value)
            }
          />
        </Stack>
        <Stack mt="xs">
          <FilterSelect
            label={t("field.tags")}
            selectedValues={filters.tags}
            options={tagOptions}
            onChange={(value: string[]) =>
              handleOnChangeFilter("tags", value)
            }
          />
        </Stack>
        <Flex justify="flex-end">
          <Button onClick={handleOnClearAll} variant="default" size={"xs"}>
            {t("button.clearAll")}
          </Button>
        </Flex>
      </Stack>
    );
  }

  function computeSortingLabelDisplay() {
    const sortBy = sortByOptions.find(
      (option) => option.value === filters.sortBy,
    );
    const sortOrder = sortOrderOptions.find(
      (option) => option.value === filters.sortOrder,
    );
    return `${t("sort.sortedBy")} "${sortBy.label}" - ${sortOrder.label}`;
  }

  function handleOnChangeFilter(filterKey: string, value?: string | string[]) {
    setFilters({
      ...filters,
      [filterKey]: value,
    });
  }

  function computeSearchInLabelDisplay() {
    if (
      searchInOptions.every((option) =>
        filters.searchIn?.includes(option.value),
      )
    ) {
      return;
    }
    return searchInOptions
      .filter((option) => filters.searchIn?.includes(option.value)) // Only selected
      .map((option) => option.label) // Map to label
      .join(", ");
  }

  const commonPillProps = {
    size: "md" as MantineSize,
    onClick: () => setPopoverOpened(true),
    withRemoveButton: true,
  };

  return (
    <div>
      <Flex gap={10} align="center">
        <TextInput
          defaultValue={filters?.keyword}
          leftSectionPointerEvents="none"
          leftSection={<IconSearch stroke={1.5} />}
          rightSection={
            <ActionIcon
              onClick={() => setSearchText("")}
              size="xs"
              variant="transparent"
              c="dimmed"
            >
              <IconX stroke={1.5} />
            </ActionIcon>
          }
          placeholder={t("field.search")}
          style={{ width: 400 }}
          onChange={(event) => setSearchText(event.target.value)}
          value={searchText}
        />
        <Popover
          width={500}
          position="bottom-start"
          withArrow
          shadow="md"
          opened={popoverOpened}
          onChange={setPopoverOpened}
        >
          <Popover.Target>
            <ActionIcon
              onClick={() =>
                popoverOpened ? setPopoverOpened(false) : setPopoverOpened(true)
              }
              size="lg"
              variant="default"
            >
              <IconFilter stroke={1.3} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>{renderFiltersDropdown()}</Popover.Dropdown>
        </Popover>
      </Flex>

      <Space h="sm" />
      <Group>
        <Pill {...commonPillProps} withRemoveButton={false}>
          {computeSortingLabelDisplay()}
        </Pill>

        {filters.searchIn?.length &&
          filters.searchIn.length !== searchInOptions.length && (
            <Pill
              size="md"
              withRemoveButton
              onRemove={() => handleOnChangeFilter("searchIn")}
            >
              {`${t("filters.searchTextIn")} : ${computeSearchInLabelDisplay()}`}
            </Pill>
          )}

        {filters.repositories?.length &&
          repositories.length !== filters.repositories?.length && (
            <Pill
              {...commonPillProps}
              onRemove={() => handleOnChangeFilter("repositories")}
            >
              {`${t("field.repositories")} : ${repositories
                .filter((r) => filters.repositories?.includes(r.id))
                .map((r) => r.name)
                .join(", ")}`}
            </Pill>
          )}
        {filters.formats?.length &&
          filters.formats?.length !==
            Object.keys(ImageFormat).length && (
            <Pill
              {...commonPillProps}
              onRemove={() => handleOnChangeFilter("formats")}
            >
              {`${t("field.formats")} : ${[...filters.formats]?.join(", ")}`}
            </Pill>
          )}
        {filters.tags?.length && (
            <Pill
              {...commonPillProps}
              onRemove={() => handleOnChangeFilter("tags")}
            >
              {`${t("field.tags")} : ${[...filters.tags]?.join(", ")}`}
            </Pill>
          )}
      </Group>
    </div>
  );
}
