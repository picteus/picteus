import React from "react";
import { ActionIcon, HoverCard, Indicator } from "@mantine/core";

import { useImagesSelectedContext } from "app/context";
import { Common, EntityIcons } from "app/components";
import { SelectedImages } from "..";


export default function SelectedImagesHover()
{
  const { selectedImages } = useImagesSelectedContext();
  const ImageIcon = EntityIcons.image;

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
      <Indicator inline color="orange" label={selectedImages.length} size={16} disabled={selectedImages.length === 0}>
        <ActionIcon variant="outline" size="md">
          <ImageIcon stroke={Common.IconStrokeSize}/>
        </ActionIcon>
      </Indicator>
    </HoverCard.Target>
    <HoverCard.Dropdown>
      <SelectedImages onProcessing={() =>
      {
      }}/>
    </HoverCard.Dropdown>
  </HoverCard>);
}
