import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Divider, Flex, Group, Loader, NumberInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";

import { ImageApiImageTextToImagesRequest } from "@picteus/ws-client";

import { ImageWithCaption } from "types";
import { notifyApiCallError, Validators } from "utils";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImageMasonry } from "app/components";

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
    ImageWithCaption[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
      notifyApiCallError(error, "An error occurred while trying to search images from text");
    } finally {
      setLoading(false);
    }
  }

  function renderForm() {
    return (
      <Group mt="sm">
        <form style={{ width: "90%" }} onSubmit={form.onSubmit(handleSubmit)}>
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
          images={imageSummaries}
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
