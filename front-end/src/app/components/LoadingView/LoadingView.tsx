import React, { ReactNode } from "react";
import { Box, LoadingOverlay } from "@mantine/core";


type LoadingViewType = {
  visible: boolean;
  children?: ReactNode;
};

export default function LoadingView({
  visible,
  children
}: LoadingViewType): ReactNode
{
  if (visible)
  {
    return (<Box pos="relative" style={{ minHeight: 240 }}>
      <LoadingOverlay
        visible={visible}
        zIndex={2}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
    </Box>);
  }
  else
  {
    return children;
  }
}
