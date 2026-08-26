import React, { useEffect, useState } from "react";
import { Alert, Button, Flex, Group, Input, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import {
  ExtensionIdImageEmbeddingName,
  ImageApiImageClosestImagesRequest,
  ImageDistance,
  ImageSummary
} from "@picteus/ws-client";

import { ImageWithCaption, ViewMode } from "types";
import { ToastService, Validators } from "utils";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmbeddingSelect, EmptyResults, ImagesView, ImageThumbnail } from "app/components";


type ClosestEmbeddingsImagesFormPayload = {
  count: number;
};

type ClosestEmbeddingsImagesType = {
  image: ImageSummary;
  viewMode: ViewMode;
};

export default function ClosestEmbeddingsImages({ image, viewMode }: ClosestEmbeddingsImagesType)
{
  const [ t ] = useTranslation();
  const [ loading, setLoading ] = useState<boolean>(false);
  const [ images, setImages ] = useState<ImageWithCaption[]>([]);
  const [ embeddingName, setEmbeddingName ] = useState<ExtensionIdImageEmbeddingName | undefined>();
  const focusTrapRef = useFocusTrap();

  const initialResultsCount = StorageService.getClosestImagesResultsCount();

  const initialValues: ClosestEmbeddingsImagesFormPayload = { count: initialResultsCount };

  const form = useForm({
    mode: "uncontrolled",
    initialValues,
    validate: {
      count: Validators.isNotEmpty
    }
  });

  useEffect(() =>
  {
    if (embeddingName)
    {
      void search({
        count: form.getValues().count,
        extensionId: embeddingName.extensionId,
        name: embeddingName.name,
        id: image.id
      });
    }
  }, [ embeddingName?.extensionId, embeddingName?.name, image.id ]);

  async function handleSubmit(values: ClosestEmbeddingsImagesFormPayload)
  {
    if (!embeddingName)
    {
      return;
    }
    StorageService.setClosestImagesResultsCount(values.count);
    const { extensionId, name } = embeddingName;
    const parameters: ImageApiImageClosestImagesRequest = {
      count: values.count,
      extensionId,
      name,
      id: image.id
    };
    void search(parameters);
  }

  async function search(parameters: ImageApiImageClosestImagesRequest)
  {
    setLoading(true);

    try
    {
      let imageDistances: ImageDistance[];
      try
      {
        imageDistances = await ImageService.getClosestImages(parameters);
      }
      catch (error)
      {
        return ToastService.apiCallError(error, "An error occurred while trying to find closes images");
      }
      setImages(
        imageDistances
          .sort((distance1, distance2) => distance1.distance - distance2.distance)
          .map((imageDistance) => ({
            ...imageDistance.image,
            caption: <CaptionDistance distance={imageDistance.distance}/>
          }))
      );
    }
    finally
    {
      setLoading(false);
    }
  }

  function renderForm()
  {
    const edge = 100;
    return (<Group>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Flex align="end" gap={20}>
          <Input.Wrapper label={t("field.source")}>
            <ImageThumbnail imageOrUrl={image} width={edge} height={edge}/>
          </Input.Wrapper>
          <Input.Wrapper label={t("field.name")}>
            <EmbeddingSelect onSelected={setEmbeddingName}/>
          </Input.Wrapper>
          <NumberInput
            ref={focusTrapRef}
            min={1}
            withAsterisk
            label={t("field.imageCount")}
            placeholder={t("closestEmbeddingsImagesModal.countPlaceholder")}
            {...form.getInputProps("count")}
          />

          <Button loading={loading} disabled={loading || embeddingName === undefined} type="submit">
            {t("button.find")}
          </Button>
        </Flex>
      </form>
    </Group>);
  }

  function renderContent()
  {
    return (<ImagesView
      viewData={{ viewMode, images }}
      isDefault={false}
      onEmptyResults={() => (<EmptyResults
        icon={IconPhotoSearch}
        title={t(`emptyImages.${embeddingName === undefined ? "titleNoEmbedding" : "title"}`)}
        description={t(`emptyImages.${embeddingName === undefined ? "descriptionNoEmbedding" : "description"}`)}
      />)}
      controlBarChildren={renderForm()}
    />);
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
