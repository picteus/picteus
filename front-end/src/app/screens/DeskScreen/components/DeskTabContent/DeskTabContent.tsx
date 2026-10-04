import { ReactElement, useEffect, useState } from "react";
import { Box, Container, Divider, ScrollArea } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Image, SearchOriginNature } from "@picteus/ws-client";

import { DeskTabType } from "types";
import { ToastService } from "utils";
import { ImageService } from "app/services";
import { EmptyResults, Iframe, ImageDetail, ImagesView, Markdown } from "app/components";


export interface DeskTabContentPropsType
{
  tab: DeskTabType;
}

export default function DeskTabContent({ tab }: DeskTabContentPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const [ image, setImage ] = useState<Image | undefined>(undefined);
  const content = tab.content;
  useEffect(() =>
  {
    if (content.kind === "image" || (content.kind === "images" && content.images.length === 1))
    {
      ImageService.get({ id: content.kind === "image" ? content.imageId : content.images[0].imageId }).then(setImage).catch(() => ToastService.apiCallError);
    }
  }, [ content ]);

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
        viewData={{
          mode: "masonry",
          filterOrCollectionId: {
            filter: {
              origin: {
                kind: SearchOriginNature.Images,
                ids: content.images.map((image) => image.imageId)
              }
            }
          }
        }
        }
        isDefault={false}
        onEmptyResults={() => (
          <EmptyResults
            icon={IconPhotoSearch}
            title={t("emptyImages.title")}
            description={t("emptyImages.description")}
          />
        )}
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
