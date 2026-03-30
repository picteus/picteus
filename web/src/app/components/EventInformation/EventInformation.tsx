import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Accordion, ActionIcon, Badge, Box, Flex, Loader, Popover, Text } from "@mantine/core";
import { IconArrowBigUpLines } from "@tabler/icons-react";

import { ChannelEnum, EventInformationType } from "types";
import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import { timeAgoFromMilliseconds } from "utils";
import style from "./EventInformation.module.scss";
import { useDisclosure } from "@mantine/hooks";

interface Context {
  id: string;
  timestamp: number;
  extensionId: string;
  events: EventInformationType[];
}

function LogDate({ timestampInMilliseconds, size }: { timestampInMilliseconds: number, size: string }) {

  const [date, setDate] = useState<string>(timeAgoFromMilliseconds(timestampInMilliseconds));
  useEffect(() => {
    const run = () => {
      setDate(timeAgoFromMilliseconds(timestampInMilliseconds));
    };
    run();
    const interval = setInterval(run, 1_000);
    return () => clearInterval(interval);
  }, [timestampInMilliseconds]);

  return (<Text size={size} c="dimmed" lineClamp={1}>
    {date}
  </Text>);
}

function LogLevelBadge({ event, size, isShort }: { event: EventInformationType, size: string, isShort: boolean }) {
  return (<Badge
    size={size}
    color={EventService.computeLogLevelColor(event.logLevel)}
  >
    {isShort === true ? event.logLevel.charAt(0) : event.logLevel}
  </Badge>);
}

function Activities({ contexts, size }: { contexts: Context[], size: string }) {
  const [opened, { close, open }] = useDisclosure(false);

  return (<Box className={style.activities}>
    {contexts.length > 0 && <>
      <Badge
        size={size}
        color="grape"
      >
        {contexts.length}
      </Badge>
      <Popover
        width="40%"
        position="top-start"
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
            {contexts.map(context => {
              const firstEvent = context.events.slice(-1)[0];
              return (<Accordion.Item key={context.id} value={context.id}>
                <Accordion.Control>
                  <Flex direction="row" gap="xs" align="center">
                    <Loader size="xs" />
                    <LogLevelBadge event={firstEvent} size={size} isShort={false} />
                    <LogDate size={size} timestampInMilliseconds={context.timestamp} />
                    <Text size={size} fw={500} truncate="end">{firstEvent.statusText}</Text>
                  </Flex>
                </Accordion.Control>
                <Accordion.Panel>
                  <Flex direction="column" gap="xs" wrap="nowrap">
                    {context.events.map(event => (
                      <Flex key={event.id} direction="row" gap="xs" align="center" wrap="nowrap">
                        <LogLevelBadge event={event} size={size} isShort={true} />
                        <Text size={size} truncate="end">{event.statusText}</Text>
                      </Flex>))}
                  </Flex>
                </Accordion.Panel>
              </Accordion.Item>);
            })}
          </Accordion>
        </Popover.Dropdown>
      </Popover>
      <Text lineClamp={1} truncate="end" size={size}>{contexts.slice(-1)[0].events.slice(-1)[0].statusText}</Text>
      <Loader size="xs" />
    </>}
  </Box>);
}

const map = new Map();
// map.set("id", {id: "id", timestamp: Date.now(), events:[{
//     contextId: "id",
//     id: "id",
//     channel: "string",
//     rawData: {  milliseconds:Date.now()},
//     statusText: "A first very long message A first very long message A first very long message",
//     logLevel: "info",
//     date: "maintenant"
//   }]});

export default function EventInformation() {
  const [t] = useTranslation();
  const event = useEventSocket();
  const [theLastEvent, setTheLastEvent] = useState<EventInformationType>();
  const [contextsMap, setContextsMap] = useState<Map<string, Context>>(map);
  const [contextsList, setContextsList] = useState<Context[]>([...map.values()]);

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    if (event.channel === ChannelEnum.EXTENSION_INTENT || event.channel === ChannelEnum.EXTENSION_ERROR || event.channel === ChannelEnum.EXTENSION_LOG || ChannelEnum.EXTENSION_ACKNOWLEDGMENT) {
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

  const size = "xs";
  return (
    <div className={style.container}>
      <Box className={style.event}>
        {theLastEvent && <>
          <LogLevelBadge event={theLastEvent} size={size} isShort={false} />
          <Text lineClamp={2} size={size}>{theLastEvent.statusText}</Text>
          <LogDate size={size} timestampInMilliseconds={theLastEvent.rawData.milliseconds} />
        </>}
        {theLastEvent === undefined && <Text size={size}>{t("eventInformation.idle")}</Text>}
      </Box>
      {Math.random() > 1 && <Activities contexts={contextsList} size={size} />}
    </div>
  );
}
