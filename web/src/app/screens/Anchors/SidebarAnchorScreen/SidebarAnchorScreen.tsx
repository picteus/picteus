import { AdditionalUi } from "types";
import style from "./SidebarAnchorScreen.module.scss";

export default function SidebarAnchorScreen({
  element,
}: {
  element: AdditionalUi;
}) {
  return (
    <div className={style.container}>
      <iframe src={element.url} />
    </div>
  );
}
