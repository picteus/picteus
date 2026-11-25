import { SearchFilter, SearchSortingProperty } from "@picteus/ws-client";


export function normalizeTagsKey(withTags?: readonly string[]): string
{
  if (!withTags || withTags.length === 0)
  {
    return "";
  }
  return [ ...withTags ].sort().join(",");
}

export function buildSearchFilterWithTags(
  baseFilter: SearchFilter | undefined,
  withTags?: readonly string[]
): SearchFilter | undefined
{
  if (!withTags || withTags.length === 0)
  {
    return baseFilter;
  }

  const existingTags = baseFilter?.criteria?.tags?.values;
  let mergedTagValues: string[];
  if (existingTags !== undefined && existingTags.length > 0)
  {
    const intersection = existingTags.filter((tag) => withTags.includes(tag));
    mergedTagValues = intersection.length > 0 ? intersection : [ ...withTags ];
  }
  else
  {
    mergedTagValues = [ ...withTags ];
  }

  return {
    ...baseFilter,
    criteria: {
      ...baseFilter?.criteria,
      tags: {
        values: mergedTagValues
      }
    }
  };
}

export function buildLibraryNewestFirstSearchFilter(withTags?: readonly string[]): SearchFilter
{
  const baseFilter: SearchFilter = {
    sorting: {
      property: SearchSortingProperty.ImportDate,
      isAscending: false
    }
  };
  return buildSearchFilterWithTags(baseFilter, withTags) ?? baseFilter;
}
