import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Divider, Flex, Group, Loader, NumberInput, TextInput } from "@mantine/core";
import { ImageApiImageTextToImagesRequest } from "@picteus/ws-client";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";
import { Form, useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";

import { notifyError, Validators } from "utils";
import { ImageSummaryWithCaption } from "types";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImageMasonry } from "app/components";
import { useContainerDimensions } from "app/hooks";

import style from "./TextToImagesModal.module.scss";

type TextToImageModalFormPayload = {
  count: number;
  text: string;
};

type TextToImageModalType = {
  extensionId: string;
};

export default function TextToImagesModal({
  extensionId,
}: TextToImageModalType) {
  const [t] = useTranslation();
  const [imageSummaries, setImageSummaries] = useState<
    ImageSummaryWithCaption[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerDimensions(containerRef);
  const focusTrapRef = useFocusTrap();

  const initialResultsCount = StorageService.getTextToImagesResultsCount();

  const initialValues: TextToImageModalFormPayload = {
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

  async function handleSubmit(values: TextToImageModalFormPayload) {
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

    try {
      const imageDistances = await ImageService.textToImages(parameters);
      setImageSummaries(
        imageDistances
          .sort((a, b) => a.distance - b.distance)
          .map((imageDistance) => {
            return {
              ...imageDistance.image,
              caption: <CaptionDistance distance={imageDistance.distance} />,
            };
          }),
      );
    } catch (error) {
      const errorJson = await error.response.json();
      notifyError(errorJson?.message);
      console.error(
        "An error occurred while trying to search images from text",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  function renderForm() {
    return (
      <Group mt="sm">
        <Form style={{ width: "90%" }} form={form} onSubmit={handleSubmit}>
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
        </Form>
      </Group>
    );
  }

  function renderContent() {
    if (loading) {
      return (
        <Flex p="xl" justify="center">
          <Loader />
        </Flex>
      );
    }
    if (!loading && !imageSummaries.length) {
      return (
        <EmptyResults
          icon={
            <IconPhotoSearch size={140} stroke={1} className={style.icon} />
          }
          description={t("emptyImages.description")}
          title={t("emptyImages.title")}
          buttonText={t("emptyImages.buttonText")}
        />
      );
    }
    if (containerRef?.current) {
      return (
        <ImageMasonry
          keyPrefix="textToImagesImages"
          containerWidth={containerWidth}
          data={{
            imageSummaries,
            currentPage: 1,
            total: imageSummaries.length,
          }}
          loadMore={() => {}}
        />
      );
    }
  }

  return (
    <>
      <Alert icon={<IconInfoCircle />}>
        {t("textToImagesModal.description")}
      </Alert>
      {renderForm()}
      <Divider mt="lg" mb="xl" />

      <div ref={containerRef}>{renderContent()}</div>
    </>
  );
}
