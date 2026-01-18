import React from "react";
import { Divider, Notification as MantineNotification, Text } from "@mantine/core";
import { IconFolderOpen, IconInfoCircle } from "@tabler/icons-react";

import { timeAgoFromMilliseconds } from "utils";
import { EventInformationType, EventNotificationType } from "types";
import { EventService, ImageService } from "app/services";
import { useImageVisualizerContext } from "app/context";

import style from "./Notification.module.scss";

type NotificationType = {
  event: EventInformationType;
  onClose?: () => void;
  toast?: boolean;
  withTime?: boolean;
};

export default function Notification({
  event,
  onClose = () => {},
  toast = false,
  withTime = false,
}: NotificationType) {
  const notification: EventNotificationType = event.notification;
  const [, setImageVisualizer] = useImageVisualizerContext();

  function handleOnClose() {
    if (!toast) {
      EventService.clearNotification(event.id);
      onClose();
    }
  }

  async function handleOnClick() {
    if (notification.type === "image") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const image = await ImageService.get({ id: event.rawData.value.id });
      setImageVisualizer({ imageSummary: image });
    }
  }

  function computeIcon() {
    if (!notification.iconUrl) {
      return <IconInfoCircle stroke={1.2} />;
    }
    if (notification.iconUrl === "repository") {
      return <IconFolderOpen stroke={1.2} />;
    }
    return (
      <img
        onClick={handleOnClick}
        className={style.icon}
        alt="Thumbnail"
        src={notification.iconUrl}
      />
    );
  }

  return (
    <>
      <MantineNotification
        onClose={handleOnClose}
        styles={{
          icon: {
            backgroundColor: "transparent",
          },
          ...(!toast
            ? {
                root: { border: "none", boxShadow: "none" },
              }
            : {}),
        }}
        icon={computeIcon()}
        title={notification.title}
      >
        <div className={style.description} onClick={handleOnClick}>
          {notification.description}
        </div>
      </MantineNotification>
      {withTime && (
        <>
          <Text c="dimmed" size="xs" pl="xs" pb="xs">
            {timeAgoFromMilliseconds(notification.timeInMilliseconds)}
          </Text>
          <Divider />
        </>
      )}
    </>
  );
}
