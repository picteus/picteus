import React, { ReactElement, useEffect, useMemo, useState } from "react";
import { Alert, Button, Flex, Group, Input, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ExtensionIdImageEmbeddingName, ImageSummary } from "@picteus/ws-client";

import { ImageWithCaption, ViewMode } from "types";
import { ApiCallError, ToastService, Validators } from "utils";
import { StorageService } from "app/services";
import { useClosestImages } from "app/hooks";
import {
  CaptionDistance,
  Common,
  EmbeddingSelect,
  EmptyResults,
  ImagesView,
  ImageThumbnail,
  LoadingView
} from "app/components";


type ClosestEmbeddingsImagesFormPayload =
  {
    count: number;
  };

type ClosestEmbeddingsImagesType =
  {
    image: ImageSummary;
    viewMode: ViewMode;
    initialEmbeddingName?: ExtensionIdImageEmbeddingName;
  };

export default function ClosestEmbeddingsImages({
  image,
  viewMode,
  initialEmbeddingName
}: ClosestEmbeddingsImagesType): ReactElement
{
  const [ t ] = useTranslation();
  const [ embeddingName, setEmbeddingName ] = useState<ExtensionIdImageEmbeddingName | undefined>(initialEmbeddingName);
  const initialResultsCount = StorageService.getClosestImagesResultsCount();
  const [ searchCount, setSearchCount ] = useState<number>(initialResultsCount);
  const focusTrapRef = useFocusTrap();

  const isQueryEnabled = Boolean(embeddingName?.extensionId && embeddingName?.name && searchCount > 0);
  const {
    data: imageDistances = [],
    isFetching,
    error
  } = useClosestImages(image.id, embeddingName?.extensionId ?? "", embeddingName?.name ?? "", searchCount, isQueryEnabled);

  useEffect(() =>
  {
    if (error)
    {
      ToastService.apiCallError(error as unknown as ApiCallError);
    }
  }, [ error ]);

  const form = useForm({
    mode: "uncontrolled",
    initialValues: { count: initialResultsCount },
    validate: {
      count: Validators.isNotEmpty
    }
  });

  const images = useMemo<ImageWithCaption[]>(() =>
      imageDistances.slice().sort((firstDistance, secondDistance) => firstDistance.distance - secondDistance.distance).map((imageDistance) => ({
        ...imageDistance.image, caption: <CaptionDistance distance={imageDistance.distance}/>
      })),
    [ imageDistances ]
  );

  function handleSubmit(values: ClosestEmbeddingsImagesFormPayload): void
  {
    if (!embeddingName)
    {
      return;
    }
    StorageService.setClosestImagesResultsCount(values.count);
    setSearchCount(values.count);
  }

  function renderForm(): ReactElement
  {
    return (
      <Group>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Flex align="end" gap={20}>
            <Input.Wrapper label={t("field.source")}>
              <ImageThumbnail imageOrUrl={image} width={Common.ImageThumbnailEdge} height={Common.ImageThumbnailEdge}/>
            </Input.Wrapper>
            <Input.Wrapper label={t("field.name")}>
              <EmbeddingSelect initialEmbeddingName={initialEmbeddingName} onSelected={setEmbeddingName}/>
            </Input.Wrapper>
            <NumberInput
              ref={focusTrapRef}
              min={1}
              withAsterisk
              label={t("field.imageCount")}
              placeholder={t("closestEmbeddingsImagesModal.countPlaceholder")}
              {...form.getInputProps("count")}
            />

            <Button loading={isFetching} disabled={isFetching || embeddingName === undefined} type="submit">
              {t("button.find")}
            </Button>
          </Flex>
        </form>
      </Group>
    );
  }

  function renderEmptyResult(): ReactElement<typeof EmptyResults>
  {
    if (embeddingName === undefined)
    {
      return (
        <EmptyResults
          icon={IconPhotoSearch}
          title={t("emptyImages.titleNoEmbedding")}
          description={t("emptyImages.descriptionNoEmbedding")}
        />
      );
    }

    return (
      <EmptyResults
        icon={IconPhotoSearch}
        title={t("emptyImages.title")}
        description={t("emptyImages.description")}
      />
    );
  }

  function renderContent(): ReactElement
  {
    return (
      <ImagesView
        viewData={{ viewMode, images }}
        isDefault={false}
        loader={isFetching && <LoadingView visible={true}/>}
        onEmptyResults={() =>
        {
          return renderEmptyResult();
        }}
        controlBarChildren={renderForm()}
      />
    );
  }

  return (
    <>
      <Alert icon={<IconInfoCircle/>} m={10}>
        {t("closestEmbeddingsImagesModal.description")}
      </Alert>
      <Flex align="center" justify="center">{renderContent()}</Flex>
    </>
  );
}
