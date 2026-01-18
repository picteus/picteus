import { useTranslation } from "react-i18next";
import { Badge, Text } from "@mantine/core";

import { useEventSocket } from "app/context";
import { EventService } from "app/services";
import style from "./EventInformation.module.scss";
import { timeAgoFromMilliseconds } from "utils";
import { useEffect, useState } from "react";

export default function EventInformation() {
  const [t] = useTranslation();
  const data = useEventSocket();
  const [lastEventDate, setLastEventDate] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    const updateTime = () => {
      setLastEventDate(timeAgoFromMilliseconds(data.rawData.milliseconds));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <div className={style.container}>
      {data ? (
        <>
          <Badge
            size="xs"
            color={EventService.computeLogLevelColor(data.logLevel)}
          >
            {data.logLevel}
          </Badge>
          <Text size="xs">{data.statusText}</Text>
          <Text size="xs" c="dimmed">
            {lastEventDate}
          </Text>
        </>
      ) : (
        <Text size="xs">{t("eventInformation.idle")}</Text>
      )}
    </div>
  );
}
