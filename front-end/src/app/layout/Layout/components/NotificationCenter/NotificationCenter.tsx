import React, { useEffect, useSyncExternalStore } from "react";

import { NotificationsService } from "utils";
import { useEventSocket } from "app/context";
import { Notification } from "app/components";


export default function NotificationCenter() {
  const { eventStore } = useEventSocket();
  const notification = useSyncExternalStore(eventStore.subscribeToNotifications, eventStore.getNotification);

  useEffect(() => {
    if (notification) {
      NotificationsService.toast(<Notification notification={notification} isToast={true} />);
    }
  }, [notification]);

  return <></>;
}
