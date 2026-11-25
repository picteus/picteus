import { ReactElement, ReactNode } from "react";
import { CloseButton, TextInput, TextInputProps } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import Common from "../Common/Common.ts";


type SearchInputPropsType =
  Omit<TextInputProps, "value" | "onChange" | "placeholder" | "leftSection" | "rightSection"> &
  {
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly placeholder: string;
    readonly emptyRightSection?: ReactNode;
  };

export default function SearchInput({
  value,
  onChange,
  placeholder,
  w = 260,
  size,
  emptyRightSection,
  rightSectionWidth,
  ...textInputProps
}: SearchInputPropsType): ReactElement
{
  const isSmall = size === "xs";
  const hasValue = value.length > 0;

  return (
    <TextInput
      w={w}
      size={size}
      leftSection={<IconSearch size={isSmall === true ? 14 : 16} stroke={Common.IconStrokeSize}/>}
      rightSection={hasValue === true ? (
        <CloseButton
          size={isSmall === true ? "xs" : "sm"}
          onClick={() => onChange("")}
        />
      ) : emptyRightSection}
      rightSectionWidth={hasValue === true ? undefined : rightSectionWidth}
      rightSectionPointerEvents={
        hasValue === true
          ? "all"
          : (emptyRightSection !== undefined ? "none" : undefined)
      }
      placeholder={placeholder}
      value={value}
      onChange={event => onChange(event.currentTarget.value)}
      {...textInputProps}
    />
  );
}
