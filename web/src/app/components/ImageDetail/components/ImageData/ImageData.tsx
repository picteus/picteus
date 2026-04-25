import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, Group, Table, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Image, ImageMetadata as PicteusImageMetadata, Repository } from "@picteus/ws-client";


import { capitalizeText } from "utils";
import { RepositoriesService } from "app/services";
import { CopyText, ExternalLink, FormatedDate, ImageTag } from "app/components";
import { ImageFeature, ImageMetadata, TableComponent } from "../index.ts";


type ImageDataType = {
  image: Image;
};

export default function ImageData({ image }: ImageDataType) {
  const [t] = useTranslation();
  const [repository, setRepository] = useState<Repository>(RepositoriesService.getRepositoryInformation(image.repositoryId));

  useEffect(() => {
    setRepository(RepositoriesService.getRepositoryInformation(image.repositoryId));
  }, [image]);

  type LabelAndValue = { label: string, value: ReactNode };

  const information = useMemo<ReactElement []>(() => {
    const labelAndValues: LabelAndValue [] = [
      {
        label: t("field.id"),
        value: <CopyText text={image.id} />,
      },
      ...(image.parentId
        ? [
          {
            label: t("field.parentId"),
            value: <CopyText text={image.parentId} />,
          },
        ]
        : []),
      {
        label: t("field.repository"),
        value: repository && <ExternalLink url={repository.url} type="link" />,
      },
      {
        label: t("field.repositoryId"),
        value: <CopyText text={image.repositoryId} />,
      },
      {
        label: t("field.createdOn"),
        value: <FormatedDate timestamp={image.fileDates.creationDate}/>,
      },
      {
        label: t("field.modifiedOn"),
        value: <FormatedDate timestamp={image.fileDates.modificationDate}/>,
      },
      ...(image.sourceUrl
        ? [
          {
            label: t("field.sourceUrl"),
            value: (
              <ExternalLink url={image.sourceUrl} type="link" />
            ),
          },
        ]
        : []),
      {
        label: t("field.location"),
        value: <ExternalLink url={image.url} type="link" />,
      },
    ];
    return labelAndValues.map((information, index) => (
      <TableComponent
        key={`information-${index}`}
        data={information}
      />
    ));
  }, [image, repository]);

  const tags = useMemo<ReactElement>(()=> (<TableComponent data={{
      label: "", value: <Group gap="xs">
        {image.tags.map((imageTag, index) => (
          <ImageTag key={`tag-${index}`} imageTag={imageTag} />
        ))}
      </Group>
    }} />
  ), [image]);

  const features = useMemo(() =>(image.features.map((imageFeature, index) => (<TableComponent
      key={`feature-${index}`}
      data={{
        label: `${capitalizeText(imageFeature.type)} (${imageFeature.id}${imageFeature.name === undefined ? "" : (`:${imageFeature.name}`)})`,
        value: <ImageFeature feature={imageFeature} />
      }}
    />
  ))), [image]);

  const metadata = useMemo(() => {
    const metadata: PicteusImageMetadata = image.metadata;
    type KeyType = "all" | "exif" | "icc" | "iptc" | "xmp" | "tiffTagPhotoshop" | "others";
    const keys: KeyType[] = ["all", "exif", "icc", "iptc", "xmp", "tiffTagPhotoshop", "others"];
    // We exclude the empty metadata entities
    const labelAndValues: LabelAndValue [] = keys.map(key => ({ key, value: metadata[key] })).filter(entry => entry.value !== undefined && entry.value !== "{}").map(entry => ({
      label: entry.key,
      value: <ImageMetadata metadata={metadata} entry={entry.key} />
    }));
    return labelAndValues.map((labelAndValue, index) => (
      <TableComponent
        key={`metadata-${index}`}
        data={labelAndValue}
      />
    ));
  }, [image]);

  const sections = useMemo(() => ([
    { id: "information", mnemonic: "menu.information", element: information },
    { id: "tags", mnemonic: "menu.tags", element: tags },
    { id: "features", mnemonic: "menu.features", element: features },
    { id: "metadata", mnemonic: "menu.metadata", element: metadata }
  ]), [information, tags, features, metadata]);

  return useMemo<ReactElement>(() => (<Accordion
      multiple
      defaultValue={sections.map(section => section.id)}
    >
      {sections.map((section) => (<Accordion.Item value={section.id}>
          <Accordion.Control key={section.id}>
            <Text size="sm" fw={500}>
              {t(section.mnemonic)}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Table layout="fixed">
              <Table.Tbody>
                {section.element}
              </Table.Tbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>)
  , [sections]);
}
