import React from "react";
import { ActionIcon, HoverCard, Indicator } from "@mantine/core";
import { IconPhoto } from "@tabler/icons-react";

import { useImagesSelectedContext } from "app/context";
import { Common } from "app/components";
import { SelectedImages } from "../index.ts";


export default function SelectedImagesHover() {
  const { selectedImages} = useImagesSelectedContext();

  return (<HoverCard
    withinPortal={true}
    position="left"
    shadow="lg"
    withArrow
    arrowSize={Common.ArrowSize}
    offset={Common.RightSideBarOffset}
    closeDelay={Common.HoverCloseDelayInMilliseconds}
  >
    <HoverCard.Target>
      <Indicator inline color="orange" label={selectedImages.length} size={16}>
        <ActionIcon variant="outline" size="md">
          <IconPhoto stroke={Common.IconStrokeSize} />
        </ActionIcon>
      </Indicator>
    </HoverCard.Target>
    <HoverCard.Dropdown>
      <SelectedImages onProcessing={() =>
      {
      }} />
    </HoverCard.Dropdown>
  </HoverCard>);
}
