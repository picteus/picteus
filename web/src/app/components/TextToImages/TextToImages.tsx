import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex, Group, NumberInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";

import { ImageApiImageTextToImagesRequest } from "@picteus/ws-client";

import { ImageWithCaption } from "types";
import { notifyApiCallError, Validators } from "utils";
import { useReadyRef } from "app/hooks";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImagesView } from "app/components";


type TextToImagesFormPayload = {
  count: number;
  text: string;
};

type TextToImageType = {
  extensionId: string;
};

export default function TextToImages({ extensionId }: TextToImageType) {
  const [t] = useTranslation();
  const [images, setImages] = useState<ImageWithCaption[]>([]);
  const [emptyResult, setEmptyResult] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [containerRef, readyRef, isReady] = useReadyRef<HTMLElement>();
  const focusTrapRef = useFocusTrap();

  const initialResultsCount = StorageService.getTextToImagesResultsCount();

  const initialValues: TextToImagesFormPayload = {
    count: initialResultsCount,
    text: undefined,
  };

  const form = useForm({
    mode: "uncontrolled",
    initialValues,
    validate: {
      text: Validators.isNotEmpty,
      count: Validators.isNotEmpty,
    },
  });

  async function handleSubmit(values: TextToImagesFormPayload) {
    StorageService.setTextToImagesResultsCount(values.count);
    const parameters: ImageApiImageTextToImagesRequest = {
      ...values,
      extensionId,
    };
    void load(parameters);
  }

  async function load(parameters: ImageApiImageTextToImagesRequest) {
    if (!parameters.text) {
      return;
    }
    setLoading(true);
    setEmptyResult(false);

    try {
      const imageDistances = await ImageService.textToImages(parameters);
      const computedImages = imageDistances
        .sort((a, b) => a.distance - b.distance)
        .map((imageDistance) => {
          return {
            ...imageDistance.image,
            caption: <CaptionDistance distance={imageDistance.distance} />,
          };
        });
      setEmptyResult(computedImages.length === 0);
      setImages(computedImages);
    } catch (error) {
      notifyApiCallError(error, "An error occurred while trying to search images from text");
    } finally {
      setLoading(false);
    }
  }

  function renderForm() {
    return (
      <Group mt="sm">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Flex ref={focusTrapRef} align="end" gap={10}>
            <TextInput
              data-autofocus
              flex="1"
              withAsterisk
              label={t("field.search")}
              placeholder={t("textToImagesModal.searchPlaceholder")}
              {...form.getInputProps("text")}
            />
            <NumberInput
              min={1}
              withAsterisk
              label={t("field.imageCount")}
              placeholder={t("textToImagesModal.countPlaceholder")}
              {...form.getInputProps("count")}
            />

            <Button loading={loading} disabled={loading} type="submit">
              {t("button.find")}
            </Button>
          </Flex>
        </form>
      </Group>
    );
  }

  function renderContent() {
    return (isReady && <ImagesView
      viewData={{ viewMode: "masonry", images }}
      isDefault={false}
      containerRef={readyRef}
      onEmptyResults={() => {
        if (loading === false && emptyResult === true) {
          return (<EmptyResults
            icon={<IconPhotoSearch size={140} stroke={1} />}
            description={t("emptyImages.description")}
            title={t("emptyImages.title")}
          />);
        }
      }}
      controlBarChildren={renderForm()}
      stickyControlBar={false}
      displayDetailInContainer={false}
      scrollRootRef={readyRef}
    />);
  }

  return (
    <>
      <Alert icon={<IconInfoCircle />}>
        {t("textToImagesModal.description")}
      </Alert>
      <Flex ref={containerRef} align="center" justify="center">{renderContent()}</Flex>
    </>
  );
}
