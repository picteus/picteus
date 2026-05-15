import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, ActionIcon, Badge, Flex, Grid, Loader, Popover, ScrollArea, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowBigUpLines } from "@tabler/icons-react";

import { ChannelEnum, EventInformationType } from "types";
import { timeAgoFromMilliseconds } from "utils";
import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import { ExtensionIcon } from "app/components";

import style from "./EventInformation.module.scss";


const size = "xs";

interface Context {
  id: string;
  timestamp: number;
  extensionId: string;
  events: EventInformationType[];
}

function EventText({ event, maxLines, isBold = false }: { event: EventInformationType, maxLines: number, isBold?: boolean }) {
  return (<Text lineClamp={maxLines} fw={isBold === true ? "bold" : "normal"} truncate="end" size={size}>{event.log.text}</Text>);
}

function EventDate({ timestampInMilliseconds }: { timestampInMilliseconds: number}) {

  const [date, setDate] = useState<string>(timeAgoFromMilliseconds(timestampInMilliseconds));
  useEffect(() => {
    const run = () => {
      setDate(timeAgoFromMilliseconds(timestampInMilliseconds));
    };
    run();
    const interval = setInterval(run, 1_000);
    return () => clearInterval(interval);
  }, [timestampInMilliseconds]);

  return (<Text className={style.logDate} size={size} c="dimmed" lineClamp={1}>
    {date}
  </Text>);
}

function EventLevelBadge({ event, isShort }: { event: EventInformationType, isShort: boolean }) {
  return (<Badge
    size={size}
    color={EventService.computeLogLevelColor(event.log.level)}
    className={style.logLevelBadge}
  >
    {isShort === true ? event.log.level.charAt(0) : event.log.level}
  </Badge>);
}

function PopActivity({ context }: { context: Context }) {
  const firstEvent = context.events.slice(-1)[0];

  return (<Accordion.Item key={context.id} value={context.id}>
    <Accordion.Control>
      <Flex direction="row" gap={size} align="center">
        <Loader size={size} />
        <ExtensionIcon idOrExtension={context.extensionId} size="sm"/>
        <EventLevelBadge event={firstEvent} isShort={false} />
        <EventDate timestampInMilliseconds={context.timestamp} />
        <EventText event={firstEvent} maxLines={1} isBold={true} />
      </Flex>
    </Accordion.Control>
    <Accordion.Panel>
      <Flex direction="column" gap={size} wrap="nowrap">
        {context.events.slice(0, context.events.length - 1).map(event => (
          <Flex key={event.id} direction="row" gap={size} align="center" wrap="nowrap">
            <EventLevelBadge event={event} isShort={true} />
            <EventText event={event} maxLines={1} />
          </Flex>))}
      </Flex>
    </Accordion.Panel>
  </Accordion.Item>);
}

function PopActivities({ contexts, containerHeight }: { contexts: Context[], containerHeight: number })
{
  const maxHeight = containerHeight * .80;
  return (<ScrollArea.Autosize mah={maxHeight} mx="auto" >
      <Flex align="flex-end">
        <Accordion multiple variant="separated" radius="md">
          {contexts.map(context => <PopActivity context={context} />)}
        </Accordion>
      </Flex>
    </ScrollArea.Autosize>
  );
}

function Activities({ contexts, containerHeight }: { contexts: Context[], containerHeight: number }) {
  const [opened, { close, open }] = useDisclosure(false);

  return (<Flex align="center" justify="flex-end" gap={size}>
    {contexts.length > 0 && <>
      <Text lineClamp={1} truncate="end" size={size}>{contexts.slice(-1)[0].events.slice(-1)[0].log.text}</Text>
      <Loader size={size} />
      <Badge size={size} color="grape" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
        {contexts.length}
      </Badge>
      <Popover
        width="40%"
        position="top-end"
        offset={20}
        withArrow
        trapFocus={true}
        opened={opened}
        onChange={open}
        onDismiss={close}
      >
        <Popover.Target>
          <ActionIcon variant="subtle" onMouseEnter={open}>
            <IconArrowBigUpLines size={20} stroke={1.5} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown>
          <PopActivities contexts={contexts} containerHeight={containerHeight}/>
        </Popover.Dropdown>
      </Popover>
    </>}
  </Flex>);
}

function Status({ event }: { event: EventInformationType }) {
  const [t] = useTranslation();

  return (<Flex align="center" gap={size}>
    {event && <>
      {event.log.extensionId && <ExtensionIcon idOrExtension={event.log.extensionId} size="sm" />}
      <EventLevelBadge event={event} isShort={false} />
      <EventText event={event} maxLines={2} />
      <EventDate timestampInMilliseconds={event.rawData.milliseconds} />
    </>}
    {event === undefined && <Text size={size}>{t("eventInformation.idle")}</Text>}
  </Flex>);
}

export default function EventInformation({containerHeight}: { containerHeight: number }) {
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);
  const [theLastEvent, setTheLastEvent] = useState<EventInformationType>();
  const [contextsMap, setContextsMap] = useState<Map<string, Context>>(new Map());
  const [contextsList, setContextsList] = useState<Context[]>([...contextsMap.values()]);

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    if (event.rawData.isActivity === true) {
      const contextId = event.rawData.contextId;
      let context = contextsMap.get(contextId);
      if (context === undefined) {
        context = {
          id: contextId,
          timestamp: event.rawData.milliseconds,
          extensionId: event.log.extensionId,
          events: []
        };
        contextsMap.set(contextId, context);
      }
      if (event.channel === ChannelEnum.EXTENSION_ACKNOWLEDGMENT) {
        contextsMap.delete(contextId);
      }
      else {
        context.events.push(event);
      }
      setContextsMap(contextsMap);
      setContextsList([...contextsMap.values()]);
    }

    if (event.channel === ChannelEnum.EXTENSION_ACKNOWLEDGMENT) {
      return;
    }
    setTheLastEvent(event);
  }, [event]);

  return (
    <Grid className={style.container} columns={10} gap="sm" justify="center" align="center" overflow="hidden">
      <Grid.Col span={7} >
        <Status event={theLastEvent} />
      </Grid.Col>
      <Grid.Col span={3}>
        <Activities contexts={contextsList} containerHeight={containerHeight}/>
      </Grid.Col>
    </Grid>
  );
}
