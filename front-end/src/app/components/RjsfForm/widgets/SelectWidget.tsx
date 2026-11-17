import { type ChangeEvent, type FocusEvent, type ReactElement, useCallback } from "react";
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
import { useFieldContext } from "@aokiapp/rjsf-mantine-theme/lib/templates/FieldTemplate";


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
  const selectedIndex = Array.isArray(selectedIndices) ? selectedIndices[0] : selectedIndices;
  const { description } = useFieldContext();

  const handleFocus = useCallback((event: FocusEvent<HTMLSelectElement>) =>
  {
    return onFocus(id, enumOptionsValueForIndex(event.currentTarget.value, enumOptions, optEmptyVal));
  }, [ onFocus, id, enumOptions, optEmptyVal ]);

  const handleBlur = useCallback((event: FocusEvent<HTMLSelectElement>) =>
  {
    return onBlur(id, enumOptionsValueForIndex(event.currentTarget.value, enumOptions, optEmptyVal));
  }, [ onBlur, id, enumOptions, optEmptyVal ]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
    {
      return onChange(enumOptionsValueForIndex(event.currentTarget.value, enumOptions, optEmptyVal));
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
      description={description}
      disabled={disabled || readonly}
      error={error}
      id={id}
      label={fieldLabel}
      name={id}
      autoFocus={autofocus}
      required={required}
      value={selectedIndex === undefined ? "" : String(selectedIndex)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={ariaDescribedByIds(id)}
      className="armt-widget-select armt-widget-select-single"
      mb="md"
    />
  );
}
