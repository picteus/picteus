import React, { type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Group, Notification as MantineNotification, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { EventOnResultValueType, NotificationType } from "types";
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
          const intent = notification.data.intent;
          intentRunner(notification.data.extensionId, intent, {
            onSuccess: (_value?: EventOnResultValueType) =>
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
        else
        {
          console.warn(`Cannot handle the unknown notification type '${notification.type}'`);
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
  showAction: boolean;
  notification: NotificationType;
  onClick: () => void;
};

function NotificationBody({
  showAction,
  isCompact,
  notification,
  onClick
}: NotificationBodyType): ReactElement
{
  const [ t ] = useTranslation();
  const hasAction = notification.type === "action" || notification.type === "image" || notification.type === "tab";
  const canShowAction = showAction === true && hasAction;

  const actionButton = (
    <Button
      variant="light"
      size="xs"
      mt={isCompact === true ? undefined : "xs"}
      style={{ flexShrink: 0 }}
      onClick={onClick}
    >
      {notification.type === "action" ? (notification.actionLabel ?? t("button.run")) : t("button.view")}
    </Button>
  );

  return (
    <>
      <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
        <div className={style.subtitle} style={{ minWidth: 0 }}>
          {notification.subtitle}
        </div>
        {isCompact === true && canShowAction === true && actionButton}
      </Group>
      {isCompact === false &&
        <>
          {notification.body !== undefined && (
            <Text size="sm" mt="xs" className={style.body}>
              {notification.body}
            </Text>
          )}
          {canShowAction === true && actionButton}
          <Text c="dimmed" size="xs" mt="xs">
            {timeAgoFromMilliseconds(notification.milliseconds)}
          </Text>
        </>}
    </>
  );
}

type NotificationPropsType = {
  isCompact: boolean;
  notification: NotificationType;
  onOpen: () => void;
  onClose: () => void;
  showAction?: boolean;
};

export default function Notification({
  isCompact,
  notification,
  onOpen,
  onClose
}: NotificationPropsType): ReactElement
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
      <NotificationBody
        isCompact={isCompact}
        showAction={true}
        notification={notification}
        onClick={handleOnClick}
      />
    </MantineNotification>
  );
}
