import React, { RefObject, useCallback, useEffect } from "react";
import { Table, Text } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useActionModalContext } from "app/context";
import { useContainerDimensions } from "app/hooks";
import { FormatedDate, ImageDetail, ImageItem } from "app/components";
import { ImageDimensions, ImageWeight } from "../ImageDetail/components";


type ImageTableType = {
  images: ImageOrSummary[];
  loadMore: () => void;
  containerRef: RefObject<HTMLElement>;
  imageItemMode?: ImageItemMode;
};

export default function ImageTable({
  images,
  loadMore,
  containerRef,
  imageItemMode
}: ImageTableType)
{
  const edge = 160;
  const { width: containerWidth } = useContainerDimensions(containerRef);
  const [, addModal, removeModal] = useActionModalContext();
  const handleOnClick = useCallback((image: ImageOrSummary) =>
  {
    const id = addModal({
      component: (
        <ImageDetail
          image={image}
          images={images}
          viewMode="table"
          onClose={() =>
          {
            removeModal(id);
          }}
        />),
      isStackable: true,
      withCloseButton: false,
      fullScreen: true
    });
  }, [images]);
  const [t] = useTranslation();
  const { ref, entry } = useIntersection({ root: null, threshold: 0.1 });

  useEffect(() =>
  {
    if (entry?.isIntersecting === true)
    {
      loadMore();
    }
  }, [entry?.isIntersecting, loadMore]);

  if (!images || images.length === 0 || containerWidth <= 0)
  {
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
          onClick={handleOnClick}
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
        <Text size="sm"><ImageDimensions dimensions={image.dimensions}/></Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm"><ImageWeight image={image}/></Text>
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
      <div ref={ref} style={{ width: "100%", height: 20 }}/>
    </>
  );
}
