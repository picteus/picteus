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
};

function IndicatorCard({
  icon: IconComponent,
  content,
  label
}: IndicatorCardType): ReactElement
{
  const edge = Common.ImageThumbnailEdge;

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

type ImagesCollectionPropsType = {
  readonly searchParameters: SearchParameters;
  readonly explanation?: string;
};

export default function ImagesCollection({
  explanation,
  searchParameters
}: ImagesCollectionPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ images, setImages ] = useState<ImageSummary[]>([]);
  const [ totalCount, setTotalCount ] = useState<number | undefined>(undefined);

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
            take: 20
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
  }, [ searchParameters ]);

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
          />
        )}
        {images.map((image) => (
          <ImageThumbnail key={image.id} imageOrUrl={image} edge={Common.ImageThumbnailEdge}/>
        ))}
        {totalCount !== undefined && totalCount > images.length && (
          <IndicatorCard
            icon={IconDots}
            content={<Text size="sm" fw={600} c="dimmed">+{totalCount - images.length}</Text>}
            label={t("imagesCollection.more")}
          />
        )}
      </Flex>
    </div>
  );
}
