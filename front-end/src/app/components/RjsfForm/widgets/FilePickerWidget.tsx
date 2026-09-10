import { ReactElement } from "react";
import { WidgetProps } from "@rjsf/utils";

import FileOrDirectoryPickerWidget from "./FileOrDirectoryPickerWidget";


export default function FilePickerWidget(props: WidgetProps): ReactElement
{
  return <FileOrDirectoryPickerWidget {...props} kind="file"/>;
}
