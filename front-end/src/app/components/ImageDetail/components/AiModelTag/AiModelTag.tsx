import React from "react";
import { Badge } from "@mantine/core";


type AiModelTagType = {
  tag: string;
};

export default function AiModelTag({ tag }: AiModelTagType) {
  const match = tag.match(/^(([^/]+)\/)?([^:]+)(:(.+))?$/);

  if (match === null) {
    return (<Badge tt="none" variant="outline">        {tag}      </Badge>);
  }
  const editor = match[2];
  const model = match[3];
  const version = match[5];
  return (
    <Badge tt="none" variant="outline">
      {editor && (
        <span style={{ opacity: 0.6, fontWeight: "normal" }}>{editor}/</span>
      )}
      <span style={{ fontWeight: 700 }}>{model}</span>
      {version && (
        <span style={{ opacity: 0.6, fontWeight: "normal" }}>:{version}</span>
      )}
    </Badge>
  );
}
