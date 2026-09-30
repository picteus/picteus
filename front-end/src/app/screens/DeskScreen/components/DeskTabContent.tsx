import { ReactElement } from "react";
import { Box, Container, ScrollArea } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { EmptyResults, Iframe, ImagesView, Markdown } from "app/components";


export interface DeskTabContentPropsType
{
  tab: DeskTabType;
}

export default function DeskTabContent({ tab }: DeskTabContentPropsType): ReactElement | null
{
  const [ t ] = useTranslation();

  const content = tab.content;

  if (content.kind === "images")
  {
    return (
      <ImagesView
        viewData={content.data}
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
