import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Notification as MantineNotification, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { OpenBrowserIntent, ProcessCommandIntent, ShowIntent, UiIntent } from "@picteus/shared-core";

import { NotificationType } from "types";
import { computeDeskRoute, timeAgoFromMilliseconds, ToastService } from "utils";
import { useExtensionIntentRunner } from "app/hooks";
import { useDeskTabsContext } from "app/context";
import { EntityVisual } from "app/components";

import style from "./Notification.module.scss";


function useNotificationOnClick(onClose: () => void, onOpen: () => void): (notification: NotificationType) => () => Promise<void>
{
  const intentRunner = useExtensionIntentRunner();
  const { addTab } = useDeskTabsContext();
  const navigate = useNavigate();

  return (notification: NotificationType) =>
  {
    return async () =>
    {
      try
      {
        if (notification.type === "image")
        {
          addTab({
            id: notification.id,
            extensionId: notification.extensionId,
            label: notification.title,
            content: {
              kind: "image",
              imageId: notification.data.id
            }
          }, true);
        }
        else if (notification.type === "action")
        {
          const intent: ShowIntent | UiIntent | OpenBrowserIntent | ProcessCommandIntent = notification.data.intent;
          intentRunner(notification.data.extensionId, intent, {
            onSuccess: (_result?: any) =>
            {
            },
            onCancel: () =>
            {
            },
            onFailure: ToastService.failure
          });
        }
        else if (notification.type === "tab")
        {
          navigate(computeDeskRoute(notification.data.id));
        }
        onOpen();
      }
      finally
      {
        onClose();
      }
    };
  };
}

type NotificationBodyType = {
  isCompact: boolean;
  notification: NotificationType;
  onClick: () => void;
};

function NotificationBody({ isCompact, notification, onClick }: NotificationBodyType)
{
  const [ t ] = useTranslation();

  return (
    <>
      <div className={style.subtitle}>
        {notification.subtitle}
      </div>
      {isCompact === false && <>
        {notification.body !== undefined && (
          <Text size="sm" mt="xs" className={style.body}>
            {notification.body}
          </Text>
        )}
        {(notification.type === "action" || notification.type === "repository" || notification.type === "image" || notification.type === "tab") && (
          <Button variant="light" size="xs" mt="xs" onClick={onClick}>
            {notification.type === "action" ? (notification.actionLabel ?? t("button.run")) : t("button.view")}
          </Button>
        )}
        <Text c="dimmed" size="xs" mt="xs">
          {timeAgoFromMilliseconds(notification.milliseconds)}
        </Text>
      </>}
    </>
  );
}

type TheNotificationType = {
  isCompact: boolean;
  notification: NotificationType;
  onOpen: () => void;
  onClose: () => void;
};

export default function Notification({ isCompact, notification, onOpen, onClose }: TheNotificationType)
{
  const handleOnClick = useNotificationOnClick(onClose, onOpen)(notification);

  return (
    <MantineNotification
      classNames={{
        root: isCompact === true ? style.rootCompact : style.root,
        icon: isCompact === true ? style.iconCompact : style.icon
      }}
      icon={<EntityVisual illustrationUri={notification.illustrationUri} isCompact={isCompact}/>}
      title={notification.title}
      withBorder={isCompact}
      onClose={onClose}
    >
      <NotificationBody isCompact={isCompact} notification={notification} onClick={handleOnClick}/>
    </MantineNotification>
  );

}
