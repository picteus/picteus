import i18n from "i18n/i18n.ts";

import { RepositoriesService } from "app/services";
import {
  ImageApiImageSearchRequest,
  ImageFeatureNullValue,
  ImageFormat,
  SearchFeatureComparisonOperator,
  SearchFeatureLogicalOperator,
  SearchFeatures,
  SearchFilter,
  SearchOriginNature,
  SearchSortingProperty,
  SearchTags
} from "@picteus/ws-client";
import { LocalFiltersType, LocalFiltersTypeFeature } from "types";

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

export type FeaturesNamesOption = WithValue & LocalFiltersTypeFeature;

const computeFeaturesNamesOptions: () => Promise<FeaturesNamesOption[]> = async () => {
  const featureNames = await RepositoriesService.getFeatureNames();
  return featureNames.map(name => ({ value: name.name, label: name.name, category: name.name, format: name.format, type: name.type, name: name.name }));
};

const computeTagsOptions: () => Promise<WithValueAndLabel[]> = async () => {
  const tags = await RepositoriesService.getTags();
  return tags.map(tag => ({ value: tag.value, label: tag.value }));
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

const defaultFilters: LocalFiltersType = {
  keyword: undefined,
  searchIn: undefined,
  formats: undefined,
  repositories: undefined,
  sortBy: "modificationDate",
  sortOrder: "-1",
};

function filtersToSearchRequest(
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

  function computeFeatureNames(): { features: SearchFeatures } | object {
    if (filters.features?.length) {
      const searchFeatures: SearchFeatures = {
        operator: SearchFeatureLogicalOperator.Or, conditions: filters.features.map(feature => {
          return {
            format: feature.format,
            type: feature.type,
            name: feature.name,
            operator: SearchFeatureComparisonOperator.Different,
            value: ImageFeatureNullValue.Empty
          };
        })
      };
      return { features: JSON.stringify(searchFeatures) };
    }
    return {};
  }

  function computeSearchTags(): { tags: SearchTags } | object {
    return filters.tags?.length ? { tags: JSON.stringify({ values: filters.tags }) } : {};
  }

  return {
    filter: {
      criteria: {
        keyword: {
          text: filters.keyword || "",
          ...computeSearchInValues()
        },
        formats: filters.formats?.length
          ? filters.formats
          : formatsOptions.map((format) => format.value as ImageFormat),
        ...computeFeatureNames(),
        ...computeSearchTags()
      },
      ...(filters.repositories?.length ? { origin: { kind: SearchOriginNature.Repositories, ids: filters.repositories } } : {}),
      sorting: {
        property: filters.sortBy,
        isAscending: filters.sortOrder === "1"
      }
    }
  };
}

function searchFilterToFilters(searchFilter: SearchFilter): LocalFiltersType {
  const criteria = searchFilter.criteria;
  const origin = searchFilter.origin;
  const sorting = searchFilter.sorting;

  const filters: LocalFiltersType = {
    ...defaultFilters,
  };

  if (criteria) {
    if (criteria.keyword) {
      filters.keyword = criteria.keyword.text;
      const searchIn: string[] = [];
      if (criteria.keyword.inName) searchIn.push("inName");
      if (criteria.keyword.inMetadata) searchIn.push("inMetadata");
      if (criteria.keyword.inFeatures) searchIn.push("inFeatures");
      filters.searchIn = searchIn.length > 0 ? searchIn : undefined;
    }

    if (criteria.formats) {
      filters.formats = criteria.formats as ImageFormat[];
    }

    if (criteria.features) {
      try {
        const parsedFeatures: SearchFeatures = JSON.parse(criteria.features as unknown as string);
        if (parsedFeatures.conditions) {
          filters.features = parsedFeatures.conditions.map((condition) => ({
            format: condition.format,
            type: condition.type,
            name: condition.name,
            category: condition.name || ""
          }));
        }
      } catch (e) {
        console.warn("Failed to parse search filter features", e);
      }
    }

    if (criteria.tags) {
      try {
        const parsedTags = JSON.parse(criteria.tags as unknown as string);
        if (parsedTags.values) {
          filters.tags = parsedTags.values;
        }
      } catch (e) {
        console.warn("Failed to parse search filter tags", e);
      }
    }
  }

  if (origin && origin.kind === SearchOriginNature.Repositories && origin.ids) {
    filters.repositories = origin.ids;
  }

  if (sorting) {
    filters.sortBy = sorting.property;
    filters.sortOrder = sorting.isAscending ? "1" : "-1";
  }

  return filters;
}

export default {
  defaultFilters,
  sortByOptions,
  sortOrderOptions,
  searchInOptions,
  formatsOptions,
  computeFeaturesNamesOptions,
  computeTagsOptions,
  filtersToCriteria: filtersToSearchRequest,
  searchFilterToFilters,
};
