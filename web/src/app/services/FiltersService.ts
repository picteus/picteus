import i18n from "i18n/i18n.ts";

import { RepositoriesService } from "app/services";
import { ImageApiImageSearchRequest, ImageFormat, SearchSortingProperty } from "@picteus/ws-client";
import { LocalFiltersType } from "types";

const sortByOptions = [
  { value: SearchSortingProperty.Name, label: i18n.t("field.name") },
  {
    value: SearchSortingProperty.CreationDate,
    label: i18n.t("field.createdOn"),
  },
  {
    value: SearchSortingProperty.ModificationDate,
    label: i18n.t("field.modifiedOn"),
  },
  {
    value: SearchSortingProperty.ImportDate,
    label: i18n.t("field.importedOn"),
  },
  {
    value: SearchSortingProperty.UpdateDate,
    label: i18n.t("field.updatedOn"),
  },
  {
    value: SearchSortingProperty.BinarySize,
    label: i18n.t("field.binarySize"),
  },
  { value: SearchSortingProperty.Width, label: i18n.t("field.width") },
  { value: SearchSortingProperty.Height, label: i18n.t("field.height") },
];

const formatsOptions = Object.keys(ImageFormat).map((key) => ({
  value: ImageFormat[key],
  label: ImageFormat[key],
}));

const computeTagsOptions = async ()=>{
  const tags = await RepositoriesService.getTags();
  return tags.map(tag => ({value: tag.value, label: tag.value}));
};

const sortOrderOptions = [
  { value: "1", label: i18n.t("sort.asc") },
  { value: "-1", label: i18n.t("sort.desc") },
];

const searchInOptions = [
  { value: "inName", label: i18n.t("filters.inName") },
  { value: "inMetadata", label: i18n.t("filters.inMetadata") },
  { value: "inFeatures", label: i18n.t("filters.inFeatures") },
];

const defaultFilters: LocalFiltersType = {
  keyword: undefined,
  searchIn: undefined,
  formats: undefined,
  repositories: undefined,
  sortBy: "modificationDate",
  sortOrder: "-1",
};

function filtersToCriteria(
  filters: LocalFiltersType,
): ImageApiImageSearchRequest {
  function computeSearchInValues() {
    const inName = filters.searchIn?.includes("inName") || false;
    const inMetadata = filters.searchIn?.includes("inMetadata") || false;
    const inFeatures = filters.searchIn?.includes("inFeatures") || false;

    if (!inName && !inMetadata && !inFeatures) {
      return { inName: true, inMetadata: true, inFeatures: true };
    }
    return { inName, inMetadata, inFeatures };
  }

  function computeSearchTags(): { tags: { values: string[] } }
  {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return filters.tags?.length ? { tags: JSON.stringify({ values: filters.tags }) } : {};
  }

  return {
    criteria: {
      keyword: {
        text: filters.keyword || "",
        ...computeSearchInValues(),
      },
      formats: filters.formats?.length
        ? filters.formats
        : formatsOptions.map((format) => format.value),
      ...computeSearchTags(),
    },
    ...(filters.repositories?.length ? { ids: filters.repositories } : {}),
    sorting: {
      property: filters.sortBy,
      isAscending: filters.sortOrder === "1",
    },
  };
}

export default {
  defaultFilters,
  sortByOptions,
  sortOrderOptions,
  searchInOptions,
  formatsOptions,
  computeTagsOptions,
  filtersToCriteria,
};
