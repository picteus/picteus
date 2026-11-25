import { ReactElement } from "react";
import { Table } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Extension, Manifest } from "@picteus/ws-client";

import { ExtensionsSortCriterionType } from "types";
import { UnifiedExtensionItemType } from "app/services";
import { SortableTableHeader, TableHeaderCell } from "app/components";
import ExtensionRow from "../ExtensionRow/ExtensionRow.tsx";


type ExtensionsTablePropsType = {
  readonly items: UnifiedExtensionItemType[];
  readonly sortCriterion: ExtensionsSortCriterionType;
  readonly isSortAscending: boolean;
  readonly togglingIds: ReadonlySet<string>;
  readonly installingIds: ReadonlySet<string>;
  readonly updatingIds: ReadonlySet<string>;
  readonly uninstallingIds: ReadonlySet<string>;
  readonly onSort: (criterion: ExtensionsSortCriterionType) => void;
  readonly onOpen: (item: UnifiedExtensionItemType) => void;
  readonly onToggleState: (extension: Extension) => void;
  readonly onInstall: (manifest: Manifest) => void;
  readonly onMarketplaceUpdate: (extension: Extension, targetVersion: string) => void;
  readonly onManualUpdate: (extension: Extension) => void;
  readonly onSettings: (extension: Extension) => void;
  readonly onSynchronize: (extension: Extension) => void;
  readonly onUninstall: (extension: Extension) => void;
};

export default function ExtensionsTable({
  items,
  sortCriterion,
  isSortAscending,
  togglingIds,
  installingIds,
  updatingIds,
  uninstallingIds,
  onSort,
  onOpen,
  onToggleState,
  onInstall,
  onMarketplaceUpdate,
  onManualUpdate,
  onSettings,
  onSynchronize,
  onUninstall
}: ExtensionsTablePropsType): ReactElement
{
  const [ t ] = useTranslation();

  return (
    <Table highlightOnHover horizontalSpacing={12}>
      <Table.Thead>
        <Table.Tr>
          <SortableTableHeader
            criterion="name"
            label={t("field.extension")}
            activeCriterion={sortCriterion}
            isSortAscending={isSortAscending}
            onSort={onSort}
          />
          <TableHeaderCell>{t("field.categories")}</TableHeaderCell>
          <SortableTableHeader
            criterion="status"
            label={t("field.status")}
            activeCriterion={sortCriterion}
            isSortAscending={isSortAscending}
            onSort={onSort}
          />
          <TableHeaderCell ta="right">{t("field.enabled")}</TableHeaderCell>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map(item => (
          <ExtensionRow
            key={item.id}
            item={item}
            isToggling={togglingIds.has(item.id)}
            isInstalling={installingIds.has(item.id)}
            isUpdating={updatingIds.has(item.id)}
            isUninstalling={uninstallingIds.has(item.id)}
            onOpen={onOpen}
            onToggleState={onToggleState}
            onInstall={onInstall}
            onMarketplaceUpdate={onMarketplaceUpdate}
            onManualUpdate={onManualUpdate}
            onSettings={onSettings}
            onSynchronize={onSynchronize}
            onUninstall={onUninstall}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}
