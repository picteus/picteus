import { ReactElement } from "react";
import { Flex, SegmentedControl, SegmentedControlProps, Text } from "@mantine/core";


export type CountedSegmentedControlItemType<TValue extends string> =
  {
    readonly value: TValue;
    readonly label: string;
    readonly count: number;
  };

type CountedSegmentedControlPropsType<TValue extends string> =
  Omit<SegmentedControlProps, "data" | "value" | "onChange"> &
  {
    readonly items: readonly CountedSegmentedControlItemType<TValue>[];
    readonly value: TValue;
    readonly onChange: (value: TValue) => void;
  };

export default function CountedSegmentedControl<TValue extends string>({
  items,
  value,
  onChange,
  ...segmentedControlProps
}: CountedSegmentedControlPropsType<TValue>): ReactElement
{
  return (
    <SegmentedControl
      {...segmentedControlProps}
      value={value}
      onChange={selectedValue => onChange(selectedValue as TValue)}
      data={items.map(item => ({
        value: item.value,
        label: (
          <Flex gap={6} align="center" justify="center" wrap="nowrap">
            <Text span inherit>
              {item.label}
            </Text>
            <Text span inherit c="dimmed" fw={400}>
              {item.count}
            </Text>
          </Flex>
        )
      }))}
    />
  );
}
