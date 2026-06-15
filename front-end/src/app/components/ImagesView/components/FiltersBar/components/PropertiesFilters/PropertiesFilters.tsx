import React from "react";
import { Group, NumberInput, RangeSlider, Stack, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { SearchProperties } from "@picteus/ws-client";


const MAXIMUM_WEIGHT_BYTES = 23 * 1_024 * 1_024;
const MAXIMUM_DIMENSIONS_VALUE = 8_192;

type PropertiesFiltersType = {
  properties?: SearchProperties;
  onChange: (properties?: SearchProperties) => void;
};

export default function PropertiesFilters({ properties, onChange }: PropertiesFiltersType) {
  const [t] = useTranslation();

  const handleRangeChange = (key: keyof SearchProperties, bound: "minimum" | "maximum", val: number | undefined) => {
    const currentRange = properties?.[key] || {};
    const newRange = { ...currentRange, [bound]: val };

    if (newRange.minimum === undefined && newRange.maximum === undefined) {
      const newProps = { ...properties };
      delete newProps[key];
      onChange(Object.keys(newProps).length > 0 ? newProps : undefined);
    } else {
      onChange({ ...properties, [key]: newRange });
    }
  };

  const handleRangeSliderChange = (key: keyof SearchProperties, val: [number, number], maxVal: number) => {
    const currentRange = properties?.[key] || {};
    const newRange = {
      ...currentRange,
      minimum: val[0] === 0 ? undefined : val[0],
      maximum: val[1] === maxVal ? undefined : val[1]
    };

    if (newRange.minimum === undefined && newRange.maximum === undefined) {
      const newProps = { ...properties };
      delete newProps[key];
      onChange(Object.keys(newProps).length > 0 ? newProps : undefined);
    } else {
      onChange({ ...properties, [key]: newRange });
    }
  };

  const handleDateRange = (key: "creationDate" | "modificationDate", bound: "minimum" | "maximum", val: string | null) => {
    const currentRange = properties?.[key] || {};
    const newRange = {
      ...currentRange,
      [bound]: val ? dayjs(val).valueOf() : undefined,
    };

    if (newRange.minimum === undefined && newRange.maximum === undefined) {
      const newProps = { ...properties };
      delete newProps[key];
      onChange(Object.keys(newProps).length > 0 ? newProps : undefined);
    } else {
      onChange({ ...properties, [key]: newRange });
    }
  };

  return (
    <Stack gap="md">
      <Stack gap={5}>
        <Text size="sm" fw={500}>{t("field.width")}</Text>
        <RangeSlider
          value={[properties?.width?.minimum || 0, properties?.width?.maximum || MAXIMUM_DIMENSIONS_VALUE]}
          max={MAXIMUM_DIMENSIONS_VALUE}
          minRange={0}
          onChange={(val) => handleRangeSliderChange("width", val, MAXIMUM_DIMENSIONS_VALUE)}
          label={(value) => value === 0 || value === MAXIMUM_DIMENSIONS_VALUE ? t("field.any") : `${value}px`}
        />
        <Group grow mt="xs">
          <NumberInput
            placeholder={t("field.minimum")}
            value={properties?.width?.minimum ?? ""}
            onChange={(value) => handleRangeChange("width", "minimum", typeof value === "number" ? value : undefined)}
          />
          <NumberInput
            placeholder={t("field.maximum")}
            value={properties?.width?.maximum ?? ""}
            onChange={(value) => handleRangeChange("width", "maximum", typeof value === "number" ? value : undefined)}
          />
        </Group>
      </Stack>
      <Stack gap={5}>
        <Text size="sm" fw={500}>{t("field.height")}</Text>
        <RangeSlider
          value={[properties?.height?.minimum || 0, properties?.height?.maximum || MAXIMUM_DIMENSIONS_VALUE]}
          max={MAXIMUM_DIMENSIONS_VALUE}
          minRange={0}
          onChange={(value) => handleRangeSliderChange("height", value, MAXIMUM_DIMENSIONS_VALUE)}
          label={(value) => value === 0 || value === MAXIMUM_DIMENSIONS_VALUE ? t("field.any") : `${value}px`}
        />
        <Group grow mt="xs">
          <NumberInput
            placeholder={t("field.minimum")}
            value={properties?.height?.minimum ?? ""}
            onChange={(value) => handleRangeChange("height", "minimum", typeof value === "number" ? value : undefined)}
          />
          <NumberInput
            placeholder={t("field.maximum")}
            value={properties?.height?.maximum ?? ""}
            onChange={(value) => handleRangeChange("height", "maximum", typeof value === "number" ? value : undefined)}
          />
        </Group>
      </Stack>
      <Stack gap={5}>
        <Text size="sm" fw={500}>{t("field.binarySize")} (Bytes)</Text>
        <RangeSlider
          value={[properties?.weightInBytes?.minimum || 0, properties?.weightInBytes?.maximum || MAXIMUM_WEIGHT_BYTES]}
          max={MAXIMUM_WEIGHT_BYTES}
          minRange={0}
          onChange={(value) => handleRangeSliderChange("weightInBytes", value, MAXIMUM_WEIGHT_BYTES)}
          label={(value) => value === 0 || value === MAXIMUM_WEIGHT_BYTES ? t("field.any") : `${Math.round(value / 1024 / 1024)} MB`}
        />
        <Group grow mt="xs">
          <NumberInput
            placeholder={t("field.minimum")}
            value={properties?.weightInBytes?.minimum ?? ""}
            onChange={(value) => handleRangeChange("weightInBytes", "minimum", typeof value === "number" ? value : undefined)}
          />
          <NumberInput
            placeholder={t("field.maximum")}
            value={properties?.weightInBytes?.maximum ?? ""}
            onChange={(value) => handleRangeChange("weightInBytes", "maximum", typeof value === "number" ? value : undefined)}
          />
        </Group>
      </Stack>
      <Stack gap={5}>
        <Text size="sm" fw={500}>{t("field.createdOn")}</Text>
        <Group grow>
          <DatePickerInput
            placeholder={t("field.from")}
            clearable
            value={properties?.creationDate?.minimum ? new Date(properties.creationDate.minimum) : null}
            onChange={(value) => handleDateRange("creationDate", "minimum", value)}
          />
          <DatePickerInput
            placeholder={t("field.to")}
            clearable
            value={properties?.creationDate?.maximum ? new Date(properties.creationDate.maximum) : null}
            onChange={(value) => handleDateRange("creationDate", "maximum", value)}
          />
        </Group>
      </Stack>
      <Stack gap={5}>
        <Text size="sm" fw={500}>{t("field.modifiedOn")}</Text>
        <Group grow>
          <DatePickerInput
            placeholder={t("field.from")}
            clearable
            value={properties?.modificationDate?.minimum ? new Date(properties.modificationDate.minimum) : null}
            onChange={(value) => handleDateRange("modificationDate", "minimum", value)}
          />
          <DatePickerInput
            placeholder={t("field.to")}
            clearable
            value={properties?.modificationDate?.maximum ? new Date(properties.modificationDate.maximum) : null}
            onChange={(value) => handleDateRange("modificationDate", "maximum", value)}
          />
        </Group>
      </Stack>
    </Stack>
  );
}
