import { CSSProperties, ReactElement, ReactNode } from "react";
import { StyleProp, Table } from "@mantine/core";


type TableHeaderCellPropsType = {
  readonly children?: ReactNode;
  readonly ta?: StyleProp<CSSProperties["textAlign"]>;
};

export default function TableHeaderCell({
  children,
  ta
}: TableHeaderCellPropsType): ReactElement
{
  return (
    <Table.Th h={34} py={0} fz={13} fw={500} c="dimmed" ta={ta}>
      {children}
    </Table.Th>
  );
}
