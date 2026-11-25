import { ReactElement, useMemo, useState } from "react";
import { Badge, Box, Button, Checkbox, Divider, Flex, Popover, Stack, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionCategory } from "@picteus/ws-client";

import { ExtensionsInstallScopeType } from "types";
import { ExtensionFilterableStatusType, ExtensionsService } from "app/services";
import { ActionLink, Common, EXTENSION_STATUS_COLORS, SearchInput } from "app/components";


type ExtensionsFiltersPopoverPropsType = {
  readonly installScope: ExtensionsInstallScopeType;
  readonly selectedCategories: ExtensionCategory[];
  readonly selectedStatuses: ExtensionFilterableStatusType[];
  readonly categoryCounts: Record<ExtensionCategory, number>;
  readonly statusCounts: Record<ExtensionFilterableStatusType, number>;
  readonly onToggleCategory: (category: ExtensionCategory) => void;
  readonly onToggleStatus: (status: ExtensionFilterableStatusType) => void;
  readonly onClearAll: () => void;
};

export default function ExtensionsFiltersPopover({
  installScope,
  selectedCategories,
  selectedStatuses,
  categoryCounts,
  statusCounts,
  onToggleCategory,
  onToggleStatus,
  onClearAll
}: ExtensionsFiltersPopoverPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const [ categorySearch, setCategorySearch ] = useState<string>("");

  const activeGroupCount = (selectedCategories.length > 0 ? 1 : 0) + (selectedStatuses.length > 0 ? 1 : 0);
  const isStatusDisabled = installScope === "notInstalled";

  const visibleCategories = useMemo<ExtensionCategory[]>(() =>
  {
    const normalized = categorySearch.trim().toLowerCase();
    if (normalized.length === 0)
    {
      return [ ...ExtensionsService.allExtensionCategories ];
    }
    return ExtensionsService.allExtensionCategories.filter(category =>
      t(`extension.categories.${category}`).toLowerCase().includes(normalized)
    );
  }, [ categorySearch, t ]);

  return (
    <Popover width={310} position="bottom-start" shadow="md" withinPortal>
      <Popover.Target>
        <Button
          variant="default"
          leftSection={<IconAdjustmentsHorizontal size={16} stroke={Common.IconStrokeSize}/>}
          rightSection={activeGroupCount > 0 ? (
            <Badge size="xs" circle color="blue" variant="filled">
              {activeGroupCount}
            </Badge>
          ) : undefined}
        >
          {t("filters.title")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <Stack gap="sm">
          <Stack gap="xs">
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              {t("extensionsScreen.filters.categoryHeading")}
            </Text>
            <SearchInput
              size="xs"
              w="100%"
              placeholder={t("extensionsScreen.filters.categorySearchPlaceholder")}
              value={categorySearch}
              onChange={setCategorySearch}
            />
            <Stack gap={6}>
              {visibleCategories.map(category =>
              {
                const isChecked = selectedCategories.includes(category);
                return (
                  <Flex key={category} justify="space-between" align="center" gap="xs">
                    <Checkbox
                      size="xs"
                      label={t(`extension.categories.${category}`)}
                      checked={isChecked}
                      onChange={() => onToggleCategory(category)}
                    />
                    <Text size="xs" c="dimmed">
                      {categoryCounts[category]}
                    </Text>
                  </Flex>
                );
              })}
            </Stack>
          </Stack>

          <Divider/>

          <Stack gap="xs">
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              {t("field.status")}
            </Text>
            {isStatusDisabled === true && (
              <Text size="xs" c="dimmed">
                {t("extensionsScreen.filters.statusNotUsedHint")}
              </Text>
            )}
            <Stack gap={6} style={isStatusDisabled === true ? { opacity: 0.5 } : undefined}>
              {ExtensionsService.filterableExtensionStatuses.map(status =>
              {
                const isChecked = selectedStatuses.includes(status);
                const color = EXTENSION_STATUS_COLORS[status];
                return (
                  <Flex key={status} justify="space-between" align="center" gap="xs">
                    <Checkbox
                      size="xs"
                      disabled={isStatusDisabled}
                      checked={isChecked}
                      onChange={() => onToggleStatus(status)}
                      label={(
                        <Flex align="center" gap={6}>
                          <Box w={6} h={6} bg={`var(--mantine-color-${color}-filled)`} bdrs={6}/>
                          <Text size="xs">{t(`extension.status.${status}`)}</Text>
                        </Flex>
                      )}
                    />
                    <Text size="xs" c="dimmed">
                      {statusCounts[status]}
                    </Text>
                  </Flex>
                );
              })}
            </Stack>
          </Stack>

          <Divider/>

          <Flex justify="space-between" align="flex-end" gap="sm">
            <Text size="xs" c="dimmed" flex={1}>
              {t("extensionsScreen.filters.footerHint")}
            </Text>
            {activeGroupCount > 0 && (
              <ActionLink
                size="xs"
                onClick={onClearAll}
                style={{ flexShrink: 0 }}
              >
                {t("filters.clearAll")}
              </ActionLink>
            )}
          </Flex>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
