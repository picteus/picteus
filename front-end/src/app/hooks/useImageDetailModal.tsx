import React, { useCallback } from "react";
import { IconPhoto } from "@tabler/icons-react";

import { ImageOrSummary, ViewMode } from "types";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { Common, ImageDetail, ImageSubtitle } from "app/components";


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
      const imageUrl = image.url ? ImageService.getImageSrc(image.url, Common.BreadcrumbEdge, Common.BreadcrumbEdge) : undefined;

      addModal({
        isStackable: true,
        icon: imageUrl
          ? { url: imageUrl }
          : { icon: <IconPhoto size={Common.BreadcrumbEdge} stroke={Common.IconStrokeSize}/> },
        subtitle: <ImageSubtitle image={image}/>,
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
