import { ReactElement, useMemo } from "react";
import { Group, Input, NumberInput, Slider } from "@mantine/core";
import { WidgetProps } from "@rjsf/utils";


export default function RangeWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  onChangeOverride,
  onBlur,
  onFocus,
  schema,
  label,
  hideLabel,
  options,
  rawErrors,
  hideError,
  autofocus
}: WidgetProps): ReactElement
{
  const minimumValue: number = typeof options.min === "number" ? options.min : (typeof schema.minimum === "number" ? schema.minimum : 0);
  const maximumValue: number = typeof options.max === "number" ? options.max : (typeof schema.maximum === "number" ? schema.maximum : 100);
  const isInteger = schema.type === "integer";
  const stepValue: number = useMemo(() =>
  {
    if (typeof options.step === "number")
    {
      return options.step;
    }
    if (typeof schema.multipleOf === "number")
    {
      return schema.multipleOf;
    }
    if (isInteger)
    {
      return 1;
    }
    const rangeSpan = Math.abs(maximumValue - minimumValue);
    if (rangeSpan <= 1)
    {
      return 0.01;
    }
    if (rangeSpan <= 10)
    {
      return 0.1;
    }
    return 1;
  }, [ isInteger, maximumValue, minimumValue, options.step, schema.multipleOf ]);

  const decimalScale: number = useMemo(() =>
  {
    if (isInteger)
    {
      return 0;
    }
    const stepText = stepValue.toString();
    if (stepText.includes("."))
    {
      return stepText.split(".")[1].length;
    }
    return 2;
  }, [ isInteger, stepValue ]);

  const marks = useMemo(() =>
  {
    if (Array.isArray(options.marks))
    {
      return options.marks;
    }
    if (minimumValue === maximumValue)
    {
      return [
        { value: minimumValue, label: `${minimumValue}` }
      ];
    }
    return [
      { value: minimumValue, label: `${minimumValue}` },
      { value: maximumValue, label: `${maximumValue}` }
    ];
  }, [ maximumValue, minimumValue, options.marks ]);

  const triggerChange = onChangeOverride ?? onChange;

  function handleNumberInputChange(updatedValue: string | number): void
  {
    if (updatedValue === "" || updatedValue === undefined || updatedValue === null)
    {
      triggerChange(options.emptyValue ?? undefined);
      return;
    }
    const numericValue = typeof updatedValue === "number" ? updatedValue : Number(updatedValue);
    if (!Number.isNaN(numericValue))
    {
      triggerChange(numericValue);
    }
  }

  function handleSliderChange(updatedValue: number): void
  {
    triggerChange(updatedValue);
  }

  function handleNumberInputBlur(): void
  {
    if (id && onBlur)
    {
      onBlur(id, value);
    }
  }

  function handleSliderChangeEnd(updatedValue: number): void
  {
    if (id && onBlur)
    {
      onBlur(id, updatedValue);
    }
  }

  function handleNumberInputFocus(): void
  {
    if (id && onFocus)
    {
      onFocus(id, value);
    }
  }

  function formatSliderLabel(sliderValue: number): string
  {
    return isInteger ? `${sliderValue}` : sliderValue.toFixed(decimalScale);
  }

  const hasErrors = !hideError && rawErrors !== undefined && rawErrors.length > 0;
  const errorMessage = hasErrors ? rawErrors.join(", ") : undefined;
  const numericCurrentValue = typeof value === "number" ? value : undefined;
  const sliderCurrentValue = numericCurrentValue ?? (typeof schema.default === "number" ? schema.default : minimumValue);
  const fieldLabel = hideLabel ? undefined : (schema.title || label);

  return (
    <Input.Wrapper
      id={id}
      label={fieldLabel}
      description={schema.description}
      error={errorMessage}
      required={required}
      className="armt-widget-range"
      mb="md"
    >
      <Group align="flex-start" gap="md" mt="xs" wrap="nowrap">
        <NumberInput
          id={id}
          disabled={disabled || readonly}
          readOnly={readonly}
          value={numericCurrentValue ?? ""}
          onChange={handleNumberInputChange}
          onBlur={handleNumberInputBlur}
          onFocus={handleNumberInputFocus}
          min={minimumValue}
          max={maximumValue}
          step={stepValue}
          decimalScale={decimalScale}
          allowDecimal={!isInteger}
          clampBehavior="blur"
          hideControls={false}
          w={120}
        />
        <Slider
          id={`${id}-slider`}
          disabled={disabled || readonly}
          autoFocus={autofocus}
          value={sliderCurrentValue}
          onChange={handleSliderChange}
          onChangeEnd={handleSliderChangeEnd}
          min={minimumValue}
          max={maximumValue}
          step={stepValue}
          marks={marks}
          label={formatSliderLabel}
          style={{
            flex: 1,
            marginTop: 8,
            marginBottom: 16
          }}
        />
      </Group>
    </Input.Wrapper>
  );
}
