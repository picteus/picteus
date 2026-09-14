import React, { ReactElement, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Flex, Stack, Table, Text, Title } from "@mantine/core";
import { IconActivity, IconTrash } from "@tabler/icons-react";

import { LogType, SocketEventType } from "types";
import { ToastService } from "utils";
import { useEventSocket } from "app/context";
import { useConfirmAction } from "app/hooks";
import { EventService, StorageService } from "app/services";
import { Container, EmptyResults, ExtensionIcon, FormatedDate, StandardTable } from "app/components";


export default function ActivityScreen(): ReactElement
{
  const [ t ] = useTranslation();
  const { eventStore } = useEventSocket();
  const confirmAction = useConfirmAction();
  type TableRowDisplayType = { log: LogType; };
  const [ rows, setRows ] = useState<TableRowDisplayType[]>([]);
  const [ isDeleting, setIsDeleting ] = useState<boolean>(false);
  const [ pagination, setPagination ] = useState({ currentPage: 1, take: StorageService.getActivityLogsBatchSize() });
  const startIndex = (pagination.currentPage - 1) * pagination.take;
  const endIndex = startIndex + pagination.take;
  const paginatedRows = rows?.slice(startIndex, endIndex);

  const load = useCallback(async (): Promise<void> =>
  {
    const events: SocketEventType[] = await EventService.getSocketEvents();
    setRows(events.map((eventItem) =>
    {
      return { log: EventService.computeLog(eventItem) };
    }));
  }, []);

  useEffect(() =>
  {
    void load();

    return eventStore.subscribeToSocketEvents(() =>
    {
      void load();
    });
  }, [ eventStore, load ]);

  async function handleDeleteAllSocketEvents(): Promise<void>
  {
    setIsDeleting(true);
    try
    {
      await EventService.deleteAllSocketEvents();
      setPagination((previousPagination) =>
      {
        return { ...previousPagination, currentPage: 1 };
      });
      await load();
      ToastService.success(t("activityScreen.successDelete"));
    }
    catch (error)
    {
      ToastService.failure(t("activityScreen.errorDelete"));
    }
    finally
    {
      setIsDeleting(false);
    }
  }

  function handleOnDeleteAllClick(): void
  {
    confirmAction({
      options: {
        title: t("activityScreen.confirmDeleteTitle"),
        message: t("activityScreen.confirmDeleteMessage")
      },
      onConfirm: () =>
      {
        void handleDeleteAllSocketEvents();
      }
    });
  }

  function handleOnPaginationChange(newPage: number): void
  {
    setPagination((previousPagination) =>
    {
      return { ...previousPagination, currentPage: newPage };
    });
  }

  function handleOnTakeChange(newTake: number): void
  {
    StorageService.setActivityLogsBatchSize(newTake);
  }

  const renderedRows = paginatedRows?.map((row) => (
    <Table.Tr key={row.log.id}>
      <Table.Td w={160}>
        <Text size="sm"><FormatedDate timestamp={row.log.milliseconds}/></Text>
      </Table.Td>
      <Table.Td w={60}>
        {row.log.extensionId ?
          <ExtensionIcon idOrExtension={row.log.extensionId} size="sm"/>
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
      <Table.Td>
        <Text size="md">{row.log.text}</Text>
      </Table.Td>
    </Table.Tr>
  ));

  function renderTable(): ReactElement
  {
    return <StandardTable
      head={[ "field.date", "field.extension", "field.logLevel", "field.message" ]}
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
          <Button
            leftSection={<IconTrash size={20}/>}
            color="red"
            variant="light"
            disabled={rows.length === 0}
            loading={isDeleting}
            onClick={handleOnDeleteAllClick}
          >
            {t("button.clearAll")}
          </Button>
        </Flex>
        {renderTable()}
      </Stack>
    </Container>
  );
}
