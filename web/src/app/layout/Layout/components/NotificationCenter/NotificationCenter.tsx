import React, { useEffect } from "react";
import { useEventSocket } from "app/context";
import { EventInformationType } from "types";
import { notifyEvent } from "utils";
import { Notification } from "app/components";

export default function NotificationCenter() {
  const event: EventInformationType = useEventSocket();

  useEffect(() => {
    if (event?.notification) {
      (async () => {
        notifyEvent(<Notification event={event} toast={true} />);
      })();
    }
  }, [event]);

  return <></>;
}
