import { ReactElement } from "react";
import { Flex, Pill, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ExtensionCategory } from "@picteus/ws-client";

import { ExtensionsInstallScopeType } from "types";
import { ExtensionFilterableStatusType } from "app/services";
import { ActionLink } from "app/components";


type ExtensionsActiveFiltersBarPropsType = {
  readonly installScope: ExtensionsInstallScopeType;
  readonly selectedCategories: ExtensionCategory[];
  readonly selectedStatuses: ExtensionFilterableStatusType[];
  readonly shownCount: number;
  readonly totalCount: number;
  readonly onClearCategories: () => void;
  readonly onClearStatuses: () => void;
  readonly onClearAllFilters: () => void;
};

export default function ExtensionsActiveFiltersBar({
  installScope,
  selectedCategories,
  selectedStatuses,
  shownCount,
  totalCount,
  onClearCategories,
  onClearStatuses,
  onClearAllFilters
}: ExtensionsActiveFiltersBarPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const hasCategories = selectedCategories.length > 0;
  const hasStatuses = selectedStatuses.length > 0;

  if (hasCategories === false && hasStatuses === false)
  {
    return null;
  }

  const categoryLabels = selectedCategories
    .map(category => t(`extension.categories.${category}`))
    .join(", ");

  const statusLabels = selectedStatuses
    .map(status => t(`extension.status.${status}`))
    .join(", ");

  const isStatusUnused = installScope === "notInstalled";

  return (
    <Flex justify="space-between" align="center" gap="sm" wrap="wrap">
      <Flex align="center" gap="xs" wrap="wrap">
        {hasCategories === true && (
          <Pill
            withRemoveButton
            onRemove={onClearCategories}
          >
            {t("extensionsScreen.filters.categoryPill", { values: categoryLabels })}
          </Pill>
        )}
        {hasStatuses === true && (
          <Pill
            withRemoveButton
            onRemove={onClearStatuses}
            style={isStatusUnused === true ? { opacity: 0.6 } : undefined}
          >
            {isStatusUnused === true
              ? t("extensionsScreen.filters.statusPillNotUsed", { values: statusLabels })
              : t("extensionsScreen.filters.statusPill", { values: statusLabels })}
          </Pill>
        )}
        <ActionLink
          size="xs"
          onClick={onClearAllFilters}
        >
          {t("extensionsScreen.filters.clearFilters")}
        </ActionLink>
      </Flex>
      <Text size="xs" c="dimmed">
        {t("extensionsScreen.filters.resultsCounter", { shown: shownCount, total: totalCount })}
      </Text>
    </Flex>
  );
}
