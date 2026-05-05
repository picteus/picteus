import React, { useEffect, useState } from "react";
import { Badge, Flex, LoadingOverlay, NumberFormatter, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Collection, ImageSummary, SearchSortingProperty } from "@picteus/ws-client";

import { notifyErrorWithError } from "utils";
import { ImageService } from "app/services";
import { FieldValue, FormatedDate, ImagesStack } from "app/components";


type CollectionDetailType = {
  collection: Collection;
};

export default function CollectionDetail({ collection }: CollectionDetailType) {
  const [t] = useTranslation();
  const [images, setImages] = useState<ImageSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (collection) {
      void fetchCollectionDetails();
    }
  }, [collection]);

  async function fetchCollectionDetails() {
    setLoading(true);
    try {
      const result = await ImageService.searchSummaries({
        filter: { ...collection.filter, sorting: { property: SearchSortingProperty.ModificationDate, isAscending: false } },
        range: { take: 10 },
      });
      setImages(result.items);
      setTotalCount(result.totalCount);
    } catch (error) {
      notifyErrorWithError(error);
    } finally {
      setLoading(false);
    }
  }

  function renderImageStack() {
    if (images.length === 0) return <Text c="dimmed">{t("emptyImages.title")}</Text>;

    return (<ImagesStack images={images}/>);
  }

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <Flex gap="md">
        <FieldValue name={t("field.createdOn")}
                    value={<Text size="sm"><FormatedDate timestamp={collection.creationDate} /></Text>} />
        <FieldValue name={t("field.modifiedOn")}
                    value={<Text size="sm"><FormatedDate timestamp={collection.modificationDate} /></Text>} />
      </Flex>
      <FieldValue name={t("field.imageCount")}
                  value={<Badge size="lg" variant="light" mt={4}><NumberFormatter value={totalCount}
                                                                                  thousandSeparator /></Badge>} />
      <FieldValue name={t("collectionDetail.latestImages")} value={renderImageStack()} />
    </Stack>
  );
}
