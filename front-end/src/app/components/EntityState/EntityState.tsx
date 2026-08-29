import React from "react";
import { Badge, MantineSize } from "@mantine/core";

import { Loader } from "../index.ts";
import { ExtensionState, RepositoryState } from "@picteus/ws-client";


type EntityStateType = {
  type: "repository" | "extension";
  state: string;
  size?: MantineSize;
};

export default function EntityState({ type, state, size }: EntityStateType)
{
  if (type === "repository")
  {
    if (state === RepositoryState.Indexing)
    {
      return (
        <Badge color="yellow" size={size} leftSection={<Loader/>}>
          {state}
        </Badge>
      );
    }
    return <Badge color={state === RepositoryState.Ready ? "green" : "gray"} size={size}>{state}</Badge>;
  }
  else
  {
    return <Badge color={state === ExtensionState.Paused ? "gray" : "green"} size={size}>{state}</Badge>;
  }
}
