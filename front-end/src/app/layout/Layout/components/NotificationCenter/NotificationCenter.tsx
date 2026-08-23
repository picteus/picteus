import React, { useEffect, useSyncExternalStore } from "react";

import { ToastService } from "utils";
import { NotificationService } from "app/services";
import { Notification } from "app/components";


export default function NotificationCenter()
{
  const notification = useSyncExternalStore(NotificationService.subscribeToNotifications, NotificationService.getNotification);

  useEffect(() =>
  {
    if (notification)
    {
      const id = "notification";
      const options = { position: "top-center" as const, toastId: id };
      const noOperation = () =>
      {
      };
      const content = <Notification useMantine={true}
                                    notification={notification}
                                    onOpen={() =>
                                    {
                                      void NotificationService.deleteNotification(notification.id);
                                      dismiss();
                                    }}
                                    onClose={noOperation}/>;
      const dismiss = ToastService.triggerToast(content, options, id);
    }
  }, [ notification ]);

  return <></>;
}
