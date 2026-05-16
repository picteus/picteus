import React, { useEffect, useState, useSyncExternalStore } from "react";
import { ActionIcon, Flex, HoverCard, Text } from "@mantine/core";
import { IconBell, IconBellZ } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { EventNotificationType } from "types";
import { generateRandomId } from "utils";
import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import { Common, Notification } from "app/components";


export default function NotificationToolbar() {
  const [t] = useTranslation();
  const { eventStore } = useEventSocket();
  const notification = useSyncExternalStore(eventStore.subscribeToNotifications, eventStore.getNotification);
  const [notifications, setNotifications] = useState<EventNotificationType[]>([]);
  const [seed, setSeed] = useState<string>(generateRandomId());

  useEffect(() => {
    EventService.getNotifications().then(setNotifications);
  }, [notification, seed]);

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
      <ActionIcon variant="outline" size="md">
        <IconBell stroke={Common.IconStrokeSize} />
      </ActionIcon>
    </HoverCard.Target>
    <HoverCard.Dropdown>
      {notifications?.length === 0 ? (
        <Flex align="center" justify="center" direction="column" p="md">
          <IconBellZ stroke={1} color="grey" size={38} />
          <Text c="dimmed" size={"sm"} mt="sm">
            {t("notifications.noNotifications")}
          </Text>
        </Flex>
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
          {notifications.map((notification) => (
            <div key={notification.id}>
              <Notification
                notification={notification}
                withTime={true}
                onClose={() => setSeed(generateRandomId())}
              />
            </div>
          ))}
        </>
      )}
    </HoverCard.Dropdown>
  </HoverCard>);
}
