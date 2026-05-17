import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Accordion, ActionIcon, Badge, Flex, Grid, Loader, Popover, ScrollArea, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconArrowBigUpLines } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ChannelEnum, LogType } from "types";
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
  logs: LogType[];
}

type LogTextType = {
  log: LogType,
  maxLines: number,
  isBold?: boolean
};

function LogText({ log, maxLines, isBold = false }: LogTextType) {
  return (<Text lineClamp={maxLines} fw={isBold === true ? "bold" : "normal"} truncate="end" size={size}>{log.text}</Text>);
}

type LogDateType = {
  timestampInMilliseconds: number
};

function LogDate({ timestampInMilliseconds }: LogDateType) {
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

type LogEventType = {
  log: LogType,
  isShort: boolean
};

function LogLevelBadge({ log, isShort }: LogEventType) {
  return (<Badge
    size={size}
    color={EventService.computeLogLevelColor(log.level)}
    className={style.logLevelBadge}
  >
    {isShort === true ? log.level.charAt(0) : log.level}
  </Badge>);
}

function PopActivity({ context }: { context: Context }) {
  const firstLog = context.logs.slice(-1)[0];

  return (<Accordion.Item key={context.id} value={context.id}>
    <Accordion.Control>
      <Flex direction="row" gap={size} align="center">
        <Loader size={size} />
        <ExtensionIcon idOrExtension={context.extensionId} size="sm"/>
        <LogLevelBadge log={firstLog} isShort={false} />
        <LogDate timestampInMilliseconds={context.timestamp} />
        <LogText log={firstLog} maxLines={1} isBold={true} />
      </Flex>
    </Accordion.Control>
    <Accordion.Panel>
      <Flex direction="column" gap={size} wrap="nowrap">
        {context.logs.slice(0, context.logs.length - 1).map(log => (
          <Flex key={log.id} direction="row" gap={size} align="center" wrap="nowrap">
            <LogLevelBadge log={log} isShort={true} />
            <LogText log={log} maxLines={1} />
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
      <Text lineClamp={1} truncate="end" size={size}>{contexts.slice(-1)[0].logs.slice(-1)[0].text}</Text>
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

type StatusType = {
  log: LogType;
};

function Status({ log }: StatusType) {
  const [t] = useTranslation();

  return (<Flex align="center" gap={size}>
    {log && <>
      {log.extensionId && <ExtensionIcon idOrExtension={log.extensionId} size="sm" />}
      <LogLevelBadge log={log} isShort={false} />
      <LogText log={log} maxLines={2} />
      <LogDate timestampInMilliseconds={log.milliseconds} />
    </>}
    {log === undefined && <Text size={size}>{t("eventInformation.idle")}</Text>}
  </Flex>);
}

export default function EventInformation({containerHeight}: { containerHeight: number }) {
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribeToSocketEvents, eventStore.getSocketEvent);
  const [theLastLog, setTheLastLog] = useState<LogType>();
  const [contextsMap, setContextsMap] = useState<Map<string, Context>>(new Map());
  const [contextsList, setContextsList] = useState<Context[]>([...contextsMap.values()]);

  useEffect(() => {
    if (event === undefined) {
      return;
    }
    const log = EventService.computeLog(event);
    if (event.isActivity === true) {
      const contextId = event.contextId;
      let context = contextsMap.get(contextId);
      if (context === undefined) {
        context = {
          id: contextId,
          timestamp: event.milliseconds,
          extensionId: EventService.computeEventExtensionId(event),
          logs: []
        };
        contextsMap.set(contextId, context);
      }
      if (event.channel === ChannelEnum.EXTENSION_ACKNOWLEDGMENT) {
        contextsMap.delete(contextId);
      }
      else {
        context.logs.push(log);
      }
      setContextsMap(contextsMap);
      setContextsList([...contextsMap.values()]);
    }

    if (event.channel === ChannelEnum.EXTENSION_ACKNOWLEDGMENT) {
      return;
    }
    setTheLastLog(log);
  }, [event]);

  return (
    <Grid className={style.container} columns={10} gap="sm" justify="center" align="center" overflow="hidden">
      <Grid.Col span={7} >
        <Status log={theLastLog}/>
      </Grid.Col>
      <Grid.Col span={3}>
        <Activities contexts={contextsList} containerHeight={containerHeight}/>
      </Grid.Col>
    </Grid>
  );
}
