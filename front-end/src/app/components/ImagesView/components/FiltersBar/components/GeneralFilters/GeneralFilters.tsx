import React from "react";
import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { LocalFiltersType } from "types";
import { FiltersService } from "app/services";
import { FilterSelect } from "../../..";


type GeneralFiltersType = {
  repositories: Repository[];
  filters: LocalFiltersType;
  onChangeFilter: (key: string, value?: string []) => void;
};

export default function GeneralFilters({ repositories, filters, onChangeFilter }: GeneralFiltersType)
{
  const [t] = useTranslation();

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
        <FilterSelect
          label={t("field.repositories")}
          selectedValues={filters.repositories ?? []}
          options={repositories.map((repository) => ({
            value: repository.id,
            label: repository.name
          }))}
          onChange={(values: string[]) => onChangeFilter("repositories", values)}
        />
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
