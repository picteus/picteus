import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Autocomplete,
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Pagination,
  Pill,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconActivity } from "@tabler/icons-react";

import { Container, EmptyResults } from "app/components";
import { EventService, StorageService } from "app/services";
import { useEventSocket } from "app/context";
import { ChannelEnum, EventInformationType } from "types";
import { recursivelyIncludes } from "utils";
import style from "./ActivityScreen.module.scss";

const channelEnum = Object.values(ChannelEnum).map((channel) => ({
  value: channel,
  label: channel,
}));

type EventsTableDisplayType = {
  date: string;
  channel: string;
  logLevel: string;
  description: string;
  payload: any;
};
const BATCH_SIZE = 20;
export default function ActivityScreen() {
  const [t] = useTranslation();
  const lastEvent = useEventSocket();
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
    <Table.Tr key={"notification-tr-" + index + "-" + event.date}>
      <Table.Td>
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
      <Table.Td>
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
        date: event.date,
        channel: event.rawData.channel,
        logLevel: event.logLevel,
        description: event.statusText,
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
  }, [lastEvent, activeFilters]);

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

  function render() {
    return <>{events?.length ? renderContent() : renderEmpty()}</>;
  }

  function handleOnPaginationChange(newPage) {
    setPagination({
      ...pagination,
      currentPage: newPage,
    });
  }

  function renderContent() {
    return (
      <Card>
        <ScrollArea>
          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ minWidth: "70px" }}>
                  {t("field.createdOn")}
                </Table.Th>
                <Table.Th>{t("field.channel")}</Table.Th>
                <Table.Th>{t("field.extension")} ID</Table.Th>
                <Table.Th style={{ minWidth: "80px" }}>
                  {t("field.logLevel")}
                </Table.Th>
                <Table.Th>{t("field.description")}</Table.Th>
                <Table.Th>{t("field.payload")}</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </ScrollArea>
        <Divider mb={"md"} />
        <div className={style.paginationContainer}>
          <Select
            value={pagination.take.toString()}
            data={[
              {
                value: "10",
                label: t("pagination.resultsPerPage", { count: 10 }),
              },
              {
                value: "20",
                label: t("pagination.resultsPerPage", { count: 20 }),
              },
              {
                value: "50",
                label: t("pagination.resultsPerPage", { count: 50 }),
              },
              {
                value: "100",
                label: t("pagination.resultsPerPage", { count: 100 }),
              },
            ]}
            onChange={(value) => {
              setPagination({
                ...pagination,
                take: parseInt(value),
                currentPage: 1,
              });
            }}
          />
          <Text size="sm">
            {`${(pagination.currentPage - 1) * pagination.take + 1} - ${Math.min(
              pagination.currentPage * pagination.take,
              events.length,
            )} ${t("pagination.of")} ${events.length} ${t("pagination.results")}`}
          </Text>
          <Pagination
            value={pagination.currentPage}
            onChange={handleOnPaginationChange}
            total={Math.ceil(events.length / pagination.take)}
          />
        </div>
      </Card>
    );
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
  function renderEmpty() {
    return (
      <EmptyResults
        icon={<IconActivity size={140} stroke={1} />}
        description={t("activityScreen.emptyActivity.description")}
        title={t("activityScreen.emptyActivity.title")}
      />
    );
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
              onChange={setSearchField}
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
        {render()}
      </Stack>
    </Container>
  );
}
