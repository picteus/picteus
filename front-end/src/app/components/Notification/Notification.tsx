import React, { ReactNode } from "react";
import { CloseButton, Flex, Image as MantineImage, Notification as MantineNotification, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { ProcessCommandIntent, ShowIntent, UiIntent } from "@picteus/shared-core";
import { Image } from "@picteus/ws-client";

import { NotificationType } from "types";
import { NotificationsService, timeAgoFromMilliseconds } from "utils";
import { useExtensionIntentRunner } from "app/hooks";
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
  const intentRunner = useExtensionIntentRunner();
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
          onFailure: NotificationsService.withMessage
        });
      }
      if (onOpen !== undefined)
      {
        onOpen();
      }
    }
    finally
    {
      handleOnClose();
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
          fallbackSrc={Common.FallbackImageUrl}
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
    return <EnhancedNotificationWrapper notification={notification}
                                        icon={computeIcon(Common.NotificationIllustrationEdge)} onClick={handleOnClick}
                                        onClose={handleOnClose}/>;
  }
}
