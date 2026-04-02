import React, { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, ActionIcon, Badge, Box, Flex, Loader, Popover, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowBigUpLines } from "@tabler/icons-react";

import { ChannelEnum, EventInformationType } from "types";
import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import { ExtensionIcon } from "app/components";
import { timeAgoFromMilliseconds } from "utils";
import style from "./EventInformation.module.scss";


const size = "xs";

interface Context {
  id: string;
  timestamp: number;
  extensionId: string;
  events: EventInformationType[];
}

function EventText({ text, maxLines, isBold = false }: { text: string, maxLines: number, isBold?: boolean }) {
  return (<Text lineClamp={maxLines} fw={isBold === true ? "bold" : "normal"} truncate="end" size={size}>{text}</Text>);
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
    color={EventService.computeLogLevelColor(event.logLevel)}
    className={style.logLevelBadge}
  >
    {isShort === true ? event.logLevel.charAt(0) : event.logLevel}
  </Badge>);
}

function Activity({ context }: { context: Context }) {
  const firstEvent = context.events.slice(-1)[0];

  return (<Accordion.Item key={context.id} value={context.id}>
    <Accordion.Control>
      <Flex direction="row" gap={size} align="center">
        <Loader size={size} />
        <ExtensionIcon id={context.extensionId} size="sm"/>
        <EventLevelBadge event={firstEvent} isShort={false} />
        <EventDate timestampInMilliseconds={context.timestamp} />
        <EventText text={firstEvent.statusText} maxLines={1} isBold={true} />
      </Flex>
    </Accordion.Control>
    <Accordion.Panel>
      <Flex direction="column" gap={size} wrap="nowrap">
        {context.events.map(event => (
          <Flex key={event.id} direction="row" gap={size} align="center" wrap="nowrap">
            <EventLevelBadge event={event} isShort={true} />
            <EventText text={event.statusText} maxLines={1} />
          </Flex>))}
      </Flex>
    </Accordion.Panel>
  </Accordion.Item>);
}

function Activities({ contexts }: { contexts: Context[] }) {
  const [opened, { close, open }] = useDisclosure(false);

  return (<Box className={style.activities}>
    {contexts.length > 0 && <>
      <Text lineClamp={1} truncate="end" size={size}>{contexts.slice(-1)[0].events.slice(-1)[0].statusText}</Text>
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
          <Accordion variant="separated" defaultValue="Apples">
            {contexts.map(context => <Activity context={context} />)}
          </Accordion>
        </Popover.Dropdown>
      </Popover>
    </>}
  </Box>);
}

export default function EventInformation() {
  const [t] = useTranslation();
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
          extensionId: event.rawData.value["id"],
          events: []
        };
        contextsMap.set(contextId, context);
      }
      if (event.channel === ChannelEnum.EXTENSION_ACKNOWLEDGMENT) {
        // contextsMap.delete(contextId);
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
    <div className={style.container}>
      <Box className={style.event}>
        {theLastEvent && <>
          <EventLevelBadge event={theLastEvent} isShort={false} />
          <EventText text={theLastEvent.statusText} maxLines={2}/>
          <EventDate timestampInMilliseconds={theLastEvent.rawData.milliseconds} />
        </>}
        {theLastEvent === undefined && <Text size={size}>{t("eventInformation.idle")}</Text>}
      </Box>
      <Activities contexts={contextsList} />
    </div>
  );
}
