import { WidgetProps } from "@rjsf/utils";

import { useCollections } from "app/hooks";
import { CollectionSelect } from "../..";


export default function CollectionWidget(props: WidgetProps)
{
  const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
  const { data: collections = [] } = useCollections();

  return (
    <CollectionSelect
      collections={collections}
      id={id}
      label={schema.title}
      description={schema.description}
      required={required}
      disabled={disabled || readonly}
      initialValue={value !== undefined && value !== null ? value.toString() : null}
      onChange={(updatedValue) =>
      {
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
    />
  );
}
