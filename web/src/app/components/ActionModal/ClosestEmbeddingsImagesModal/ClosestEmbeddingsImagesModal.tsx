import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Divider, Flex, Group, HoverCard, Input, NumberInput, Text } from "@mantine/core";
import { ImageSummary } from "@picteus/ws-client";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";
import { Form, useForm } from "@mantine/form";
import { ImageApiImageClosestImagesRequest } from "@picteus/ws-client/src/apis/ImageApi.ts";

import { notifyError, Validators } from "utils";
import { ImageSummaryWithCaption } from "types";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImageMasonry } from "app/components";
import { useContainerDimensions } from "app/hooks";
import { useImageVisualizerContext } from "app/context";
import style from "./ClosestEmbeddingsImagesModal.module.scss";

type ClosestEmbeddingsImagesModalFormPayload = {
  count: number;
};

type ClosestEmbeddingsImagesModalType = {
  extensionId: string;
  imageId: string;
};

export default function ClosestEmbeddingsImagesModal({
  extensionId,
  imageId,
}: ClosestEmbeddingsImagesModalType) {
  const [t] = useTranslation();
  const [imageSummaries, setImageSummaries] = useState<
    ImageSummaryWithCaption[]
  >([]);
  const [sourceImage, setSourceImage] = useState<ImageSummary>();
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerDimensions(containerRef);
  const [, setImageVisualizerContext] = useImageVisualizerContext();

  const initialResultsCount = StorageService.getClosestImagesResultsCount();

  const initialValues: ClosestEmbeddingsImagesModalFormPayload = {
    count: initialResultsCount,
  };

  const form = useForm({
    mode: "uncontrolled",
    initialValues,
    validate: {
      count: Validators.isNotEmpty,
    },
  });

  async function handleSubmit(values: ClosestEmbeddingsImagesModalFormPayload) {
    StorageService.setClosestImagesResultsCount(values.count);
    const parameters: ImageApiImageClosestImagesRequest = {
      count: values.count,
      extensionId,
      id: imageId,
    };
    void load(parameters);
  }

  async function load(parameters: ImageApiImageClosestImagesRequest) {
    setLoading(true);

    if (!sourceImage) {
      const sourceImage = await ImageService.get({ id: imageId });
      setSourceImage(sourceImage);
    }
    try {
      const imageDistances = await ImageService.getClosestImages(parameters);
      setImageSummaries(
        imageDistances
          .sort((a, b) => a.distance - b.distance)
          .map((imageDistance) => ({
            ...imageDistance.image,
            caption: <CaptionDistance distance={imageDistance.distance} />,
          })),
      );
    } catch (error) {
      const errorJson = await error.response.json();
      notifyError(errorJson?.message);
      console.error(
        "An error occurred while trying to find closes images",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load({
      count: initialResultsCount,
      extensionId,
      id: imageId,
    });
  }, []);

  function handleOnClickSourceImage() {
    setImageVisualizerContext((prev) => ({
      ...prev,
      imageSummary: sourceImage,
    }));
  }

  function renderForm() {
    return (
      <Group mt="sm">
        <Form style={{ width: 900 }} form={form} onSubmit={handleSubmit}>
          <Flex align="end" gap={20}>
            <Input.Wrapper label={t("field.source")}>
              <HoverCard shadow="lg">
                <HoverCard.Target>
                  <Flex
                    className={style.sourceNameContainer}
                    align="center"
                    gap={10}
                  >
                    <img
                      alt="Thumbnail"
                      src={ImageService.getImageSrc(
                        sourceImage?.url,
                        undefined,
                        34,
                      )}
                    />
                    <Text className={style.sourceName} size="sm">
                      {sourceImage?.name}
                    </Text>
                  </Flex>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <div className={style.sourceImage}>
                    <img
                      onClick={handleOnClickSourceImage}
                      alt="Thumbnail"
                      src={ImageService.getImageSrc(
                        sourceImage?.url,
                        undefined,
                        250,
                      )}
                    />
                  </div>
                </HoverCard.Dropdown>
              </HoverCard>
            </Input.Wrapper>
            <NumberInput
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
        </Form>
      </Group>
    );
  }
  function renderContent() {
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
          keyPrefix="closestEmbeddingsImages"
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
        {t("closestEmbeddingsImagesModal.description")}
      </Alert>
      {renderForm()}
      <Divider mt="lg" mb="xl" />
      <div ref={containerRef}>{renderContent()}</div>
    </>
  );
}
