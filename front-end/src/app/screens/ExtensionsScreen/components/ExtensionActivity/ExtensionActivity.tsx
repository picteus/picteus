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
  return (<Badge
    color={activity.connection === ExtensionActivityState.Started ? "green" : activity.connection === ExtensionActivityState.Stopped ? "orange" : "red"}
    variant="dot"/>);
}
