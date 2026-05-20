import React, { ReactNode } from "react";
import { CloseButton, Flex, Notification as MantineNotification, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { EventNotificationType } from "types";
import { NotificationsService, timeAgoFromMilliseconds } from "utils";
import { useActionModalContext } from "app/context";
import { EventService, ImageService } from "app/services";
import { Common, ImageDetail, ImageThumbnail } from "app/components";

import style from "./Notification.module.scss";


type NotificationWrapperType = {
  notification: EventNotificationType;
  icon: ReactNode;
  onClose: () => void;
  onClick: () => void;
};

function MantineNotificationWrapper({ notification, icon, onClose, onClick }: NotificationWrapperType) {
  return (<MantineNotification
      onClose={onClose}
      styles={{ icon: { backgroundColor: "transparent" } }}
      icon={icon}
      title={notification.title}
    >
      <div className={style.description} onClick={onClick}>
        {notification.description}
      </div>
    </MantineNotification>
  );
}

function EnhancedNotificationWrapper({ notification, icon, onClose, onClick }: NotificationWrapperType) {
  return (
    <Flex align="flex-start" gap={8} onClick={onClick} className={style.description}>
      {icon}
      <Flex direction="column" gap={4} flex={1}>
        <Flex justify="space-between" align="center">
          <Text fw={500} size="sm">{notification.title}</Text>
          <CloseButton onClick={(event) => {
            event.stopPropagation();
            onClose();
          }} />
        </Flex>
        <Text c="gray" size="sm">
          {notification.description}
        </Text>
        <Text c="dimmed" size="xs">
          {timeAgoFromMilliseconds(notification.milliseconds)}
        </Text>
      </Flex>
    </Flex>
  );
}

type NotificationType = {
  notification: EventNotificationType;
  isToast?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
};

export default function Notification({ notification, isToast = false, onClose, onOpen }: NotificationType) {
  const [, addModal, removeModal] = useActionModalContext();

  function handleOnClose() {
    if (!isToast) {
      void EventService.deleteNotification(notification.id);
      if (onClose) {
        onClose();
      }
    }
  }

  async function handleOnClick() {
    let image;
    if (notification.type === "image") {
      try {
        image = await ImageService.get({ id: notification.entityId });
      }
      catch (error) {
        NotificationsService.apiCallError(error);
        return;
      }
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
    if (onOpen) {
      onOpen();
    }
  }

  function computeIcon(size: number) {
    if (!notification.entityUrl) {
      return <IconInfoCircle stroke={Common.IconStrokeSize} size={size}/>;
    }
    return (<div onClick={handleOnClick}>
        <ImageThumbnail imageOrUrl={notification.entityUrl} width={size} height={size} />
      </div>
    );
  }

  if (isToast) {
    return <MantineNotificationWrapper notification={notification} icon={computeIcon(32)} onClose={handleOnClose}
                                       onClick={handleOnClick} />;
  }
  else {
    return <EnhancedNotificationWrapper notification={notification} icon={computeIcon(64)} onClose={handleOnClose}
                                       onClick={handleOnClick} />;
  }
}
