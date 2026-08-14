import React, { useEffect, useSyncExternalStore } from "react";

import { NotificationsService } from "utils";
import { Notification } from "app/components";
import { NotificationService } from "app/services";


export default function NotificationCenter()
{
  const notification = useSyncExternalStore(NotificationService.subscribeToNotifications, NotificationService.getNotification);

  useEffect(() =>
  {
    if (notification)
    {
      NotificationsService.toast(<Notification notification={notification} isToast={true}/>);
    }
  }, [ notification ]);

  return <></>;
}
