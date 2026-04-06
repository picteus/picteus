import { useEffect } from "react";
import { Table, Text } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useTranslation } from "react-i18next";

import { formatDate, formatDimensions, formatSize } from "utils";
import { ImageItemMode, ImageOrSummary, ImageWithCaption } from "types";
import { useImageVisualizerContext } from "app/context";
import { ImageItem } from "app/components";


type ImageDetailType = {
  data: ImageOrSummary[];
  loadMore: () => void;
  containerWidth: number;
  imageItemMode?: ImageItemMode;
};

export default function ImageTable({
  data,
  loadMore,
  containerWidth,
  imageItemMode,
}: ImageDetailType) {
  const [t] = useTranslation();
  const [, setImageVisualizerContext] = useImageVisualizerContext();
  const { ref, entry } = useIntersection({ root: null, threshold: 0.1 });

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
          width={160}
          height={160}
          mode={imageItemMode}
          onClick={() =>
            setImageVisualizerContext({
              prevAndNextIds: data.map((image) => image.id),
              imageSummary: image,
            })
          }
          image={image}
          caption={(image as ImageWithCaption).caption}
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
    </>
  );
}
