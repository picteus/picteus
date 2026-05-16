import React from "react";
import { Divider, Image, Notification as MantineNotification, Text } from "@mantine/core";
import { IconFolderOpen, IconInfoCircle } from "@tabler/icons-react";

import { EventNotificationType } from "types";
import { timeAgoFromMilliseconds } from "utils";
import { useActionModalContext } from "app/context";
import { EventService, ImageService } from "app/services";
import { Common, ImageDetail } from "app/components";

import style from "./Notification.module.scss";


type NotificationType = {
  notification: EventNotificationType;
  toast?: boolean;
  withTime?: boolean;
  onClose?: () => void;
};

export default function Notification({
  notification,
  toast = false,
  withTime = false,
  onClose = () => {}
}: NotificationType) {
  const [, addModal, removeModal] = useActionModalContext();

  function handleOnClose() {
    if (!toast) {
      EventService.deleteNotification(notification.id);
      onClose();
    }
  }

  async function handleOnClick() {
    if (notification.type === "image") {
      const image = await ImageService.get({ id: notification.entityId });
      const id = addModal({
        component: (
          <ImageDetail
            image={image}
            images={[image]}
            viewMode="masonry"
            onClose={() => {
              removeModal(id);
            }}
          />),
        withCloseButton: false,
        fullScreen: true
      });
    }
  }

  function computeIcon() {
    if (!notification.iconUrl) {
      return <IconInfoCircle stroke={Common.IconStrokeSize} />;
    }
    if (notification.iconUrl === "repository") {
      return <IconFolderOpen stroke={Common.IconStrokeSize} />;
    }
    return (<div onClick={handleOnClick}>
        <Image src={notification.iconUrl} w={32} fit="contain" alt="Thumbnail" />
      </div>
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
            {timeAgoFromMilliseconds(notification.milliseconds)}
          </Text>
          <Divider />
        </>
      )}
    </>
  );
}
