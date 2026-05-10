import React, { useEffect, useState } from "react";
import { Alert, Button, Flex, Group, HoverCard, Input, NumberInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { ImageApiImageClosestImagesRequest, ImageSummary } from "@picteus/ws-client";

import { ImageWithCaption, ViewMode } from "types";
import { notifyApiCallError, Validators } from "utils";
import { useActionModalContext } from "app/context";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmptyResults, ImageDetail, ImagesView, ImageThumbnail } from "app/components";

import style from "./ClosestEmbeddingsImages.module.scss";


type ClosestEmbeddingsImagesFormPayload = {
  count: number;
};

type ClosestEmbeddingsImagesType = {
  extensionId: string;
  imageId: string;
  viewMode: ViewMode;
};

export default function ClosestEmbeddingsImages({  extensionId, imageId, viewMode}: ClosestEmbeddingsImagesType) {
  const [t] = useTranslation();
  const [sourceImage, setSourceImage] = useState<ImageSummary>();
  const [loading, setLoading] = useState<boolean>(false);
  const [images, setImages] = useState<ImageWithCaption[]>([]);
  const focusTrapRef = useFocusTrap();
  const [, addModal, removeModal] = useActionModalContext();

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
      id: imageId,
    });
  }, []);

  function handleOnClickSourceImage() {
    const id = addModal({
      component: (
        <ImageDetail
          image={sourceImage}
          images={images}
          viewMode={viewMode}
          onClose={() => {
            removeModal(id);
          }}
        />),
      isStackable: true,
      withCloseButton: false,
      fullScreen: true
    });
  }

  function renderForm() {
    return (
      sourceImage && <Group mt="sm">
        <form onSubmit={form.onSubmit(handleSubmit)}>
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
      </Group>
    );
  }

  function renderContent() {
    return (<ImagesView
      viewData={{ viewMode, images }}
      isDefault={false}
      onEmptyResults={() => (<EmptyResults
        icon={<IconPhotoSearch size={140} stroke={1} />}
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
