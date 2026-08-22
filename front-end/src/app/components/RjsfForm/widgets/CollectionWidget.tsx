import { useEffect, useState } from "react";
import { WidgetProps } from "@rjsf/utils";

import { Collection } from "@picteus/ws-client";

import { ToastService } from "utils";
import { CollectionService } from "app/services";
import { CollectionSelect } from "../..";


export default function CollectionWidget(props: WidgetProps)
{
  const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
  const [ collections, setCollections ] = useState<Collection[]>([]);

  useEffect(() =>
  {
    CollectionService.fetchAll().then(setCollections).catch(ToastService.apiCallError);
  }, []);

  return (<CollectionSelect
    collections={collections} id={id} label={schema.title}
    description={schema.description}
    required={required}
    disabled={disabled || readonly}
    initialValue={value !== undefined && value !== null ? value.toString() : null}
    onChange={(updatedValue) =>
    {
      // Convert value back to number if needed, but Rjsf generally prefers strings for string types
      // or number for number/integer schema properties. If the schama type is integer, we should convert it.
      if (updatedValue === null)
      {
        onChange(undefined);
      }
      else
      {
        onChange(schema.type === "integer" || schema.type === "number" ? Number(updatedValue) : updatedValue);
      }
    }}
    onBlur={id && onBlur ? () => onBlur(id, value) : undefined}
    onFocus={id && onFocus ? () => onFocus(id, value) : undefined}
  />);
}
