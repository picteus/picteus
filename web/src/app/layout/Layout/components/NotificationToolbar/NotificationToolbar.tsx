import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ActionIcon, Divider, Flex, HoverCard, Indicator, Stack, Text } from "@mantine/core";
import { IconBell, IconBellZ } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { EventNotificationType } from "types";
import { generateRandomId } from "utils";
import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import { Common, EmptyResults, Notification } from "app/components";

import style from "./NotificationToolbar.module.scss";

export default function NotificationToolbar() {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const notification = useSyncExternalStore(eventStore.subscribeToNotifications, eventStore.getNotification);
  const [notifications, setNotifications] = useState<EventNotificationType[]>([]);
  const [seed, setSeed] = useState<string>(generateRandomId());

  useEffect(() => {
    EventService.getNotifications().then(setNotifications);
  }, [notification, seed]);

  const renderedNotifications = useMemo(() => notifications.map((notification, index) => (
    <div key={notification.id}>
      <Notification
        notification={notification}
        withTime={true}
        onClose={() => setSeed(generateRandomId())}
      />
      {index < (notifications.length - 1) && (<Divider />)}
    </div>
  )), [notifications]);

  async function handleOnClearAll() {
    await EventService.deleteAllNotifications();
    setSeed(generateRandomId());
  }

  return (<HoverCard
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
          <IconBell stroke={Common.IconStrokeSize} />
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
