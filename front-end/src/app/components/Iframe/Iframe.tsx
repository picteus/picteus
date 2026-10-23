import { ReactNode } from "react";

import { IntentInlineContent, IntentUrlContent } from "@picteus/shared-core";

import style from "./Iframe.module.scss";


type IframePropsType = {
  content: IntentUrlContent | IntentInlineContent;
};

export default function Iframe({ content }: IframePropsType): ReactNode
{
  return (
    <iframe
      className={style.iframe}
      src={"url" in content ? content.url : undefined}
      srcDoc={"inline" in content ? content.inline : undefined}
    />
  );
}
