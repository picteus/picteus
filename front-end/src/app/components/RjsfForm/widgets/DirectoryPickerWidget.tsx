import { ReactElement } from "react";
import { WidgetProps } from "@rjsf/utils";

import FileOrDirectoryPickerWidget from "./FileOrDirectoryPickerWidget";


export default function DirectoryPickerWidget(props: WidgetProps): ReactElement
{
  return <FileOrDirectoryPickerWidget {...props} kind="directory"/>;
}
