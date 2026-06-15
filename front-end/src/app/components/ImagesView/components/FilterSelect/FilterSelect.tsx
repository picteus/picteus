import React, { useMemo } from "react";
import {
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  ComboboxRenderPillInput,
  Flex,
  MultiSelect,
  Stack,
  Text
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import { WithValueAndLabel } from "app/services/FiltersService.ts";


type FilterSelectType = {
  label?: string;
  options: WithValueAndLabel[];
  selectedValues: string[];
  renderOption?: (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => React.ReactNode;
  renderPill?: (props: ComboboxRenderPillInput<string>) => React.ReactNode;
  onChange: (values: string[]) => void;
};

export default function FilterSelect({ label, options, selectedValues, renderOption, renderPill, onChange }: FilterSelectType) {
  const [t] = useTranslation();
  const data = useMemo<WithValueAndLabel[]>(() => {
    return [...options];
  }, [options]);
  const placeholder = useMemo(() => {
    if (selectedValues !== undefined) {
      if (selectedValues.length === 0) {
        return t("filters.selectAll");
      }
      else if (selectedValues.length === options.length) {
        return "";
      }
    }
    return t("filters.pickAnOption");
  }, [selectedValues]);

  function handleOnChange(values: string[]) {
    if (values !== selectedValues) {
      onChange(values);
    }
  }

  return (
    <Stack gap={5}>
      {label && <Flex align="center">
        <Text size="sm">{label}</Text>
      </Flex>}
      <MultiSelect
        data={data}
        value={selectedValues}
        clearable
        searchable
        hidePickedOptions
        renderOption={renderOption}
        renderPill={renderPill}
        comboboxProps={{ withinPortal: false }}
        placeholder={placeholder}
        onChange={handleOnChange}
        nothingFoundMessage={selectedValues.length === data.length ? undefined : t("filters.noMatching")}
      />
    </Stack>
  );
}
