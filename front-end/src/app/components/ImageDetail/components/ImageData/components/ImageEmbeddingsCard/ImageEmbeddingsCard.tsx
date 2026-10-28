import React, { ReactElement, useCallback, useMemo } from "react";
import { Anchor, Box, Divider, Stack } from "@mantine/core";
import { IconArrowRight, IconTopologyRing3 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionImageEmbeddings, Image } from "@picteus/ws-client";

import { ViewMode } from "types";
import { useActionModalContext } from "app/context";
import { useClosestImages } from "app/hooks";
import { ClosestEmbeddingsImages, Common, UiContainerView } from "app/components";

import ImageDataCard from "../ImageDataCard/ImageDataCard.tsx";
import ExtensionItemHeader from "../ExtensionItemHeader/ExtensionItemHeader.tsx";
import { computeEmbeddingModelUiContainer } from "../../ImageDataComputer.ts";


type EmbeddingModelSectionPropsType =
  {
    readonly image: Image;
    readonly extensionId: string;
    readonly modelName: string;
    readonly viewMode: ViewMode;
    readonly isOpened: boolean;
  };

function EmbeddingModelSection({
  image,
  extensionId,
  modelName,
  viewMode,
  isOpened
}: EmbeddingModelSectionPropsType): ReactElement
{
  const { data: closestImages = [] } = useClosestImages(image.id, extensionId, modelName, 10, isOpened);

  const images = useMemo(() => closestImages.map(imageDistance => imageDistance.image),
    [ closestImages ]
  );

  const uiContainer = useMemo(() => computeEmbeddingModelUiContainer(images, viewMode),
    [ images, viewMode ]
  );

  return <UiContainerView uiContainer={uiContainer}/>;
}

export type ImageEmbeddingsCardPropsType =
  {
    readonly image: Image;
    readonly embeddings: readonly ExtensionImageEmbeddings[];
    readonly viewMode: ViewMode;
    readonly isOpened: boolean;
    readonly onToggle: () => void;
    readonly onHide: () => void;
  };

export default function ImageEmbeddingsCard({
  image,
  embeddings,
  viewMode,
  isOpened,
  onToggle,
  onHide
}: ImageEmbeddingsCardPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const { addModal } = useActionModalContext();

  const handleExploreSimilar = useCallback((extensionId: string, modelName: string): void =>
  {
    addModal({
      title: t("closestEmbeddingsImagesModal.title"),
      size: "l",
      isStackable: true,
      body: (
        <ClosestEmbeddingsImages
          image={image}
          viewMode={viewMode}
          initialEmbeddingName={{ extensionId, name: modelName }}
        />
      )
    });
  }, [ addModal, image, t, viewMode ]);

  const totalEmbeddingsCount = useMemo(() => embeddings.reduce((accumulated, extensionEmbeddings) => accumulated + extensionEmbeddings.embeddings.length, 0),
    [ embeddings ]
  );

  if (totalEmbeddingsCount === 0)
  {
    return null;
  }

  return (
    <ImageDataCard
      icon={<IconTopologyRing3 size={Common.IconXSmallSize}/>}
      title={t("imageDetail.embeddings")}
      subtitle={t("imageDetail.embeddingsSubtitle")}
      count={totalEmbeddingsCount}
      isOpened={isOpened}
      onToggle={onToggle}
      onHide={onHide}
    >
      <Stack gap="md">
        {embeddings.map((extensionEmbeddings, extensionIndex) =>
        {
          return (
            <Box key={extensionEmbeddings.id}>
              {extensionIndex > 0 && <Divider mb="sm"/>}
              <Stack gap="sm">
                {extensionEmbeddings.embeddings.map((embedding) =>
                {
                  return (
                    <Box key={`${extensionEmbeddings.id}-${embedding.name}`}>
                      <ExtensionItemHeader
                        extensionId={extensionEmbeddings.id}
                        name={embedding.name}
                        hasSingleExtension={embeddings.length === 1}
                        rightSection={(
                          <Anchor
                            size="sm"
                            c="blue"
                            onClick={() =>
                            {
                              handleExploreSimilar(extensionEmbeddings.id, embedding.name);
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                          >
                            {t("imageDetail.exploreSimilar")}
                            <IconArrowRight size={14}/>
                          </Anchor>
                        )}
                      />
                      <EmbeddingModelSection
                        image={image}
                        extensionId={extensionEmbeddings.id}
                        modelName={embedding.name}
                        viewMode={viewMode}
                        isOpened={isOpened}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </ImageDataCard>
  );
}
