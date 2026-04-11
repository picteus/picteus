import React, { ReactNode } from "react";
import { Table, Text } from "@mantine/core";

type TableComponentType = {
  data: {
    label: string;
    value: string | ReactNode;
  };
};

export default function TableComponent({ data }: TableComponentType) {
  return (
    <Table.Tr>
      <Table.Td style={{ width: "110px" }}>
        <Text c="dimmed" size="sm">
          {data.label}
        </Text>
      </Table.Td>
      <Table.Td>{data.value}</Table.Td>
    </Table.Tr>
  );
}
