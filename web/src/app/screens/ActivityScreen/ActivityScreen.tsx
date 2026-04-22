import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Autocomplete, Badge, Button, Flex, Grid, Pill, Select, Stack, Table, Text, Title } from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";

import { ChannelEnum, EventInformationType, JsonType } from "types";
import { recursivelyIncludes } from "utils";
import { useEventSocket } from "app/context";
import { EventService, StorageService } from "app/services";
import { Container, EmptyResults, StandardTable } from "app/components";


const channelEnum = Object.values(ChannelEnum).map((channel) => ({
  value: channel,
  label: channel,
}));

type EventsTableDisplayType = {
  date: string;
  channel: string;
  logLevel: string;
  description: string;
  payload: JsonType;
};
const BATCH_SIZE = 20;
export default function ActivityScreen() {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [events, setEvents] = useState<EventsTableDisplayType[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    take: BATCH_SIZE,
  });

  const [searchField, setSearchField] = useState<string>("channel");
  const [activeFilters, setActiveFilters] = useState<
    Array<{
      field: string;
      value: string;
    }>
  >(StorageService.getActivityFilters() || []);

  const searchFieldData = [
    { value: "channel", label: t("field.channel") },
    { value: "logLevel", label: t("field.logLevel") },
    { value: "description", label: t("field.description") },
    { value: "payload", label: t("field.payload") },
  ];
  const startIndex = (pagination.currentPage - 1) * pagination.take;
  const endIndex = startIndex + pagination.take;
  const paginatedEvents = events?.slice(startIndex, endIndex);
  const rows = paginatedEvents?.map((event, index) => (
    <Table.Tr key={`notification-${index}-${event.date}`}>
      <Table.Td w={160}>
        <Text size="sm">{event.date}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">{event.channel}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">
          {event.channel.startsWith("extension") ? event.payload?.id : "-"}
        </Text>
      </Table.Td>
      <Table.Td w={80}>
        <Badge
          style={{ flexShrink: 0 }}
          size="sm"
          color={EventService.computeLogLevelColor(event.logLevel)}
        >
          {event.logLevel}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="md">{event.description}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="md">{JSON.stringify(event.payload)}</Text>
      </Table.Td>
    </Table.Tr>
  ));

  function transformEventsForTable(
    events: EventInformationType[],
  ): EventsTableDisplayType[] {
    return events.map((event) => {
      return {
        date: event.log.date,
        channel: event.rawData.channel,
        logLevel: event.log.level,
        description: event.log.text,
        payload: event.rawData.value,
      };
    });
  }

  async function load() {
    const events: EventInformationType[] =
      await EventService.getEventsFromIndexedDB();

    let eventsTable: EventsTableDisplayType[] = transformEventsForTable(events);

    if (activeFilters?.length) {
      eventsTable = eventsTable.filter((event) => {
        return activeFilters.every((filter) => {
          const searchValue = filter.value?.trim().toLowerCase();
          return recursivelyIncludes(event?.[filter.field], searchValue);
        });
      });
    }
    setEvents(eventsTable);
  }

  useEffect(() => {
    StorageService.setActivityFilters(activeFilters);
    void load();
  }, [event, activeFilters]);

  function handleOnAddFilter() {
    if (searchValue) {
      setActiveFilters((prevFilters) => {
        const existingFilterIndex = prevFilters.findIndex(
          (filter) => filter.field === searchField,
        );

        if (existingFilterIndex !== -1) {
          const updatedFilters = [...prevFilters];
          updatedFilters[existingFilterIndex] = {
            field: searchField,
            value: searchValue,
          };
          return updatedFilters;
        }
        return [
          ...prevFilters,
          {
            field: searchField,
            value: searchValue,
          },
        ];
      });
      setSearchValue("");
    }
  }

  function handleOnRemoveFilter(field: string) {
    setActiveFilters(activeFilters.filter((filter) => filter.field !== field));
  }

  function handleOnPaginationChange(newPage: number) {
    setPagination({
      ...pagination,
      currentPage: newPage,
    });
  }

  function renderTable() {
    return <StandardTable
      head={["field.createdOn", "field.channel", "field.extension", "field.logLevel", "field.description", "field.payload"]}
      withPagination={{
        value: pagination,
        setValue: setPagination,
        totalCount: events.length,
        onPaginationChange: handleOnPaginationChange
      }}
      emptyResults={<EmptyResults
        icon={<IconActivity size={140} stroke={1} />}
        description={t("activityScreen.emptyActivity.description")}
        title={t("activityScreen.emptyActivity.title")}
      />}>
      {rows}
    </StandardTable>;
  }

  function computeAutoCompleteData() {
    if (searchField === "channel") {
      return channelEnum;
    }
    if (searchField === "logLevel") {
      return [
        { value: "info", label: "Info" },
        { value: "debug", label: "Debug" },
        { value: "error", label: "Error" },
      ];
    }
    return [];
  }

  return (
    <Container>
      <Stack gap="lg" h="100%">
        <Flex justify="space-between" align="center">
          <Title>{t("activityScreen.title")}</Title>
        </Flex>
        <Grid align="flex-end">
          <Grid.Col span={2}>
            <Select
              defaultValue={"channel"}
              allowDeselect={false}
              value={searchField}
              onChange={(value) => setSearchField(value)}
              label={t("activityScreen.search")}
              data={searchFieldData}
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Autocomplete
              value={searchValue}
              onChange={setSearchValue}
              placeholder={t("activityScreen.searchValuePlaceholder")}
              data={computeAutoCompleteData()}
            />
          </Grid.Col>
          <Grid.Col span={1}>
            <Button
              disabled={searchValue?.trim() === ""}
              onClick={handleOnAddFilter}
            >
              {t("button.add")}
            </Button>
          </Grid.Col>
        </Grid>

        <div>
          {activeFilters.map((filter) => {
            return (
              <Pill
                size="md"
                withRemoveButton
                onRemove={() => handleOnRemoveFilter(filter.field)}
                key={filter.field}
              >{`${searchFieldData.find((field) => field.value === filter.field).label}: ${filter.value}`}</Pill>
            );
          })}
        </div>
        {renderTable()}
      </Stack>
    </Container>
  );
}
