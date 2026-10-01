import React, { ReactNode, useCallback, useMemo } from "react";
import { Checkbox, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { ImageOrSummary } from "types";
import { useImagesSelectedContext } from "app/context";


export type UseImageSelectionResultType = {

  isSelected: boolean;
  toggleSelectedImage: () => void;
};

export function useImageSelection(image: ImageOrSummary): UseImageSelectionResultType
{
  const { toggleSelectedImage: toggleImage, isSelectedImage } = useImagesSelectedContext();
  const isSelected = useMemo<boolean>(() => isSelectedImage(image), [ image, isSelectedImage ]);
  const toggleSelectedImage = useCallback((): void => toggleImage(image), [ image, toggleImage ]);
  return { isSelected, toggleSelectedImage };
}

export type ImageSelectCheckboxPropsType = {
  image: ImageOrSummary;
  isCompact: boolean;
  withTooltip?: boolean;
  checked?: boolean;
};

function ImageSelectCheckbox({
  image,
  isCompact,
  withTooltip = false,
  checked
}: ImageSelectCheckboxPropsType): ReactNode
{
  const [ t ] = useTranslation();
  const { isSelected: isImageSelected, toggleSelectedImage } = useImageSelection(image);
  const isChecked = checked ?? isImageSelected;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void
  {
    if (!event.defaultPrevented)
    {
      toggleSelectedImage();
    }
  }

  function handleClick(event: React.MouseEvent<HTMLElement>): void
  {
    event.stopPropagation();
  }

  const checkboxElement = (
    <Checkbox
      checked={isChecked}
      size={isCompact ? "sm" : "md"}
      onChange={handleChange}
      onClick={handleClick}
      wrapperProps={{ onClick: handleClick }}
    />
  );

  if (withTooltip === false)
  {
    return checkboxElement;
  }

  return (
    <Tooltip label={t(isChecked ? "button.removeFromSelection" : "button.addToSelection")} withArrow position="bottom">
      {checkboxElement}
    </Tooltip>
  );
}

export default React.memo(ImageSelectCheckbox);
