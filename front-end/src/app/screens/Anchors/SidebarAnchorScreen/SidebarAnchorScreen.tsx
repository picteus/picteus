import { ReactNode } from "react";
import { AdditionalUi } from "types";

import style from "./SidebarAnchorScreen.module.scss";


export type SidebarAnchorScreenPropsType =
  {
    readonly element: AdditionalUi;
  };

export default function SidebarAnchorScreen({ element }: SidebarAnchorScreenPropsType): ReactNode
{
  const content = element.content;
  return (
    <div className={style.container}>
      <iframe
        src={"url" in content ? content.url : undefined}
        srcDoc={"inline" in content ? content.inline : undefined}
      />
    </div>
  );
}
