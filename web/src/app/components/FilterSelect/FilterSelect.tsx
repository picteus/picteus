import { Flex, MultiSelect, Stack, Text } from "@mantine/core";
import React, { useMemo } from "react";

import { WithValueAndLabel } from "app/services/FiltersService.ts";


type FilterSelectType = {
  label: string;
  options: WithValueAndLabel[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
};

export default function FilterSelect({ label, options = [], selectedValues = [], onChange }: FilterSelectType) {

  const data = useMemo<WithValueAndLabel[]>(() => {
    return [...options];
  }, [options]);

  function handleOnChange(values: string[]) {
    if (values !== selectedValues) {
      onChange(values);
    }
  }

  function computePlaceholder() {
    if (selectedValues.length === 0) {
      return "All values";
    } else if (selectedValues.length === options.length) {
      return "";
    }
    return "Pick an option";
  }

  return (
    <Stack gap={5}>
      <Flex align="center">
        <Text size="sm">{label}</Text>
      </Flex>
      <MultiSelect
        data={data}
        value={selectedValues}
        clearable
        comboboxProps={{ withinPortal: false }}
        placeholder={computePlaceholder()}
        onChange={handleOnChange}
      />
    </Stack>
  );
}
