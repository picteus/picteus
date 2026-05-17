import React, { useEffect, useState } from "react";
import { Alert, Button, Flex, Group, Input, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageApiImageClosestImagesRequest, ImageSummary } from "@picteus/ws-client";

import { ImageWithCaption, ViewMode } from "types";
import { notifyApiCallError, Validators } from "utils";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImagesView, ImageThumbnail } from "app/components";


type ClosestEmbeddingsImagesFormPayload = {
  count: number;
};

type ClosestEmbeddingsImagesType = {
  extensionId: string;
  image: ImageSummary;
  viewMode: ViewMode;
};

export default function ClosestEmbeddingsImages({  extensionId, image, viewMode}: ClosestEmbeddingsImagesType) {
  const [t] = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [images, setImages] = useState<ImageWithCaption[]>([]);
  const focusTrapRef = useFocusTrap();

  const initialResultsCount = StorageService.getClosestImagesResultsCount();

  const initialValues: ClosestEmbeddingsImagesFormPayload = {
    count: initialResultsCount,
  };

  const form = useForm({
    mode: "uncontrolled",
    initialValues,
    validate: {
      count: Validators.isNotEmpty,
    },
  });

  async function handleSubmit(values: ClosestEmbeddingsImagesFormPayload) {
    StorageService.setClosestImagesResultsCount(values.count);
    const parameters: ImageApiImageClosestImagesRequest = {
      count: values.count,
      extensionId,
      id: image.id,
    };
    void load(parameters);
  }

  async function load(parameters: ImageApiImageClosestImagesRequest) {
    setLoading(true);

    try {
      const imageDistances = await ImageService.getClosestImages(parameters);
      setImages(
        imageDistances
          .sort((a, b) => a.distance - b.distance)
          .map((imageDistance) => ({
            ...imageDistance.image,
            caption: <CaptionDistance distance={imageDistance.distance} />,
          })),
      );
    } catch (error) {
      notifyApiCallError(error, "An error occurred while trying to find closes images");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({
      count: initialResultsCount,
      extensionId,
      id: image.id,
    });
  }, []);

  function renderForm() {
    const edge = 100;
    return (<Group>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Flex align="end" gap={20}>
          <Input.Wrapper label={t("field.source")}>
            <ImageThumbnail imageOrUrl={image} width={edge} height={edge} />
          </Input.Wrapper>
          <NumberInput
            ref={focusTrapRef}
            min={1}
            withAsterisk
            label={t("field.imageCount")}
            placeholder={t("closestEmbeddingsImagesModal.countPlaceholder")}
            {...form.getInputProps("count")}
          />

          <Button loading={loading} disabled={loading} type="submit">
            {t("button.find")}
          </Button>
        </Flex>
      </form>
    </Group>);
  }

  function renderContent() {
    return (<ImagesView
      viewData={{ viewMode, images }}
      isDefault={false}
      onEmptyResults={() => (<EmptyResults
        icon={IconPhotoSearch}
        description={t("emptyImages.description")}
        title={t("emptyImages.title")}
      />)}
      controlBarChildren={renderForm()}
    />);
  }

  return (
    <>
      <Alert icon={<IconInfoCircle />} m={10}>
        {t("closestEmbeddingsImagesModal.description")}
      </Alert>
        <Flex align="center" justify="center">{renderContent()}</Flex>
    </>
  );
}
