import React, { ReactNode } from "react";
import { Table, Text } from "@mantine/core";


type TableComponentType = {
  label: ReactNode;
  value: ReactNode;
};

export default function TableComponent({ label, value }: TableComponentType) {
  return (
    <Table.Tr>
      <Table.Td style={{ width: "110px" }}>
        <Text c="dimmed" size="sm">
          {label}
        </Text>
      </Table.Td>
      <Table.Td>{value}</Table.Td>
    </Table.Tr>
  );
}
