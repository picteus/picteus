import { type ReactElement, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Flex, NumberFormatter, Paper, Stack, Text } from "@mantine/core";
import { IconDots, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ImageSummary, SearchParameters } from "@picteus/ws-client";

import { ImageItemMode, ImageOrSummary } from "types";
import { ToastService } from "utils";
import { useActionModalContext } from "app/context";
import { ImageService } from "app/services";
import { Common, ImageDetail, ImageItem } from "app/components";

import style from "./ImagesCollection.module.scss";


type IndicatorCardType = {
  icon: typeof IconPhoto;
  content: ReactNode;
  label: string;
  edge?: number;
};

function IndicatorCard({
  icon: IconComponent,
  content,
  label,
  edge
}: IndicatorCardType): ReactElement
{
  return (
    <Paper
      withBorder
      radius="md"
      w={edge}
      h={edge}
      flex={`0 0 ${edge}px`}
    >
      <Stack align="center" justify="center" gap={2} h="100%">
        <IconComponent size={Common.IconLargeSize} opacity={0.7}/>
        {content}
        <Text size="xs" c="dimmed">{label}</Text>
      </Stack>
    </Paper>
  );
}

type ImagesCollectionType = {
  searchParameters: SearchParameters;
  count?: number;
  explanation?: string;
};

export default function ImagesCollection({
  searchParameters,
  count = 20,
  explanation
}: ImagesCollectionType): ReactElement
{
  const [ t ] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ images, setImages ] = useState<ImageSummary[]>([]);
  const [ totalCount, setTotalCount ] = useState<number>();
  const [ , addModal, removeModal ] = useActionModalContext();
  const edge = 100;

  useEffect(() =>
  {
    async function load(): Promise<void>
    {
      try
      {
        const result = await ImageService.searchSummaries({
          ...searchParameters,
          range: {
            ...searchParameters.range,
            take: count
          }
        });
        setImages(result.items);
        setTotalCount(result.totalCount);
      }
      catch (error)
      {
        ToastService.apiCallError(error, "An error occurred while retrieving the images");
      }
    }

    void load();
  }, [ searchParameters, count ]);

  const handleOnClick = useCallback((image: ImageOrSummary): void =>
  {
    const id = addModal({
      component: (
        <ImageDetail
          image={image}
          images={images}
          viewMode="gallery"
          onClose={() =>
          {
            removeModal(id);
          }}
        />
      ),
      isStackable: true,
      withCloseButton: false,
      fullScreen: true
    });
  }, [ addModal, removeModal, images ]);

  return (
    <div ref={containerRef} className={style.container}>
      {explanation && (<Text size="md" mb="sm">{explanation}</Text>)}
      <Flex className={style.content} align="center" gap={10}>
        {totalCount !== undefined && totalCount > 1 && (
          <IndicatorCard
            icon={IconPhoto}
            content={
              <Text fw={700} size="md">
                <NumberFormatter value={totalCount}/>
              </Text>
            }
            label={t("imagesCollection.images")}
            edge={edge}
          />
        )}
        {images.map((image) => (
          <ImageItem
            key={image.id}
            image={image}
            height={edge}
            width={edge}
            mode={ImageItemMode.PASSIVE}
            viewMode="gallery"
            onClick={handleOnClick}
          />
        ))}
        {totalCount !== undefined && totalCount > images.length && (
          <IndicatorCard
            icon={IconDots}
            content={<Text size="sm" fw={600} c="dimmed">+{totalCount - images.length}</Text>}
            label={t("imagesCollection.more")}
            edge={edge}
          />
        )}
      </Flex>
    </div>
  );
}
