import React, { ReactNode } from "react";
import { Box, Text } from "@mantine/core";


type FieldValueType = {
  name: string;
  value: ReactNode;
};

export default function FieldValue({ name, value}: FieldValueType) {
  return (<Box>
    <Text size="sm" fw={600} c="dimmed">{name}</Text>
    {value}
  </Box>);
}
