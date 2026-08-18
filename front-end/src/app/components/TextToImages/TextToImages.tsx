import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Flex, Group, Input, NumberInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useFocusTrap } from "@mantine/hooks";
import { IconInfoCircle, IconPhotoSearch } from "@tabler/icons-react";

import { ExtensionIdImageEmbeddingName, ImageApiImageTextToImagesRequest } from "@picteus/ws-client";

import { ImageWithCaption } from "types";
import { ToastService, Validators } from "utils";
import { ImageService, StorageService } from "app/services";
import { CaptionDistance, EmbeddingSelect, EmptyResults, ImagesView } from "app/components";


type TextToImagesFormPayload = {
  count: number;
  text: string;
};

type TextToImageType = {
  extensionId: string;
};

export default function TextToImages({ extensionId }: TextToImageType)
{
  const [ t ] = useTranslation();
  const [ images, setImages ] = useState<ImageWithCaption[]>([]);
  const [ emptyResult, setEmptyResult ] = useState<boolean>(false);
  const [ loading, setLoading ] = useState<boolean>(false);
  const [ embeddingName, setEmbeddingName ] = useState<ExtensionIdImageEmbeddingName | undefined>();
  const [ hasText, setHasText ] = useState<boolean>(false);
  const focusTrapRef = useFocusTrap();

  const initialValues: TextToImagesFormPayload =
    {
      count: StorageService.getTextToImagesResultsCount(),
      text: undefined
    };

  const form = useForm({
    mode: "uncontrolled",
    initialValues,
    validate: {
      text: Validators.isNotEmpty,
      count: Validators.isNotEmpty
    }
  });

  async function handleSubmit(values: TextToImagesFormPayload)
  {
    StorageService.setTextToImagesResultsCount(values.count);
    if (!embeddingName)
    {
      return;
    }
    const parameters: ImageApiImageTextToImagesRequest = {
      ...values,
      name: embeddingName.name,
      extensionId: embeddingName.extensionId
    };
    void load(parameters);
  }

  async function load(parameters: ImageApiImageTextToImagesRequest)
  {
    if (!parameters.text)
    {
      return;
    }
    setLoading(true);
    setEmptyResult(false);

    try
    {
      const imageDistances = await ImageService.textToImages(parameters);
      const computedImages = imageDistances
        .sort((a, b) => a.distance - b.distance)
        .map((imageDistance) =>
        {
          return {
            ...imageDistance.image,
            caption: <CaptionDistance distance={imageDistance.distance}/>
          };
        });
      setEmptyResult(computedImages.length === 0);
      setImages(computedImages);
    }
    catch (error)
    {
      ToastService.apiCallError(error, "An error occurred while trying to search images from text");
    }
    finally
    {
      setLoading(false);
    }
  }

  function renderForm()
  {
    return (
      <Group mt="sm">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Flex ref={focusTrapRef} align="end" gap={10}>
            <Textarea
              data-autofocus
              flex="1"
              withAsterisk
              autosize
              minRows={1}
              maxRows={5}
              label={t("field.search")}
              placeholder={t("textToImagesModal.searchPlaceholder")}
              {...form.getInputProps("text")}
              onChange={(event) =>
              {
                const props = form.getInputProps("text");
                if (props.onChange)
                {
                  props.onChange(event);
                }
                setHasText(event.currentTarget.value.trim().length > 0);
              }}
            />
            <Input.Wrapper label={t("field.name")}>
              <EmbeddingSelect onSelected={setEmbeddingName}/>
            </Input.Wrapper>
            <NumberInput
              min={1}
              withAsterisk
              label={t("field.imageCount")}
              placeholder={t("textToImagesModal.countPlaceholder")}
              {...form.getInputProps("count")}
            />
            <Button loading={loading} disabled={loading || embeddingName === undefined || !hasText} type="submit">
              {t("button.find")}
            </Button>
          </Flex>
        </form>
      </Group>
    );
  }

  function renderContent()
  {
    return (<ImagesView
      viewData={{ viewMode: "masonry", images }}
      isDefault={false}
      onEmptyResults={() =>
      {
        if (loading === false && emptyResult === true)
        {
          return (<EmptyResults
            icon={IconPhotoSearch}
            description={t("emptyImages.description")}
            title={t("emptyImages.title")}
          />);
        }
      }}
      controlBarChildren={renderForm()}
    />);
  }

  return (
    <>
      <Alert icon={<IconInfoCircle/>}>
        {t("textToImagesModal.description")}
      </Alert>
      <Flex align="center" justify="center">{renderContent()}</Flex>
    </>
  );
}
