import React from "react";
import { Badge, MantineSize } from "@mantine/core";

import { Loader } from "../index.ts";
import { ExtensionStatus, RepositoryStatus } from "@picteus/ws-client";


type EntityStatusType = {
  type: "repository" | "extension";
  status: string;
  size?: MantineSize;
};

export default function EntityStatus({ type, status, size }: EntityStatusType)
{
  if (type === "repository") {
    if (status === RepositoryStatus.Indexing) {
      return (
        <Badge color="yellow" size={size} leftSection={<Loader />}>
          {status}
        </Badge>
      );
    }
    return <Badge color={status === RepositoryStatus.Ready ? "green" : "gray"} size={size}>{status}</Badge>;
  }
  else {
    return <Badge color={status === ExtensionStatus.Paused ? "gray" : "green"} size={size}>{status}</Badge>;
  }
}
