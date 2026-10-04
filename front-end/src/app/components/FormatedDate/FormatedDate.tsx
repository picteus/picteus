import React, { ReactElement } from "react";

import { formatAbsoluteDate, formatDate, FormatDateOptionsType } from "utils";


type FormatedDatePropsType =
  {
    readonly timestamp: number;
    readonly options?: FormatDateOptionsType;
  };

export default function FormatedDate({ timestamp, options }: FormatedDatePropsType): ReactElement
{
  return (
    <span title={formatAbsoluteDate(timestamp)}>
      {formatDate(timestamp, options)}
    </span>
  );
}
