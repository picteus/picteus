import React, { useEffect, useState } from "react";
import { Button, Flex, Group, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageFeatureFormat, ImageFeatureType, Repository } from "@picteus/ws-client";

import { LocalFiltersType } from "types";
import { capitalizeText, notifyErrorWithError } from "utils";
import { FeaturesNamesOption, FiltersService } from "app/services";
import { FilterSelect } from "app/components";

const {
  sortByOptions,
  sortOrderOptions,
  searchInOptions,
  formatsOptions,
  computeFeaturesNamesOptions,
  computeTagsOptions
} = FiltersService;


type FiltersType = {
  repositories: Repository[];
  localFilters: LocalFiltersType;
  onChangeFilter: (key: string, value?: (string | string[] | FeaturesNamesOption[])) => void;
  handleOnClearAll: () => void;
};

export default function Filters({ repositories, localFilters, onChangeFilter, handleOnClearAll }: FiltersType) {
  const [t] = useTranslation();
  const [featuresOptions, setFeaturesOptions] = useState<FeaturesNamesOption[]>([]);
  const [tagsOptions, setTagsOptions] = useState<{ value: string, label: string }[]>([]);

  useEffect(() => {
    async function load() {
      {
        const options = await computeFeaturesNamesOptions();
        const builtInOptions: FeaturesNamesOption[] = [];
        const types: ImageFeatureType[] = [ImageFeatureType.Recipe, ImageFeatureType.Annotation, ImageFeatureType.Comment, ImageFeatureType.Description, ImageFeatureType.Caption];
        const formats: ImageFeatureFormat[] = [ImageFeatureFormat.Json, ImageFeatureFormat.Markdown, ImageFeatureFormat.Html, ImageFeatureFormat.Xml, ImageFeatureFormat.String];
        for (const type of types) {
          for (const format of formats) {
            builtInOptions.push({
              value: type,
              category: capitalizeText(type),
              format: format,
              type: type
            });
          }
        }
        const allOptions = builtInOptions.concat(...options);
        setFeaturesOptions(allOptions);
      }
      setTagsOptions(await computeTagsOptions());
    }

    load().catch(notifyErrorWithError);
  }, []);

  return (<Stack>
    <Group>
      <Stack gap={5}>
        <Text size="sm">{t("sort.sortBy")}</Text>
        <Select
          value={localFilters.sortBy}
          placeholder={t("sort.sortByPlaceholder")}
          comboboxProps={{ withinPortal: false }}
          width={200}
          data={sortByOptions}
          allowDeselect={false}
          onChange={(value) => onChangeFilter("sortBy", value)}
        />
      </Stack>
      <Stack gap={5}>
        <Text size="sm">{t("sort.sortOrder")}</Text>
        <Select
          value={localFilters.sortOrder}
          placeholder={t("sort.sortOrderPlaceholder")}
          data={sortOrderOptions}
          comboboxProps={{ withinPortal: false }}
          allowDeselect={false}
          onChange={(value) => onChangeFilter("sortOrder", value)}
        />
      </Stack>
    </Group>
    <Stack mt="xs">
      <FilterSelect
        label={t("filters.searchTextIn")}
        selectedValues={localFilters.searchIn}
        options={searchInOptions}
        onChange={(values: string[]) => onChangeFilter("searchIn", values)}
      />
    </Stack>
    <Stack mt="xs">
      <FilterSelect
        label={t("field.repositories")}
        selectedValues={localFilters.repositories}
        options={repositories.map((repository) => ({
          value: repository.id,
          label: repository.name
        }))}
        onChange={(values: string[]) => onChangeFilter("repositories", values)}
      />
    </Stack>
    <Stack mt="xs">
      <FilterSelect
        label={t("field.formats")}
        selectedValues={localFilters.formats}
        options={formatsOptions}
        onChange={(values: string[]) => onChangeFilter("formats", values)}
      />
    </Stack>
    <Stack mt="xs">
      <FilterSelect
        label={t("field.features")}
        selectedValues={localFilters.features?.map(feature => feature.category).filter((feature, index, array) => array.indexOf(feature) == index) || []}
        options={featuresOptions.filter((option, index, array) => array.map(item => item.category).indexOf(option.category) == index).map(option => {
          return { value: option.category, label: option.category };
        })}
        onChange={(values: string[]) => onChangeFilter("features", featuresOptions.filter(option => values.indexOf(option.category) !== -1))}
      />
    </Stack>
    <Stack mt="xs">
      <FilterSelect
        label={t("field.tags")}
        selectedValues={localFilters.tags}
        options={tagsOptions}
        onChange={(values: string[]) => onChangeFilter("tags", values)}
      />
    </Stack>
    <Flex justify="flex-end">
      <Button onClick={handleOnClearAll} variant="default" size={"xs"}>
        {t("button.clearAll")}
      </Button>
    </Flex>
  </Stack>);
}
