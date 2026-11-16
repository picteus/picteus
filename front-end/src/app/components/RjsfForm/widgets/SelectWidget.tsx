import { ReactElement, useCallback } from "react";
import { NativeSelect } from "@mantine/core";
import {
  ariaDescribedByIds,
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  labelValue,
  WidgetProps
} from "@rjsf/utils";

// Import the built-in SelectWidget from the theme library to reuse its multi-select branch
import SelectWidget from "@aokiapp/rjsf-mantine-theme/lib/widgets/SelectWidget";


export default function SelectWidgetWrapper(props: WidgetProps): ReactElement
{
  const {
    id,
    options,
    value,
    required,
    disabled,
    readonly,
    label,
    hideLabel,
    rawErrors,
    autofocus = false,
    onChange,
    onBlur,
    onFocus,
    hideError
  } = props;

  const { enumOptions, enumDisabled, emptyValue: optEmptyVal } = options;
  const selectedIndices = enumOptionsIndexForValue(value, enumOptions, false);

  const handleFocus = useCallback(() =>
  {
    return onFocus(id, enumOptionsValueForIndex(selectedIndices, enumOptions, optEmptyVal));
  }, [ onFocus, id, selectedIndices, enumOptions, optEmptyVal ]);

  const handleBlur = useCallback(() =>
  {
    return onBlur(id, enumOptionsValueForIndex(selectedIndices, enumOptions, optEmptyVal));
  }, [ onBlur, id, selectedIndices, enumOptions, optEmptyVal ]);

  const handleChange = useCallback(
    (updatedValue: string | string[] | null) =>
    {
      return onChange(enumOptionsValueForIndex(updatedValue, enumOptions, optEmptyVal));
    },
    [ onChange, enumOptions, optEmptyVal ]
  );

  // For multi-select, the built-in widget already works correctly (no empty placeholder)
  if (props.multiple)
  {
    return <SelectWidget {...props} />;
  }

  // For single-select, override the built-in behavior to remove the empty placeholder option
  // that the library hardcodes at: const data = [{ value: "-1", label: placeholder || "" }, ...valuedData]

  const error = rawErrors !== undefined && !hideError && rawErrors.length > 0 ? rawErrors.join(", ") : undefined;
  const fieldLabel = labelValue(label, hideLabel, false);

  // Build data without the empty placeholder option that the built-in widget prepends
  const data = (enumOptions || []).map(({ value: optionValue, label: optionLabel }, i) =>
  {
    const isDisabled = enumDisabled && enumDisabled.indexOf(optionValue) !== -1;
    return { value: String(i), label: optionLabel, disabled: isDisabled };
  });

  return (
    <NativeSelect
      data={data}
      disabled={disabled || readonly}
      error={error}
      label={fieldLabel}
      autoFocus={autofocus}
      required={required}
      value={selectedIndices?.[0] !== undefined ? String(selectedIndices[0]) : undefined}
      onChange={(event) => handleChange(event.currentTarget.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={ariaDescribedByIds(id)}
      className="armt-widget-select armt-widget-select-single"
      mb="md"
    />
  );
}
