import type { ReactElement } from "react";
import { Spotlight } from "@mantine/spotlight";

import type { ImageSummary } from "@picteus/ws-client";

import { ImageSubtitle, ImageThumbnail } from "app/components";


type RecentImageSpotlightActionPropsType =
  {
    readonly imageId: string;
    readonly image: ImageSummary | undefined;
    readonly rightSection?: ReactElement;
    readonly shouldHighlightQuery?: boolean;
    readonly onSelect: (imageId: string, image?: ImageSummary) => void;
  };

export default function RecentImageSpotlightAction({
  imageId,
  image,
  rightSection,
  shouldHighlightQuery = false,
  onSelect
}: RecentImageSpotlightActionPropsType): ReactElement
{
  return (
    <Spotlight.Action
      onClick={(): void =>
      {
        onSelect(imageId, image);
      }}
      leftSection={image !== undefined ? <ImageThumbnail imageOrUrl={image} edge={28}/> : undefined}
      rightSection={rightSection}
      label={image?.name}
      description={image !== undefined ? <ImageSubtitle image={image}/> as unknown as string : undefined}
      highlightQuery={shouldHighlightQuery}
      keywords={[ image?.name ?? "" ]}
    />
  );
}
