import React from "react";
import { Badge } from "@mantine/core";

import { ExtensionActivity as ApiExtensionActivity, ExtensionActivityState } from "@picteus/ws-client";


type ExtensionActivityType = {
  activity: ApiExtensionActivity;
};

export default function ExtensionActivity({
  activity
}: ExtensionActivityType)
{
  const color = activity.isInError ? "red" : ((activity.connection === ExtensionActivityState.Started && activity.process === ExtensionActivityState.Started) ? "green" : ((activity.connection === ExtensionActivityState.Stopped || activity.process === ExtensionActivityState.Stopped) ? "orange" : "red"));

  return (
    <Badge
      color={color}
      variant="dot"
    />
  );
}
