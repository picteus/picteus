import { ReactElement } from "react";
import { Box, Tooltip } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { ImageSummary } from "@picteus/ws-client";

import { ImagePickerSelectionModeType } from "types";
import ImageThumbnail from "../../../ImageThumbnail/ImageThumbnail.tsx";
import style from "../../ImagePicker.module.scss";


type ImagePickerGridPropsType = {
  readonly images: readonly ImageSummary[];
  readonly selectedIds: readonly string[];
  readonly selectionMode: ImagePickerSelectionModeType;
  readonly onToggle: (imageId: string) => void;
};

const THUMBNAIL_REQUEST_EDGE = 284;

export default function ImagePickerGrid({
  images,
  selectedIds,
  selectionMode,
  onToggle
}: ImagePickerGridPropsType): ReactElement
{
  const selectedSet = new Set(selectedIds);

  return (
    <Box
      className={style.imageGrid}
      role={selectionMode === "single" ? "radiogroup" : "group"}
    >
      {images.map((image) =>
      {
        const isSelected = selectedSet.has(image.id);
        return (
          <Tooltip key={image.id} label={image.name} openDelay={400}>
            <button
              type="button"
              className={`${style.imageTile}${isSelected === true ? ` ${style.imageTileSelected}` : ""}`}
              aria-pressed={isSelected}
              onClick={() => onToggle(image.id)}
            >
              <ImageThumbnail
                imageOrUrl={image}
                edge="100%"
                requestEdge={THUMBNAIL_REQUEST_EDGE}
                fit="cover"
                radius={0}
                loading="lazy"
              />
              <span
                className={`${style.checkIndicator}${isSelected === true ? ` ${style.checkIndicatorSelected}` : ""}`}
                aria-hidden="true"
              >
                {isSelected === true && <IconCheck size={14} stroke={2.5}/>}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </Box>
  );
}
