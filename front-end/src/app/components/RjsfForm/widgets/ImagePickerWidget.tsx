import { ReactElement, useMemo } from "react";
import { WidgetProps } from "@rjsf/utils";

import { ImagePickerSelectionModeType } from "types";
import ImagePickerField from "../../ImagePickerField/ImagePickerField.tsx";


type ImagePickerWidgetPropsType = WidgetProps & {
  readonly selectionMode: ImagePickerSelectionModeType;
};

export function ImagePickerWidget(props: ImagePickerWidgetPropsType): ReactElement
{
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    onChange,
    onBlur,
    onFocus,
    schema,
    label,
    hideLabel,
    selectionMode
  } = props;

  const selectedIds = useMemo<string[]>(() =>
  {
    if (selectionMode === "single")
    {
      return typeof value === "string" && value.length > 0 ? [ value ] : [];
    }
    if (Array.isArray(value))
    {
      return value.filter((item): item is string => typeof item === "string" && item.length > 0);
    }
    return [];
  }, [ selectionMode, value ]);

  function handleChange(nextIds: string[]): void
  {
    if (selectionMode === "single")
    {
      onChange(nextIds.length > 0 ? nextIds[0] : undefined);
      return;
    }
    onChange(nextIds.length > 0 ? nextIds : undefined);
  }

  return (
    <ImagePickerField
      id={id}
      label={hideLabel === true ? undefined : (schema.title || label)}
      description={schema.description}
      required={required}
      disabled={disabled === true || readonly === true}
      selectionMode={selectionMode}
      value={selectedIds}
      onChange={handleChange}
      onBlur={id && onBlur ? () => onBlur(id, value) : undefined}
      onFocus={id && onFocus ? () => onFocus(id, value) : undefined}
    />
  );
}

export function SingleImagePickerWidget(props: WidgetProps): ReactElement
{
  return <ImagePickerWidget {...props} selectionMode="single"/>;
}

export function MultipleImagesPickerWidget(props: WidgetProps): ReactElement
{
  return <ImagePickerWidget {...props} selectionMode="multiple"/>;
}
