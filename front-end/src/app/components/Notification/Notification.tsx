import React, { ReactNode } from "react";
import { CloseButton, Flex, Image as MantineImage, Notification as MantineNotification, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { Image } from "@picteus/ws-client";

import { NotificationType } from "types";
import { NotificationsService, timeAgoFromMilliseconds } from "utils";
import { useActionModalContext } from "app/context";
import { ImageService, NotificationService } from "app/services";
import { Common, ImageDetail } from "app/components";

import style from "./Notification.module.scss";
import variables from "../../../assets/style/variablesExport.module.scss";


type NotificationWrapperType = {
  notification: NotificationType;
  icon: ReactNode;
  onClick: () => void;
  onClose: () => void;
};

function MantineNotificationWrapper({ notification, icon, onClick, onClose }: NotificationWrapperType)
{
  return (<MantineNotification
      onClose={onClose}
      styles={{ icon: { backgroundColor: "transparent" } }}
      icon={icon}
      title={notification.title}
    >
      <div className={style.description} onClick={onClick}>
        {notification.subtitle}
      </div>
    </MantineNotification>
  );
}

function EnhancedNotificationWrapper({ notification, icon, onClick, onClose }: NotificationWrapperType)
{
  return (
    <Flex align="flex-start" gap={8} onClick={onClick} className={style.wrapper}>
      {icon}
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

type TheNotificationType = {
  notification: NotificationType;
  isToast?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

export default function Notification({ notification, isToast = false, onOpen, onClose }: TheNotificationType)
{
  const [ , addModal, removeModal ] = useActionModalContext();

  function handleOnClose(): void
  {
    if (!isToast)
    {
      void NotificationService.deleteNotification(notification.id);
      if (onClose)
      {
        onClose();
      }
    }
  }

  async function handleOnClick(): Promise<void>
  {
    let image: Image;
    if (notification.type === "image")
    {
      try
      {
        image = await ImageService.get({ id: notification.entityId });
      }
      catch (error)
      {
        NotificationsService.apiCallError(error);
        return;
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
    if (onOpen)
    {
      onOpen();
    }
  }

  function computeIcon(size: number): React.ReactNode
  {
    if (notification.illustrationUri === undefined)
    {
      return <IconInfoCircle stroke={Common.IconStrokeSize} size={size}/>;
    }
    return (<div onClick={handleOnClick}>
        {/*<ImageThumbnail imageOrUrl={notification.entityUrl} width={size} height={size}/>*/}
        <MantineImage
          alt={"Illustration"}
          w={size}
          h={size}
          fit="contain"
          radius={variables.imageRadius}
          src={notification.illustrationUri}
          // The fallback URL is taken from https://tabler.io/icons?icon=alert-octagon
          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23868e96' stroke-width='1' stroke-linecap='round' stroke-linejoin='round' class='icon icon-tabler icons-tabler-outline icon-tabler-alert-octagon'%3E%3Cpath stroke='none' d='M0 0h24v24H0z' fill='none' /%3E%3Cpath d='M12.802 2.165l5.575 2.389c.48 .206 .863 .589 1.07 1.07l2.388 5.574c.22 .512 .22 1.092 0 1.604l-2.389 5.575c-.206 .48 -.589 .863 -1.07 1.07l-5.574 2.388c-.512 .22 -1.092 .22 -1.604 0l-5.575 -2.389a2.036 2.036 0 0 1 -1.07 -1.07l-2.388 -5.574a2.036 2.036 0 0 1 0 -1.604l2.389 -5.575c.206 -.48 .589 -.863 1.07 -1.07l5.574 -2.388a2.036 2.036 0 0 1 1.604 0' /%3E%3Cpath d='M12 8v4' /%3E%3Cpath d='M12 16h.01' /%3E%3C/svg%3E"
        />
      </div>
    );
  }

  if (isToast)
  {
    return <MantineNotificationWrapper notification={notification} icon={computeIcon(32)} onClick={handleOnClick}
                                       onClose={handleOnClose}/>;
  }
  else
  {
    return <EnhancedNotificationWrapper notification={notification} icon={computeIcon(64)} onClick={handleOnClick}
                                        onClose={handleOnClose}/>;
  }
}
