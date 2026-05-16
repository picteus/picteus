import React, { useEffect, useSyncExternalStore } from "react";

import { notifyEvent } from "utils";
import { useEventSocket } from "app/context";
import { Notification } from "app/components";


export default function NotificationCenter() {
  const { eventStore } = useEventSocket();
  const notification = useSyncExternalStore(eventStore.subscribeToNotifications, eventStore.getNotification);

  useEffect(() => {
    if (notification) {
      notifyEvent(<Notification notification={notification} toast={true} />);
    }
  }, [notification]);

  return <></>;
}
