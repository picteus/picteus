import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Flex, Stack, Table, Text, Title } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";

import { LogType, SocketEventType } from "types";
import { useEventSocket } from "app/context";
import { EventService, StorageService } from "app/services";
import { Container, EmptyResults, ExtensionIcon, FormatedDate, StandardTable } from "app/components";


export default function ActivityScreen() {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);
  type TableRowDisplayType = {
    log: LogType;
  };
  const [rows, setRows] = useState<TableRowDisplayType[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, take: StorageService.getActivityLogsBatchSize() });
  const startIndex = (pagination.currentPage - 1) * pagination.take;
  const endIndex = startIndex + pagination.take;
  const paginatedRows = rows?.slice(startIndex, endIndex);

  useEffect(() => {
    async function load() {
      const events: SocketEventType[] = await EventService.getSocketEvents();
      setRows(events.map((event) => ({log: EventService.computeLog(event)})));
    }
    void load();
  }, [event]);

  useEffect(() =>
  {

  }, [pagination]);

  function handleOnPaginationChange(newPage: number) {
    setPagination((previousPagination) => ({ ...previousPagination, currentPage: newPage }));
  }

  function handleOnTakeChange(newTake: number) {
    StorageService.setActivityLogsBatchSize(newTake);
  }

  const renderedRows = paginatedRows?.map((row) => (
    <Table.Tr key={row.log.id}>
      <Table.Td w={160}>
        <Text size="sm"><FormatedDate timestamp={row.log.milliseconds} /></Text>
      </Table.Td>
      <Table.Td w={60}>
        {row.log.extensionId ?
          <ExtensionIcon idOrExtension={row.log.extensionId} size="sm" />
          :
          (<Text size="md">
            {row.log.extensionId ?? t("field.noValue")}
          </Text>)}
      </Table.Td>
      <Table.Td w={80}>
        <Badge
          style={{ flexShrink: 0 }}
          size="sm"
          color={EventService.computeLogLevelColor(row.log.level)}
        >
          {row.log.level}
        </Badge>
      </Table.Td>
      {/*<Table.Td>*/}
      {/*  <Text size="md">{row.log.type === "image" ? row.log.entityId: ""}</Text>*/}
      {/*</Table.Td>*/}
      <Table.Td>
        <Text size="md">{row.log.text}</Text>
      </Table.Td>
    </Table.Tr>
  ));

  function renderTable() {
    return <StandardTable
      // head={["field.date", "field.extension", "field.logLevel", "field.entity", "field.message"]}
      head={["field.date", "field.extension", "field.logLevel", "field.message"]}
      withPagination={{
        value: pagination,
        setValue: setPagination,
        totalCount: rows.length,
        onPaginationChange: handleOnPaginationChange,
        onTake: handleOnTakeChange
      }}
      emptyResults={<EmptyResults
        icon={IconActivity}
        description={t("activityScreen.emptyActivity.description")}
        title={t("activityScreen.emptyActivity.title")}
      />}>
      {renderedRows}
    </StandardTable>;
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("activityScreen.title")}</Title>
        </Flex>
        {renderTable()}
      </Stack>
    </Container>
  );
}
