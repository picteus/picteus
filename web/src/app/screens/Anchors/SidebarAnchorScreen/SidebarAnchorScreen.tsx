import { AdditionalUi } from "types";
import { ExtensionsService } from "app/services";
import style from "./SidebarAnchorScreen.module.scss";

export default function SidebarAnchorScreen({
  element,
}: {
  element: AdditionalUi;
}) {
  return (
    <div className={style.container}>
      <iframe
        src={ExtensionsService.buildSidebarAnchorURL(
          element.url,
          element.extensionId,
        )}
      />
    </div>
  );
}
