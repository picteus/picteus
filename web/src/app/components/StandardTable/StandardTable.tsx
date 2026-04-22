import React, { ReactElement } from "react";
import { Divider, LoadingOverlay, Pagination, Select, Table, Text } from "@mantine/core";

import { useTranslation } from "react-i18next";

import { EmptyResults } from "app/components";
import style from "./StandardTable.module.scss";
import variables from "assets/style/variablesExport.module.scss";


type Pagination = {
  currentPage: number,
  take: number
};

type StandardTableType = {
  head: string[];
  loading?: boolean;
  withPagination?: { value: Pagination, setValue: React.Dispatch<React.SetStateAction<Pagination>>, totalCount: number,
    onPaginationChange: (page: number) => void };
  emptyResults?: ReactElement<typeof EmptyResults>;
  children: ReactElement<typeof Table.Tr>[];
};


export default function StandardTable({ head, loading, withPagination, emptyResults, children }: StandardTableType) {
  const [t] = useTranslation();

  function renderHeaders() {
    return head.map(string => <Table.Th>{string.length === 0 ? "" : t(string)}</Table.Th>);
  }

  function renderPagination() {
    const pagination = withPagination.value;
    const totalCount = withPagination.totalCount;
    const resultsPerPageMnemonic = "pagination.resultsPerPage";
    return <div className={style.paginationContainer}>
      <Select
        value={pagination.take.toString()}
        data={[
          {
            value: "10",
            label: t(resultsPerPageMnemonic, { count: 10 })
          },
          {
            value: "20",
            label: t(resultsPerPageMnemonic, { count: 20 })
          },
          {
            value: "50",
            label: t(resultsPerPageMnemonic, { count: 50 })
          },
          {
            value: "100",
            label: t(resultsPerPageMnemonic, { count: 100 })
          }
        ]}
        onChange={(value) =>
        {
          withPagination.setValue({ ...pagination, take: parseInt(value), currentPage: 1 });
        }}
      />
      <Text size="sm">
        {`${(pagination.currentPage - 1) * pagination.take + 1} - ${Math.min(
          pagination.currentPage * pagination.take,
          totalCount
        )} ${t("pagination.of")} ${totalCount} ${t("pagination.results")}`}
      </Text>
      <Pagination
        value={pagination.currentPage}
        onChange={withPagination.onPaginationChange}
        total={Math.ceil(totalCount / pagination.take)}
      />
    </div>;
  }

  if (loading === true) {
    return <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 3 }} />;
  }
  if (children.length === 0 && emptyResults !== undefined) {
    return emptyResults;
  }

  function renderTable() {
    return (<Table.ScrollContainer minWidth={variables.tableMinimalWidth} pr={variables.contentPaddingHorizontal}
                                   mr={`-${variables.contentPaddingHorizontal}`}
      >
        <Table stickyHeader highlightOnHover striped>
          <Table.Thead>
            <Table.Tr>
              {renderHeaders()}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{children}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
  }

  return (<>
    {renderTable()}
    { withPagination && (<><Divider mb={"md"} /> {renderPagination()}  </>)}
  </>);

}
