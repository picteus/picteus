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
import CollectionLabel from "../CollectionLabel/CollectionLabel.tsx";


type CollectionSelectType = {
  collections: Collection[];
  id?: string;
  label: string;
  description?: string;
  required?: boolean;
  disabled: boolean;
  initialValue?: string;
  comboboxProps?: ComboboxProps;
  onChange: (value: string | null, option: ComboboxItem) => void;
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
    if (collection === undefined)
    {
      return null;
    }

    return (
      <Group gap="xs" wrap="nowrap" miw={0} flex={1}>
        {item.checked && <CheckIcon className={Combobox.classes.optionsDropdownCheckIcon}/>}
        <Stack gap={2} miw={0} flex={1}>
          <CollectionLabel collection={collection}/>
          {collection.comment && (
            <Text size="xs" c="dimmed" truncate="end">
              {collection.comment}
            </Text>
          )}
        </Stack>
      </Group>
    );
  };

  const data = collections.map((collection) => ({ value: collection.id.toString(), label: collection.name }));
  const selectedCollection = selectedId ? collections.find((collection) => collection.id.toString() === selectedId) : null;

  function handleOnChange(value: string | null, option: ComboboxItem)
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
      scrollAreaProps={{
        scrollbars: "y",
        styles: {
          content: {
            minWidth: 0,
            width: "100%"
          }
        }
      }}
    />
  );
}
