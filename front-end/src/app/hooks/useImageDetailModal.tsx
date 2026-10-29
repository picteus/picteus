import React, { useCallback } from "react";
import { IconPhoto } from "@tabler/icons-react";

import { ImageOrSummary, ViewMode } from "types";
import { useActionModalContext } from "app/context";
import { Common, ImageDetail } from "app/components";


export interface OpenImageDetailModalParameters
{
  readonly image: ImageOrSummary;
  readonly images?: ImageOrSummary[];
  readonly viewMode?: ViewMode;
}

export type OpenImageDetailModalFunctionType = (parameters: OpenImageDetailModalParameters) => void;

export default function useImageDetailModal(): OpenImageDetailModalFunctionType
{
  const { addModal, removeModal } = useActionModalContext();

  return useCallback(
    ({
      image,
      images,
      viewMode = "gallery"
    }: OpenImageDetailModalParameters): void =>
    {
      addModal({
        isStackable: true,
        icon: {
          icon: <IconPhoto size={Common.IconXSmallSize} stroke={Common.IconStrokeSize}/>
        },
        title: image.name,
        body: (
          <ImageDetail
            image={image}
            images={images ?? [ image ]}
            viewMode={viewMode}
          />
        )
      });
    },
    [ addModal, removeModal ]
  );
}
