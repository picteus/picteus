import React, { FocusEventHandler, useState } from "react";
import {
  CheckIcon,
  Combobox,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  ComboboxProps,
  Group,
  Select,
  SelectProps,
  Stack,
  Text
} from "@mantine/core";
import { useTranslation } from "react-i18next";

import { Collection } from "@picteus/ws-client";

import CollectionIcon from "../CollectionIcon/CollectionIcon.tsx";


type CollectionSelectType = {
  collections: Collection[];
  id?: string;
  label: string;
  description?: string;
  required?: boolean;
  disabled: boolean;
  initialValue?: any;
  comboboxProps?: ComboboxProps;
  onChange: (value: string | null, option: ComboboxItem<string>) => void;
  onBlur?: FocusEventHandler<HTMLInputElement> | undefined;
  onFocus?: FocusEventHandler<HTMLInputElement> | undefined;
};

export default function CollectionSelect({
  collections,
  id,
  label,
  description,
  required,
  disabled,
  initialValue,
  onChange,
  comboboxProps,
  onBlur,
  onFocus
}: CollectionSelectType)
{
  const [ t ] = useTranslation();
  const [ selectedId, setSelectedId ] = useState<string | null>(initialValue);

  const renderSelectOption: SelectProps["renderOption"] = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) =>
  {
    const collection = collections.find((aCollection) => aCollection.id.toString() === item.option.value);
    return (
      <Group gap={8}>
        {item.checked && <CheckIcon className={Combobox.classes.optionsDropdownCheckIcon}/>}
        <CollectionIcon collection={collection}/>
        <Stack gap={2}>
          <Text size="sm" fw={500}>{collection.name}</Text>
          {collection.comment && (
            <Text size="xs" opacity={0.65}>
              {collection.comment}
            </Text>
          )}
        </Stack>
      </Group>
    );
  };

  const data = collections.map((collection) => ({ value: collection.id.toString(), label: collection.name }));
  const selectedCollection = selectedId ? collections.find((collection) => collection.id.toString() === selectedId) : null;

  function handleOnChange(value: string | null, option: ComboboxItem<string>)
  {
    setSelectedId(value);
    onChange(value, option);
  }

  return (
    <Select
      id={id}
      label={label}
      description={description}
      leftSection={selectedCollection ? <CollectionIcon collection={selectedCollection}/> : undefined}
      leftSectionWidth={60}
      renderOption={renderSelectOption}
      placeholder={t("widgets.collectionPlaceHolder")}
      data={data}
      value={selectedId}
      required={required}
      disabled={disabled}
      onChange={handleOnChange}
      onBlur={onBlur}
      onFocus={onFocus}
      comboboxProps={comboboxProps}
      allowDeselect={false}
      withCheckIcon
      withAlignedLabels
      searchable
      nothingFoundMessage={t("filters.noMatching")}
    />
  );
}
