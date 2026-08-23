import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActionIcon, Divider, Flex, HoverCard, Indicator, Stack, Text } from "@mantine/core";
import { randomId } from "@mantine/hooks";
import { IconBell, IconBellZ } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { NotificationType } from "types";
import { NotificationService } from "app/services";
import { Common, EmptyResults, Notification } from "app/components";

import style from "./Notifications.module.scss";


export default function Notifications()
{
  const [ t ] = useTranslation();
  const notification = useSyncExternalStore(NotificationService.subscribeToNotifications, NotificationService.getNotification);
  const [ notifications, setNotifications ] = useState<NotificationType[]>([]);
  const [ seed, setSeed ] = useState<string>(randomId());
  const [ hoverCardKey, setHoverCardKey ] = useState<string>(randomId());

  useEffect(() =>
  {
    NotificationService.getNotifications().then(setNotifications);
  }, [ notification, seed ]);

  const renderedNotifications = useMemo(() => notifications.map((notification, index) => (
    <div key={notification.id}>
      <Notification
        useMantine={false}
        notification={notification}
        onOpen={() => setHoverCardKey(randomId())}
        onClose={() =>
        {
          void NotificationService.deleteNotification(notification.id);
          setSeed(randomId());
        }}
      />
      {index < (notifications.length - 1) && (<Divider mt={8} mb={8}/>)}
    </div>
  )), [ notifications ]);

  async function handleOnClearAll()
  {
    await NotificationService.deleteAllNotifications();
    setSeed(randomId());
  }

  return (<HoverCard
    key={hoverCardKey}
    withinPortal={true}
    position="left"
    shadow="lg"
    withArrow
    arrowSize={Common.ArrowSize}
    offset={Common.RightSideBarOffset}
    closeDelay={Common.HoverCloseDelayInMilliseconds}
    width={350}
  >
    <HoverCard.Target>
      <Indicator inline color="orange" label={notifications.length} size={16}>
        <ActionIcon variant="outline" size="md">
          <IconBell stroke={Common.IconStrokeSize}/>
        </ActionIcon>
      </Indicator>
    </HoverCard.Target>
    <HoverCard.Dropdown>
      <Stack gap={10} className={style.container}>
        {notifications?.length === 0 ? (
          <EmptyResults
            icon={IconBellZ}
            isSmall={true}
            title={t("notifications.empty.title")}
            description={t("notifications.empty.description")}
          />
        ) : (
          <>
            <Flex mr="sm" align="flex-end" justify="flex-end">
              <Text
                style={{ cursor: "pointer" }}
                c="dimmed"
                td={"underline"}
                size={"sm"}
                onClick={handleOnClearAll}
              >
                {t("button.clearAll")}
              </Text>
            </Flex>
            {renderedNotifications}
          </>
        )}
      </Stack>
    </HoverCard.Dropdown>
  </HoverCard>);
}
