import React, { useCallback, useMemo } from "react";
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

export type OpenImageDetailModalFunctionType = (parameters: OpenImageDetailModalParameters) => string;

export interface UseImageDetailModalResultType extends OpenImageDetailModalFunctionType
{
  openImageDetailModal: OpenImageDetailModalFunctionType;
}

export default function useImageDetailModal(): UseImageDetailModalResultType
{
  const { addModal, removeModal } = useActionModalContext();

  const openImageDetailModal = useCallback(
    ({
      image,
      images,
      viewMode = "gallery"
    }: OpenImageDetailModalParameters): string =>
    {
      const modalId = addModal({
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
            onClose={() =>
            {
              removeModal(modalId);
            }}
          />
        )
      });

      return modalId;
    },
    [ addModal, removeModal ]
  );

  return useMemo((): UseImageDetailModalResultType =>
  {
    return Object.assign(openImageDetailModal, { openImageDetailModal });
  }, [ openImageDetailModal ]);
}
