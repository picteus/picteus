import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { IconDots } from "@tabler/icons-react";
import { ActionIcon, Checkbox, Flex, Menu } from "@mantine/core";

import { ImageItemMode, ImageOrSummary } from "types";
import { useImagesSelectedContext } from "app/context";
import { ImageService } from "app/services";
import { ImageItemMenu } from "app/components";
import style from "./ImageItem.module.scss";


type ImageItemType = {
  image: ImageOrSummary;
  caption?: ReactNode;
  width: number;
  height?: number;
  mode?: ImageItemMode;
  onClick: (data: ImageOrSummary) => void;
};

export default function ImageItem({
  image,
  caption,
  width,
  height,
  onClick,
  mode = ImageItemMode.VIEW,
}: ImageItemType) {
  const [hidePlaceholder, setHidePlaceholder] = useState<boolean>(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const [selectedImages, setSelectedImages] = useImagesSelectedContext();

  const handleOnSelectImage = useCallback(()=> {
    if (selectedImages.find((i) => i.id === image.id)) {
      setSelectedImages(selectedImages.filter((i) => i.id !== image.id));
    }
    else {
      setSelectedImages([...selectedImages, image]);
    }
  }, [selectedImages]);

  const handleOnClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (mode === ImageItemMode.SELECT) {
      return handleOnSelectImage();
    }
    if (target.getAttribute("data-action")) {
      onClick(image);
    }
  }, [handleOnSelectImage]);

  const handleOnChangeMenuOpened = useCallback((opened: boolean) => {
    setMenuOpened(opened);
  }, []);

  const isSelected = useMemo(
    () =>
      selectedImages.find((value) => value.id === image.id) !==
      undefined,
    [selectedImages, image],
  );

  return (
    <div
      className={`${style.imageWrapper} ${isSelected ? style.hover : ""}`}
      onClick={handleOnClick}
      style={{
        width: `${width}px`,
        height: height === undefined ? undefined : `${height}px`,
      }}
    >
      {caption && <div className={style.captionContainer}>{caption}</div>}
      <Flex
        data-action={true}
        p="sm"
        align="start"
        justify="space-between"
        style={menuOpened ? { opacity: 1 } : {}}
        className={style.overlay}
      >
        {mode !== ImageItemMode.PASSIVE && <Checkbox
          checked={isSelected}
          size={width < 200 ? "sm" : "md"}
          onChange={handleOnSelectImage}
        />}
        {mode === ImageItemMode.VIEW && (
          <Menu
            withinPortal={false}
            position="bottom-end"
            trigger="hover"
            openDelay={50}
            closeDelay={600}
            opened={menuOpened}
            onChange={handleOnChangeMenuOpened}
            shadow="md"
            width={260}
          >
            <Menu.Target>
              <ActionIcon variant="default">
                <IconDots />
              </ActionIcon>
            </Menu.Target>
            <ImageItemMenu image={image} />
          </Menu>
        )}
      </Flex>
      <img
        onLoad={async () => {
          setHidePlaceholder(true);
        }}
        loading="lazy"
        className={`${style.image} ${hidePlaceholder ? style.loaded : ""}`}
        src={ImageService.getImageSrc(image.uri, width, height)}
        alt={image.name}
        width={width}
        height={height ?? (width * image.dimensions.height / image.dimensions.width)}
      />
      {!hidePlaceholder && <div className={style.placeholder}></div>}
    </div>
  );
}
