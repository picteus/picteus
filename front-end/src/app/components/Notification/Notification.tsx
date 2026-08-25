import React from "react";
import { Button, Image as MantineImage, Notification as MantineNotification, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { ProcessCommandIntent, ShowIntent, UiIntent } from "@picteus/shared-core";
import { Image } from "@picteus/ws-client";

import { NotificationType } from "types";
import { timeAgoFromMilliseconds, ToastService } from "utils";
import { useExtensionIntentRunner } from "app/hooks";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { Common, ImageDetail } from "app/components";

import variables from "../../../assets/style/variablesExport.module.scss";
import style from "./Notification.module.scss";
import { useTranslation } from "react-i18next";


function useNotificationOnClick(onClose: () => void, onOpen: () => void): (notification: NotificationType) => () => Promise<void>
{
  const intentRunner = useExtensionIntentRunner();
  const [ , addModal, removeModal ] = useActionModalContext();

  return (notification: NotificationType) =>
  {
    return async () =>
    {
      try
      {
        if (notification.type === "image")
        {
          const imageId = notification.data.id;
          let image: Image;
          try
          {
            image = await ImageService.get({ id: imageId });
          }
          catch (error)
          {
            return ToastService.apiCallError(error);
          }
          const id = addModal({
            component: (
              <ImageDetail
                image={image}
                images={[ image ]}
                viewMode="masonry"
                onClose={() =>
                {
                  removeModal(id);
                }}
              />),
            withCloseButton: false,
            fullScreen: true
          });
        }
        else if (notification.type === "action")
        {
          const intent: ShowIntent | UiIntent | ProcessCommandIntent = notification.data.intent;
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
        onOpen();
      }
      finally
      {
        onClose();
      }
    };
  };
}

type NotificationIconType = {
  notification: NotificationType;
  size: number;
};

function NotificationIcon({ notification, size }: NotificationIconType)
{
  if (notification.illustrationUri === undefined)
  {
    return <IconInfoCircle stroke={Common.IconStrokeSize} size={size}/>;
  }
  return <MantineImage
    alt={"Illustration"}
    w={size}
    h={size}
    fit="contain"
    radius={variables.imageRadius}
    src={notification.illustrationUri}
    fallbackSrc={Common.FallbackImageUrl}
  />;
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
        {(notification.type === "action" || notification.type === "repository" || notification.type === "image") && (
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
      icon={<NotificationIcon notification={notification}
                              size={isCompact === true ? Common.ToastIconEdge : Common.NotificationIllustrationEdge}/>}
      title={notification.title}
      withBorder={isCompact}
      onClose={onClose}
    >
      <NotificationBody isCompact={isCompact} notification={notification} onClick={handleOnClick}/>
    </MantineNotification>
  );

}
