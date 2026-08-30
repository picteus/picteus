import React from "react";
import { Badge } from "@mantine/core";

import { ExtensionActivityKind } from "@picteus/ws-client";


type ExtensionActivityType = {
  kind?: ExtensionActivityKind;
};

export default function ExtensionActivity({
  kind
}: ExtensionActivityType)
{
  if (kind === undefined)
  {
    return null;
  }
  return (<Badge
    color={kind === ExtensionActivityKind.Connected ? "green" : kind === ExtensionActivityKind.Connecting ? "orange" : "red"}
    variant="dot"/>);
}
