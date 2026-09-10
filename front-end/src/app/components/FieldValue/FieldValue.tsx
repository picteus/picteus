import React, { ReactNode } from "react";
import { Stack, Text } from "@mantine/core";


type FieldValueType = {
  name: string;
  value: ReactNode;
};

export default function FieldValue({ name, value }: FieldValueType)
{
  return (<Stack gap="sm">
    <Text size="sm" fw={600} c="dimmed">{name}</Text>
    {value}
  </Stack>);
}
