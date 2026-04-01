import React, { useEffect, useSyncExternalStore } from "react";
import { useEventSocket } from "app/context";
import { notifyEvent } from "utils";
import { Notification } from "app/components";

export default function NotificationCenter() {
  const { eventStore } = useEventSocket();
  const event = useSyncExternalStore(eventStore.subscribe, eventStore.getEvent);

  useEffect(() => {
    if (event?.notification) {
      (async () => {
        notifyEvent(<Notification event={event} toast={true} />);
      })();
    }
  }, [event]);

  return <></>;
}
