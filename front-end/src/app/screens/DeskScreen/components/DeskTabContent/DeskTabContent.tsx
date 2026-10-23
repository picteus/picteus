import React, { ReactElement, useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Container, Divider, ScrollArea } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { SearchOriginNature } from "@picteus/ws-client";

import {
  DeskTabHtmlInlineContentType,
  DeskTabHtmlUrlContentType,
  DeskTabImagesContentType,
  DeskTabMarkdownInlineContentType,
  DeskTabMarkdownUrlContentType,
  DeskTabType,
  ViewTabDataType
} from "types";
import { ToastService } from "utils";
import { NotificationService } from "app/services";
import { useDeskTabsContext } from "app/context";
import { useImage } from "app/hooks";
import { EmptyResults, Iframe, ImageDetail, ImagesView, LoadingView, Markdown } from "app/components";


interface DeskTabImageContentPropsType
{

  readonly tab: DeskTabType;
  readonly imageId: string;
  readonly withDivider?: boolean;

}

function DeskTabImageContent({
  tab,
  imageId,
  withDivider = false
}: DeskTabImageContentPropsType): ReactElement | null
{
  const [ t ] = useTranslation();
  const { removeTab } = useDeskTabsContext();

  const handleImageError = useCallback((): void =>
  {
    removeTab(tab.id);
    void NotificationService.deleteNotificationsForImage(imageId, new Set<string>([ tab.id ]));
    ToastService.warning(t("message.notFoundImage"));
  }, [ imageId, tab.id, removeTab, t ]);

  const { data: image } = useImage(imageId, { onError: handleImageError });

  if (image === undefined)
  {
    return null;
  }

  return (
    <>
      {withDivider === true && <Divider/>}
      <ImageDetail
        image={image}
        images={[ image ]}
        viewMode="gallery"
      />
    </>
  );
}

interface DeskTabMultipleImagesContentPropsType
{

  readonly content: DeskTabImagesContentType;

}

function DeskTabMultipleImagesContent({ content }: DeskTabMultipleImagesContentPropsType): ReactElement
{
  const [ t ] = useTranslation();

  const imageIdentifiers = content.images.map(imageItem => imageItem.imageId).join(",");

  const viewData = useMemo<ViewTabDataType>(() =>
  {
    const ids = content.images.map(imageItem => imageItem.imageId);

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
  }, [ imageIdentifiers ]);

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

  return (
    <ImagesView
      viewData={viewData}
      isDefault={false}
      onEmptyResults={handleEmptyResults}
    />
  );
}

interface DeskTabImagesContentPropsType
{

  readonly tab: DeskTabType;
  readonly content: DeskTabImagesContentType;

}

function DeskTabImagesContent({ tab, content }: DeskTabImagesContentPropsType): ReactElement | null
{
  if (content.images.length === 1)
  {
    return (
      <DeskTabImageContent
        tab={tab}
        imageId={content.images[0].imageId}
        withDivider={true}
      />
    );
  }

  return <DeskTabMultipleImagesContent content={content}/>;
}

interface DeskTabHtmlContentPropsType
{

  readonly content: DeskTabHtmlUrlContentType | DeskTabHtmlInlineContentType;

}

function DeskTabHtmlContent({ content }: DeskTabHtmlContentPropsType): ReactElement
{
  return (
    <Box h="100%" w="100%">
      <Iframe content={"url" in content ? { url: content.url } : { inline: content.html }}/>
    </Box>
  );
}

interface DeskTabMarkdownContentPropsType
{

  readonly content: DeskTabMarkdownUrlContentType | DeskTabMarkdownInlineContentType;

}

function DeskTabMarkdownContent({ content }: DeskTabMarkdownContentPropsType): ReactElement | null
{
  const markdownUrl = "url" in content ? content.url : undefined;
  const lastHandledMarkdownErrorUpdatedAt = useRef<number>(0);

  const {
    data: fetchedMarkdown,
    isLoading: isMarkdownLoading,
    error: markdownError,
    errorUpdatedAt: markdownErrorUpdatedAt
  } = useQuery(
    {
      queryKey: [ "deskTabMarkdown", markdownUrl ?? "" ],
      queryFn: async (): Promise<string> =>
      {
        const response = await fetch(markdownUrl!);
        if (response.ok === false)
        {
          const statusText = response.statusText ? ` ${response.statusText}` : "";
          throw new Error(`Failed to fetch markdown content from "${markdownUrl}": HTTP ${response.status}${statusText}`);
        }
        return response.text();
      },
      enabled: Boolean(markdownUrl && markdownUrl.length > 0)
    }
  );

  useEffect(() =>
  {
    if (markdownError && markdownErrorUpdatedAt !== lastHandledMarkdownErrorUpdatedAt.current)
    {
      lastHandledMarkdownErrorUpdatedAt.current = markdownErrorUpdatedAt;
      ToastService.failureAndMessage(markdownError);
    }
  }, [ markdownError, markdownErrorUpdatedAt ]);

  let markdown: string;
  if ("markdown" in content)
  {
    markdown = content.markdown;
  }
  else
  {
    if (isMarkdownLoading === true)
    {
      return <LoadingView visible={true}/>;
    }

    markdown = fetchedMarkdown ?? "";
  }

  return (
    <ScrollArea h="100%" w="100%">
      <Container size="md" py="xl">
        <Markdown content={markdown}/>
      </Container>
    </ScrollArea>
  );
}

export interface DeskTabContentPropsType
{

  readonly tab: DeskTabType;

}

function DeskTabContent({ tab }: DeskTabContentPropsType): ReactElement | null
{
  const content = tab.content;
  if (content.kind === "image")
  {
    return (
      <DeskTabImageContent
        tab={tab}
        imageId={content.imageId}
      />
    );
  }
  else if (content.kind === "images")
  {
    return (
      <DeskTabImagesContent
        tab={tab}
        content={content}
      />
    );
  }
  else if (content.kind === "html")
  {
    return <DeskTabHtmlContent content={content}/>;
  }
  else if (content.kind === "markdown")
  {
    return <DeskTabMarkdownContent content={content}/>;
  }
  return null;
}

export default React.memo(DeskTabContent);
