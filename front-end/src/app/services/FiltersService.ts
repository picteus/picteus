import i18n from "i18n/i18n.ts";

import { RepositoriesService } from "app/services";
import {
  ExtensionImageFeatureName,
  ExtensionImageTag,
  ImageFormat,
  SearchFeatures,
  SearchFilter,
  SearchFilterFromJSON,
  SearchKeyword,
  SearchOriginNature,
  SearchProperties,
  SearchSortingProperty,
  SearchTags
} from "@picteus/ws-client";

import { LocalFiltersType } from "types";


export type WithValue = { value: string };

export type WithValueAndLabel = WithValue & { label: string };

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
  { value: SearchSortingProperty.Height, label: i18n.t("field.height") }
];

const formatsOptions: WithValueAndLabel[] = Object.keys(ImageFormat).map((key) => ({
  value: ImageFormat[key],
  label: ImageFormat[key]
}));

const computeFeaturesNamesOptions: () => Promise<ExtensionImageFeatureName[]> = async () => {
  return await RepositoriesService.getFeatureNames();
};

const computeTagsOptions: () => Promise<ExtensionImageTag[]> = async () => {
  return await RepositoriesService.getTags();
};

const sortOrderOptions: WithValueAndLabel[] = [
  { value: "1", label: i18n.t("sort.asc") },
  { value: "-1", label: i18n.t("sort.desc") },
];

const searchInOptions: WithValueAndLabel[] = [
  { value: "inName", label: i18n.t("filters.inName") },
  { value: "inMetadata", label: i18n.t("filters.inMetadata") },
  { value: "inFeatures", label: i18n.t("filters.inFeatures") },
];

const defaultFilter: SearchFilter = {
  sorting: { property: SearchSortingProperty.ModificationDate, isAscending: false }
};

function localFiltersToSearchFilter(localFilters: LocalFiltersType): SearchFilter {
  function computeSearchKeyword() : { keyword: SearchKeyword } | object {
    const inName = localFilters.searchIn?.includes("inName") || false;
    const inMetadata = localFilters.searchIn?.includes("inMetadata") || false;
    const inFeatures = localFilters.searchIn?.includes("inFeatures") || false;

    if ((localFilters.keyword === undefined || localFilters.keyword === "") || (!inName && !inMetadata && !inFeatures)) {
      return {};
    }
    return { keyword : { text: localFilters.keyword || "", inName, inMetadata, inFeatures } };
  }

  function computeFeatures(): { features: SearchFeatures } | object {
    if (localFilters.features) {
      return { features: localFilters.features };
    }
    return {};
  }

  function computeProperties(): { properties: SearchProperties } | object {
    if (localFilters.properties) {
      return { properties: localFilters.properties };
    }
    return {};
  }

  function computeSearchTags(): { tags: SearchTags } | object {
    return localFilters.tags?.length ? { tags: { values: localFilters.tags } } : {};
  }

  const rawSearchFilter = {
    criteria: {
      ...computeSearchKeyword(),
      formats: localFilters.formats?.length > 0 ? localFilters.formats : undefined,
      ...computeFeatures(),
      ...computeProperties(),
      ...computeSearchTags()
    },
    ...(localFilters.repositories?.length ? { origin: { kind: SearchOriginNature.Repositories, ids: localFilters.repositories } } : {}),
    sorting: localFilters.sortBy ? {
      property: localFilters.sortBy,
      isAscending: localFilters.sortOrder === "1"
    } : undefined
  };
  return SearchFilterFromJSON(rawSearchFilter);
}

function searchFilterToLocalFilters(searchFilter: SearchFilter): LocalFiltersType {
  const localFilters: LocalFiltersType = {};

  const criteria = searchFilter.criteria;
  const origin = searchFilter.origin;
  const sorting = searchFilter.sorting;

  if (criteria) {
    if (criteria.keyword) {
      localFilters.keyword = criteria.keyword.text;
      const searchIn: ("inName" | "inMetadata" | "inFeatures")[] = [];
      if (criteria.keyword.inName) {
        searchIn.push("inName");
      }
      if (criteria.keyword.inMetadata) {
        searchIn.push("inMetadata");
      }
      if (criteria.keyword.inFeatures) {
        searchIn.push("inFeatures");
      }
      localFilters.searchIn = searchIn.length > 0 ? searchIn : undefined;
    }

    if (criteria.formats) {
      localFilters.formats = criteria.formats as ImageFormat[];
    }

    if (criteria.features) {
      localFilters.features = criteria.features;
    }

    if (criteria.properties) {
      localFilters.properties = criteria.properties;
    }

    if (criteria.tags) {
      localFilters.tags = criteria.tags.values;
    }
  }

  if (origin && origin.kind === SearchOriginNature.Repositories && origin.ids) {
    localFilters.repositories = origin.ids;
  }

  if (sorting) {
    localFilters.sortBy = sorting.property;
    localFilters.sortOrder = sorting.isAscending ? "1" : "-1";
  }

  return localFilters;
}

export default {
  defaultFilter,
  sortByOptions,
  sortOrderOptions,
  searchInOptions,
  formatsOptions,
  computeFeaturesNamesOptions,
  computeTagsOptions,
  localFiltersToSearchFilter,
  searchFilterToLocalFilters,
};
