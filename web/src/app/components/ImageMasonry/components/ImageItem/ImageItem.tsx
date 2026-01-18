import React, { ReactNode, useMemo, useState } from "react";
import { ImageSummary } from "@picteus/ws-client";
import { IconDots } from "@tabler/icons-react";
import { ActionIcon, Checkbox, Flex, Menu } from "@mantine/core";

import { ImageItemMode } from "types";
import { useImagesSelectedContext } from "app/context";
import { ImageService } from "app/services";

import { ImageItemMenu } from "./components";
import style from "./ImageItem.module.scss";

type ImageItemType = {
  width: number;
  imageSummary: ImageSummary;
  mode?: ImageItemMode;
  onClick: (data: ImageSummary) => void;
  caption?: ReactNode;
};

export default function ImageItem({
  width,
  imageSummary,
  onClick,
  mode = ImageItemMode.VIEW,
  caption,
}: ImageItemType) {
  const [hidePlaceholder, setHidePlaceholder] = useState<boolean>(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const [selectedImages, setSelectedImages] = useImagesSelectedContext();

  function handleOnClick(event: React.MouseEvent<HTMLElement>) {
    event.stopPropagation();
    const target = event.target as HTMLElement;

    if (mode === ImageItemMode.SELECT) {
      return handleOnSelectImage();
    }

    if (target.getAttribute("data-action")) {
      onClick(imageSummary);
    }
  }

  function handleOnChangeMenuOpened(e) {
    setMenuOpened(e);
  }

  function handleOnSelectImage() {
    if (selectedImages.find((i) => i.id === imageSummary.id)) {
      setSelectedImages(selectedImages.filter((i) => i.id !== imageSummary.id));
    } else {
      setSelectedImages([...selectedImages, imageSummary]);
    }
  }

  const isSelected = useMemo(
    () =>
      selectedImages.find((value) => value.id === imageSummary.id) !==
      undefined,
    [selectedImages, imageSummary],
  );

  return imageSummary ? (
    <div
      className={`${style.imageWrapper} ${isSelected ? style.hover : ""}`}
      onClick={handleOnClick}
      style={{
        width: width + "px",
        height:
          (width * imageSummary.dimensions.height) /
            imageSummary.dimensions.width +
          "px",
      }}
    >
      {caption && <div className={style.captionContainer}>{caption}</div>}
      <div
        style={menuOpened ? { opacity: 1 } : {}}
        className={style.overlay}
        data-action={true}
      >
        <Flex data-action={true} p="sm" align="center" justify="space-between">
          <Checkbox
            checked={isSelected}
            size={width < 200 ? "sm" : "md"}
            onChange={handleOnSelectImage}
          />
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

              <ImageItemMenu imageSummary={imageSummary} />
            </Menu>
          )}
        </Flex>
      </div>
      <img
        onLoad={async () => {
          await new Promise((r) => setTimeout(r, 50));
          setHidePlaceholder(true);
        }}
        loading="lazy"
        className={`${style.image} ${hidePlaceholder ? style.loaded : ""}`}
        src={ImageService.getImageSrc(imageSummary.uri, width)}
        alt={imageSummary.name}
      />
      {!hidePlaceholder && <div className={style.placeholder}></div>}
    </div>
  ) : (
    <></>
  );
}
