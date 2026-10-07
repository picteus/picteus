import React, { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { Box, Container, Divider, ScrollArea } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image, SearchOriginNature } from "@picteus/ws-client";

import { DeskTabType, ViewTabDataType } from "types";
import { ToastService } from "utils";
import { ImageService } from "app/services";
import { EmptyResults, Iframe, ImageDetail, ImagesView, Markdown } from "app/components";


export interface DeskTabContentPropsType
{

  readonly tab: DeskTabType;

}

function DeskTabContent({ tab }: DeskTabContentPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const [ image, setImage ] = useState<Image | undefined>(undefined);
  const content = tab.content;

  const singleImageId = content.kind === "image" ? content.imageId : (content.kind === "images" && content.images.length === 1) ? content.images[0].imageId : undefined;

  useEffect(() =>
  {
    if (singleImageId !== undefined)
    {
      ImageService.get({ id: singleImageId }).then(setImage).catch(() => ToastService.apiCallError);
    }
  }, [ singleImageId ]);

  const imageIdentifiers = content.kind === "images"
    ? content.images.map((imageItem) => imageItem.imageId).join(",")
    : "";

  const viewData = useMemo<ViewTabDataType>(() =>
  {
    const ids = content.kind === "images"
      ? content.images.map((imageItem) => imageItem.imageId)
      : [];

    return {
      mode: "masonry",
      filterOrCollectionId: {
        filter: {
          origin: {
            kind: SearchOriginNature.Images,
            ids
          }
        }
      }
    };
  }, [ content.kind, imageIdentifiers ]);

  const handleEmptyResults = useCallback((): ReactElement<typeof EmptyResults> =>
  {
    return (
      <EmptyResults
        icon={IconPhotoSearch}
        title={t("emptyImages.title")}
        description={t("emptyImages.description")}
      />
    );
  }, [ t ]);

  if (content.kind === "image")
  {
    if (image === undefined)
    {
      return null;
    }

    return (
      <ImageDetail
        image={image}
        images={[ image ]}
        viewMode="gallery"
        onClose={() =>
        {
        }}
      />
    );
  }

  if (content.kind === "images")
  {
    if (content.images.length === 1)
    {
      if (image === undefined)
      {
        return null;
      }

      return (
        <>
          <Divider/>
          <ImageDetail
            image={image}
            images={[ image ]}
            viewMode="gallery"
            onClose={() =>
            {
            }}
          />
        </>
      );
    }

    return (
      <ImagesView
        viewData={viewData}
        isDefault={false}
        onEmptyResults={handleEmptyResults}
      />
    );
  }

  if (content.kind === "url" || content.kind === "html")
  {
    return (
      <Box h="100%" w="100%">
        <Iframe content={content.kind === "url" ? { url: content.url } : { html: content.html }}/>
      </Box>
    );
  }

  if (content.kind === "markdown")
  {
    return (
      <ScrollArea h="100%" w="100%">
        <Container size="md" py="xl">
          <Markdown content={content.markdown}/>
        </Container>
      </ScrollArea>
    );
  }

  return null;
}

export default React.memo(DeskTabContent);
