import React, { useEffect, useState } from "react";
import { Badge, Box, Button, Flex, LoadingOverlay, NumberFormatter, Stack, Text } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageSummary, Repository, SearchOriginNature, SearchSortingProperty } from "@picteus/ws-client";

import { notifyErrorWithError, removeFilePrefixFromUrl } from "utils";
import { ImageService } from "app/services";
import { CopyText, EntityStatus, ExternalLink, FieldValue, FormatedDate, NoValue } from "app/components";


type RepositoryDetailProps = {
  repository: Repository;
  openAddOrUpdateRepositoryModal: (repository: Repository) => void;
};

export default function RepositoryDetail({ repository, openAddOrUpdateRepositoryModal }: RepositoryDetailProps) {
  const [t] = useTranslation();
  const [images, setImages] = useState<ImageSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (repository) {
      void fetchRepositoryDetails();
    }
  }, [repository]);

  async function fetchRepositoryDetails() {
    setLoading(true);
    try {
      const result = await ImageService.searchSummaries({
        filter: { origin: { kind: SearchOriginNature.Repositories, ids: [repository!.id] }, sorting: { property: SearchSortingProperty.ModificationDate, isAscending: false } },
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

    return (
      <Flex mt="xs" style={{ padding: "10px 0", minHeight: 100 }}>
        {images.map((img, i) => (
          <Box
            key={img.id}
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              marginLeft: i > 0 ? -40 : 0,
              boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
              zIndex: images.length - i,
              transition: "transform 0.2s ease, z-index 0s",
              backgroundImage: `url(${ImageService.getImageSrc(img.url, 160, 160, "outbox")})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              cursor: "pointer",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = "translateY(-10px) scale(1.1)";
              e.currentTarget.style.zIndex = "100";
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.zIndex = String(images.length - i);
            }}
          />
        ))}
      </Flex>
    );
  }

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

      <FieldValue name={t("field.id")} value={<CopyText size="xs" c="dimmed" text={repository.id} />} />
      <FieldValue name={t("field.url")}
                  value={<CopyText size="xs" c="dimmed" text={removeFilePrefixFromUrl(repository.url)} />} />
      <FieldValue name={t("field.name")} value={<Text size="lg" fw={500}>{repository.name}</Text>} />
      <FieldValue name={t("field.comment")}
                  value={repository.comment ? <Text>{repository.comment}</Text> : <NoValue />} />
      <FieldValue name={t("field.status")}
                  value={<EntityStatus type="repository" status={repository.status} size="sm" />} />
      <Flex gap="md">
        <FieldValue name={t("field.createdOn")}
                    value={<Text size="sm"><FormatedDate timestamp={repository.creationDate} /></Text>} />
        <FieldValue name={t("field.modifiedOn")}
                    value={<Text size="sm"><FormatedDate timestamp={repository.modificationDate} /></Text>} />
      </Flex>
      <FieldValue name={t("repositoryDetail.imageCount")}
                  value={<Badge size="lg" variant="light" mt={4}><NumberFormatter value={totalCount}
                                                                                  thousandSeparator /></Badge>} />
      <FieldValue name={t("repositoryDetail.latestImages")} value={renderImageStack()} />

      <Flex gap="sm" mt="lg">
        <Button
          leftSection={<IconEdit size={16} />}
          onClick={() => {
             openAddOrUpdateRepositoryModal(repository);
          }}
          variant="default"
        >
          {t("button.edit")}
        </Button>
        <ExternalLink url={repository.url} type="button" />
      </Flex>

    </Stack>
  );
}
