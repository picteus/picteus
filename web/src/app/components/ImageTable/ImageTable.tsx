import React, { RefObject, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Overlay, Table, Text } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useContainerDimensions, useEscapeKey, useImageNavigation } from "app/hooks";
import { FormatedDate, ImageDetail, ImageItem } from "app/components";

import style from "./ImageTable.module.scss";
import { ImageDimensions, ImageWeight } from "../ImageDetail/components";


type ImageTableType = {
  images: ImageOrSummary[];
  onSelectedImage: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerRef: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageTable({
  images,
  onSelectedImage,
  loadMore,
  containerRef,
  imageItemMode,
}: ImageTableType) {
  const edge = 160;
  const navigation = useImageNavigation();
  const { width: containerWidth } = useContainerDimensions(containerRef);
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    navigation.setSelectedImage(image);
    onSelectedImage(image);
  }, [onSelectedImage, navigation]);
  const portalRef = useRef<HTMLDivElement>(null);
  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));
  const [t] = useTranslation();
  const { ref, entry } = useIntersection({ root: null, threshold: 0.1 });

  useEffect(() => {
    navigation.setImages(images);
  }, [images]);

  useEffect(() => {
    if (entry?.isIntersecting === true) {
      loadMore();
    }
  }, [entry?.isIntersecting, loadMore]);

  if (!images || images.length === 0 || containerWidth <= 0) {
    return null;
  }

  const rows = images.map((image) => (
    <Table.Tr key={image.id}>
      <Table.Td style={{ width: edge }}>
        <ImageItem
          image={image}
          overlay={(image as ImageWithCaption).caption}
          width={edge}
          height={edge}
          mode={imageItemMode}
          viewMode="table"
          onClick={() =>
            setSelectedImageWrapper(image)
          }
        />
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500}>
          {image.name}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{image.format}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm"><ImageDimensions dimensions={image.dimensions} /></Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm"><ImageWeight image={image} /></Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm"><FormatedDate timestamp={image.fileDates.modificationDate}/></Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Table highlightOnHover striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th/>
            <Table.Th>{t("field.name")}</Table.Th>
            <Table.Th>{t("field.format")}</Table.Th>
            <Table.Th>{t("field.dimensions")}</Table.Th>
            <Table.Th>{t("field.size")}</Table.Th>
            <Table.Th>{t("field.modifiedOn")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
      <div ref={ref} style={{ width: "100%", height: 20 }} />
      {createPortal(
        navigation.selectedImage && <div ref={portalRef} className={style.visualizedImage}>
          <Overlay
            color="#000"
            backgroundOpacity={1}
            zIndex={0}
          >
            <ImageDetail
              image={navigation.selectedImage}
              withNavigation={navigation}
              viewMode="table"
              onClose={() => setSelectedImageWrapper((undefined))}
            />
          </Overlay>
        </div>,
        containerRef.current
      )}
    </>
  );
}
