import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { Flex, NumberFormatter, Paper, Stack, Text } from "@mantine/core";
import { IconDots, IconPhoto } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ImageSummary, SearchParameters } from "@picteus/ws-client";
import { ToastService } from "utils";
import { ImageService } from "app/services";
import { Common, ImageThumbnail } from "app/components";

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
        <IconComponent size={Common.IconMediumSize} opacity={0.7}/>
        {content}
        <Text size="xs" c="dimmed">{label}</Text>
      </Stack>
    </Paper>
  );
}

type CommonImagesCollectionPropsType = {
  count?: number;
  explanation?: string;
};

type WithSearchParametersImagesCollectionPropsType = CommonImagesCollectionPropsType & {
  searchParameters: SearchParameters;
  images?: never;
  totalCount?: never;
};

type WithImagesImagesCollectionPropsType = CommonImagesCollectionPropsType & {
  images: ImageSummary[];
  totalCount?: number;
  searchParameters?: never;
};

export type ImagesCollectionPropsType =
  | WithSearchParametersImagesCollectionPropsType
  | WithImagesImagesCollectionPropsType;

export default function ImagesCollection({
  count = 20,
  explanation,
  searchParameters,
  images: initialImages,
  totalCount: initialTotalCount
}: ImagesCollectionPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ images, setImages ] = useState<ImageSummary[]>(initialImages ?? []);
  const [ totalCount, setTotalCount ] = useState<number | undefined>(initialTotalCount);
  const edge = 100;

  useEffect(() =>
  {
    if (initialImages !== undefined)
    {
      setImages(initialImages);
      setTotalCount(initialTotalCount);
      return;
    }

    if (searchParameters === undefined)
    {
      return;
    }

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
  }, [ searchParameters, initialImages, initialTotalCount, count ]);

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
          <ImageThumbnail key={image.id} imageOrUrl={image} width={edge} height={edge}/>
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
