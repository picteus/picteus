import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Divider, Flex, Group, HoverCard, Input, NumberInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";

import { ImageApiImageClosestImagesRequest, ImageSummary } from "@picteus/ws-client";

import { ImageWithCaption } from "types";
import { notifyApiCallError, Validators } from "utils";
import { useImageVisualizerContext } from "app/context";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImageMasonry, ImageThumbnail } from "app/components";

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
    ImageWithCaption[]
  >([]);
  const [sourceImage, setSourceImage] = useState<ImageSummary>();
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
      notifyApiCallError(error, "An error occurred while trying to find closes images");
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
    setImageVisualizerContext((previousValue) => ({
      ...previousValue,
      selectedImage: sourceImage,
    }));
  }

  function renderForm() {
    return (
      <Group mt="sm">
        <form style={{ width: 900 }} onSubmit={form.onSubmit(handleSubmit)}>
          <Flex align="end" gap={20}>
            <Input.Wrapper label={t("field.source")}>
              <HoverCard shadow="lg">
                <HoverCard.Target>
                  <Flex
                    className={style.sourceNameContainer}
                    align="center"
                    gap={10}
                  >
                    <ImageThumbnail summary={sourceImage} height={34} />
                    <Text className={style.sourceName} size="sm">
                      {sourceImage?.name}
                    </Text>
                  </Flex>
                </HoverCard.Target>
                <HoverCard.Dropdown>
                  <div onClick={handleOnClickSourceImage} className={style.sourceImage}>
                    <ImageThumbnail summary={sourceImage} height={250} />
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
        </form>
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
    return (containerRef.current && <ImageMasonry
        data={imageSummaries}
        loadMore={() => {
        }}
      />);
  }

  return (
    <>
      <Alert icon={<IconInfoCircle />}>
        {t("closestEmbeddingsImagesModal.description")}
      </Alert>
      {renderForm()}
      <Divider mt="lg" mb="xl" />
      <Flex ref={containerRef} align="center" justify="center">{renderContent()}</Flex>
    </>
  );
}
