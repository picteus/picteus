import React, { useEffect, useState } from "react";
import { ActionIcon, Flex, Menu, Text } from "@mantine/core";
import { IconBell, IconBellZ } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { EventInformationType } from "types";
import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import { Notification } from "app/components";
import { generateRandomId } from "utils";
import style from "./NotificationToolbar.module.scss";

export default function NotificationToolbar() {
  const [t] = useTranslation();
  const lastEvent = useEventSocket();
  const [opened, setOpened] = useState(false);
  const [events, setEvents] = useState<EventInformationType[]>([]);
  const [seed, setSeed] = useState(generateRandomId);

  async function handleOnClearAll() {
    await EventService.markAllNotificationsAsSeen();
    setSeed(generateRandomId);
  }
  async function load() {
    const _events = await EventService.getEventsFromIndexedDB();
    setEvents(_events.filter((event) => event.notification?.seen === false));
  }

  useEffect(() => {
    void load();
  }, [lastEvent, seed]);

  return (
    <Menu
      opened={opened}
      withinPortal={false}
      position="left-start"
      withArrow
      offset={12}
      trigger="hover"
      openDelay={80}
      closeDelay={200}
      shadow="md"
      onChange={setOpened}
      width={350}
    >
      <Menu.Target>
        <ActionIcon variant="default" size="md">
          <IconBell stroke={1.2} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown className={style.dropdownContainer}>
        {events?.length === 0 ? (
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
            {events.map((event, index) => (
              <div
                key={
                  "inline-notification-" +
                  index +
                  "-" +
                  event.rawData.milliseconds
                }
              >
                <Notification
                  onClose={() => setSeed(generateRandomId)}
                  event={event}
                  withTime={true}
                />
              </div>
            ))}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
