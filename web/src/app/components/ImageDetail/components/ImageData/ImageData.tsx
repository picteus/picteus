import React, { ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import { Accordion, ActionIcon, Flex, Group, Table, Text, Tooltip } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  ExtensionImageFeature,
  Image,
  ImageFeatureType,
  ImageMetadata as PicteusImageMetadata,
  Repository
} from "@picteus/ws-client";


import { ViewMode } from "types";
import { capitalizeText } from "utils";
import { useActionModalContext } from "app/context";
import { RepositoriesService, StorageService } from "app/services";
import { ExtensionIcon, ExternalLink, FormatedDate, ImageTag } from "app/components";
import { ImageFeature, ImageMetadata, TableComponent } from "../index.ts";
import { RepositoryDetail, RepositoryTop } from "../../../../screens/RepositoriesScreen/components";
import ImageItemWrapper from "../ImageItemWrapper/ImageItemWrapper.tsx";


type ImageDataType = {
  image: Image;
  viewMode: ViewMode;
};

export default function ImageData({ image, viewMode }: ImageDataType) {
  const [t] = useTranslation();
  const [repository, setRepository] = useState<Repository>(RepositoriesService.getRepositoryInformation(image.repositoryId));
  const [, addModal] = useActionModalContext();
  const sectionIds = { information: "information", tags: "tags", features: "features", metadata: "metadata" };
  const [accordionValue, setAccordionValue] = useState<string[]>(StorageService.getImageDetailTraits([sectionIds.information, sectionIds.tags, sectionIds.features]));

  useEffect(() => {
    setRepository(RepositoriesService.getRepositoryInformation(image.repositoryId));
  }, [image]);

  useEffect(() => {
    StorageService.setImageDetailTraits(accordionValue);
  }, [accordionValue]);

  type LabelAndValue = { label: ReactNode, value: ReactNode };

  const information = useMemo<ReactElement []>(() => {
    const labelAndValues: LabelAndValue [] = [
      ...(image.parentId
        ? [
          {
            label: t("field.parent"),
            value: <ImageItemWrapper imageId={image.parentId} edge={100} viewMode={viewMode} /> ,
          },
        ]
        : []),
      {
        label: t("field.repository"),
        value: <Flex align="center" gap={10}>
          <Text size="sm">{repository.name}</Text>
          <Tooltip
            label={t("button.open")}
            position="right"
          >
            <ActionIcon variant="default" onClick={() => {
              addModal({
                title: <RepositoryTop repository={repository} onDeleted={() => {
                }} />,
                size: "m",
                component: <RepositoryDetail repository={repository} />,
              })
            }}>
              <IconEye />
            </ActionIcon>
          </Tooltip>
        </Flex>
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
            value: <ExternalLink url={image.sourceUrl} type="link" />
          },
        ]
        : []),
    ];
    return labelAndValues.map((information, index) => (
      <TableComponent
        key={`information-${index}`}
        label={information.label}
        value={information.value}
      />
    ));
  }, [image, repository]);

  const tags = useMemo<ReactElement>(()=> (<TableComponent label="" value={<Group gap="xs">
      {image.tags.map((imageTag, index) => (
        <ImageTag key={`tag-${index}`} imageTag={imageTag} />
      ))}
    </Group>} />
  ), [image]);

  const sortedFeatureTypes:ImageFeatureType[] = [ImageFeatureType.Recipe, ImageFeatureType.Annotation, ImageFeatureType.Description, ImageFeatureType.Caption, ImageFeatureType.Comment, ImageFeatureType.Metadata, ImageFeatureType.Identity, ImageFeatureType.Other];

  const features = useMemo(() =>(image.features.sort((feature1: ExtensionImageFeature, feature2: ExtensionImageFeature)=> {
    const index1 = sortedFeatureTypes.indexOf(feature1.type);
    const index2 = sortedFeatureTypes.indexOf(feature2.type);
    if (index1 !== index2) {
      return index1 - index2;
    }
    return 0;
  }).map((imageFeature, index) => (<TableComponent
      key={`feature-${index}`}
      label={<Flex gap={10}>
        <ExtensionIcon idOrExtension={imageFeature.id} size="sm"/>
        {`${capitalizeText(imageFeature.type)} ${imageFeature.name === undefined ? "" : `(${imageFeature.name})`}`}
      </Flex>}
      value={<ImageFeature feature={imageFeature} viewMode={viewMode}/>}
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
        label={labelAndValue.label}
        value={labelAndValue.value}
      />
    ));
  }, [image]);

  const sections = useMemo(() => ([
    { id: sectionIds.information, mnemonic: "menu.information", node: information },
    { id: sectionIds.tags, mnemonic: "menu.tags", node: tags },
    { id: sectionIds.features, mnemonic: "menu.features", node: features },
    { id: sectionIds.metadata, mnemonic: "menu.metadata", node: metadata }
  ]), [information, tags, features, metadata]);

  return useMemo<ReactElement>(() => (<Accordion
      multiple
      value={accordionValue}
      onChange={setAccordionValue}
    >
      {sections.map((section) => (<Accordion.Item key={section.id} value={section.id}>
          <Accordion.Control key={section.id}>
            <Text size="sm" fw={500}>
              {t(section.mnemonic)}
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Table layout="fixed">
              <Table.Tbody>
                {section.node}
              </Table.Tbody>
            </Table>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>)
  , [sections, accordionValue]);
}
