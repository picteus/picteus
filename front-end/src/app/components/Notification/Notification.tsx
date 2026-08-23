import React from "react";
import { CloseButton, Flex, Image as MantineImage, Notification as MantineNotification, Text } from "@mantine/core";
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

function useNotificationOnClick(onClose: () => void, onOpen: () => void): (notification: NotificationType) => (() => Promise<void>)
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

type TheNotificationType = {
  useMantine: boolean;
  notification: NotificationType;
  onOpen: () => void;
  onClose: () => void;
};

export default function Notification({ useMantine, notification, onOpen, onClose }: TheNotificationType)
{
  const handleOnClick = useNotificationOnClick(onClose, onOpen)(notification);

  if (useMantine)
  {
    return (
      <MantineNotification
        styles={{ icon: { backgroundColor: "transparent" } }}
        icon={<div onClick={handleOnClick}><NotificationIcon notification={notification} size={Common.ToastIconEdge}/>
        </div>}
        title={notification.title}
        withBorder
      >
        <div className={style.description} onClick={handleOnClick}>
          {notification.subtitle}
        </div>
      </MantineNotification>
    );
  }
  else
  {
    return (
      <Flex align="flex-start" gap={8} onClick={handleOnClick} className={style.wrapper}>
        <div onClick={handleOnClick}><NotificationIcon notification={notification}
                                                       size={Common.NotificationIllustrationEdge}/></div>
        <Flex direction="column" gap={4} flex={1}>
          <Flex justify="space-between" align="center">
            <Text fw={500} size="sm">{notification.title}</Text>
            <CloseButton onClick={(event) =>
            {
              event.stopPropagation();
              onClose();
            }}/>
          </Flex>
          <Text c="gray" size="sm" className={style.description}>
            {notification.subtitle}
          </Text>
          <Text c="dimmed" size="xs">
            {timeAgoFromMilliseconds(notification.milliseconds)}
          </Text>
        </Flex>
      </Flex>
    );
  }
}
