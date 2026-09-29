import { ReactElement } from "react";
import { ScrollArea } from "@mantine/core";
import { IconPhotoSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { DeskTabType } from "types";
import { EmptyResults, Iframe, ImagesView, Markdown } from "app/components";

import style from "../DeskScreen.module.scss";


export interface DeskTabContentPropsType
{
  tab: DeskTabType;
}

export default function DeskTabContent({ tab }: DeskTabContentPropsType): ReactElement
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

  if (content.kind === "url")
  {
    return (
      <div className={style.iframeContainer}>
        <Iframe content={{ url: content.url }}/>
      </div>
    );
  }

  if (content.kind === "html")
  {
    return (
      <div className={style.iframeContainer}>
        <Iframe content={{ html: content.html }}/>
      </div>
    );
  }

  if (content.kind === "markdown")
  {
    return (
      <ScrollArea style={{ height: "100%", width: "100%" }}>
        <div className={style.markdownContainer}>
          <Markdown content={content.markdown}/>
        </div>
      </ScrollArea>
    );
  }

  return null;
}
