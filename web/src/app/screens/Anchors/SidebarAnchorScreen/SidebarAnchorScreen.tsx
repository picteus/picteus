import { AdditionalUi } from "types";
import style from "./SidebarAnchorScreen.module.scss";

export default function SidebarAnchorScreen({
  element,
}: {
  element: AdditionalUi;
}) {
  const content = element.content;
  return (
    <div className={style.container}>
      <iframe {...{
        src: "url" in content ? content.url : undefined,
        srcDoc: "html" in content ? content.html : undefined
      }} />
    </div>
  );
}
