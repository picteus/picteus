import React from "react";
import { Badge } from "@mantine/core";

import { ExtensionActivityKind } from "@picteus/ws-client";


type ExtensionActivityType = {
  activityKind: ExtensionActivityKind;
};

export default function ExtensionActivity({
  activityKind
}: ExtensionActivityType)
{
  return (<Badge
    color={activityKind === ExtensionActivityKind.Connected ? "green" : activityKind === ExtensionActivityKind.Connecting ? "orange" : "red"}
    variant="dot"/>);
}
