import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Overlay, Table, Text } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { formatDate, formatDimensions, formatSize } from "utils";
import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useEscapeKey, useImageNavigation } from "app/hooks";
import { ImageDetail, ImageItem } from "app/components";

import style from "./ImageTable.module.scss";


type ImageTableType = {
  data: ImageOrSummary[];
  onSelectedImage: (image: ImageOrSummary) => void;
  loadMore: () => void;
  containerWidth: number;
  containerRef: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageTable({
  data,
  onSelectedImage,
  loadMore,
  containerWidth,
  containerRef,
  imageItemMode,
}: ImageTableType) {
  const [selectedImage, setSelectedImage] = useState<ImageOrSummary>();
  const setSelectedImageWrapper = useCallback((image: ImageOrSummary) => {
    setSelectedImage(image);
    onSelectedImage(image);
  }, [setSelectedImage, onSelectedImage]);
  const navigation = useImageNavigation(selectedImage, setSelectedImageWrapper);
  const portalRef = useRef<HTMLDivElement>(null);
  useEscapeKey(portalRef, () => setSelectedImageWrapper(undefined));
  const [t] = useTranslation();
  const { ref, entry } = useIntersection({ root: null, threshold: 0.1 });

  useEffect(() => {
    navigation.setImages(data, selectedImage);
  }, [data]);

  useEffect(() => {
    if (entry?.isIntersecting === true) {
      loadMore();
    }
  }, [entry?.isIntersecting, loadMore]);

  if (!data || data.length === 0 || containerWidth <= 0) {
    return null;
  }

  const rows = data.map((image) => (
    <Table.Tr key={image.id}>
      <Table.Td style={{ width: 160 }}>
        <ImageItem
          image={image}
          caption={(image as ImageWithCaption).caption}
          width={160}
          height={160}
          mode={imageItemMode}
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
        <Text size="sm">{formatDimensions(image.dimensions)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatSize(image.sizeInBytes)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(image.modificationDate)}</Text>
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
        selectedImage && <div ref={portalRef} className={style.visualizedImage}>
          <Overlay
            color="#000"
            backgroundOpacity={1}
            zIndex={0}
          >
            <ImageDetail
              image={selectedImage}
              onClose={() => setSelectedImageWrapper((undefined))}
              hasPrevious={navigation.hasPrevious}
              hasNext={navigation.hasNext}
              onPrevious={navigation.onPrevious}
              onNext={navigation.onNext}
            />
          </Overlay>
        </div>,
        containerRef.current
      )}
    </>
  );
}
