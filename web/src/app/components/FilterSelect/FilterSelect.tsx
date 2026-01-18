import { Flex, MultiSelect, Stack, Text } from "@mantine/core";
import React, { useEffect, useMemo, useState } from "react";

export default function FilterSelect({
  label,
  options = [],
  selectedValues = [],
  onChange,
}) {
  const [selected, setSelected] = useState<string[]>(selectedValues);

  const data = useMemo(() => {
    return [...options];
  }, [options]);

  useEffect(() => {
    setSelected(selectedValues);
  }, [selectedValues]);

  function handleOnChange(value: string[]) {
    setSelected(value);
    if (value !== selectedValues) {
      /*   if (value.length === 0) {
        onChange(options.map((option) => option.value));
      } else {*/
      onChange(value);
      /*   }*/
    }
  }

  function computePlaceholder() {
    if (selected.length === 0) {
      return "All values";
    } else if (selected.length === options.length) {
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
        value={selected}
        clearable
        comboboxProps={{ withinPortal: false }}
        placeholder={computePlaceholder()}
        onChange={handleOnChange}
      />
    </Stack>
  );
}
