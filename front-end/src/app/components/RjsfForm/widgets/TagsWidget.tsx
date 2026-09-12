import { useMemo } from "react";
import { Group, MultiSelect, MultiSelectProps, Stack, Text } from "@mantine/core";
import { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";

import { ExtensionImageTag } from "@picteus/ws-client";

import { useExtensions, useTags } from "app/hooks";
import { ExtensionIcon } from "app/components";


export default function TagsWidget(props: WidgetProps)
{
  const [ t ] = useTranslation();
  const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
  const { data: tags = [] } = useTags();
  const { data: extensions = [] } = useExtensions();

  const tagCounts = useMemo(() =>
  {
    const counts: Record<string, number> = {};
    tags.forEach(tag =>
    {
      counts[tag.value] = (counts[tag.value] || 0) + 1;
    });
    return counts;
  }, [ tags ]);

  const selectData = useMemo(() =>
  {
    return tags.map((tag) => ({
      value: JSON.stringify({ id: tag.id, value: tag.value }),
      label: tag.value
    }));
  }, [ tags ]);

  const renderSelectOption: MultiSelectProps["renderOption"] = ({ option }) =>
  {
    try
    {
      const tag: ExtensionImageTag = JSON.parse(option.value);
      const count = tagCounts[tag.value] || 0;

      if (count > 1)
      {
        const extension = extensions.find(anExtension => anExtension.manifest.id === tag.id);
        if (extension)
        {
          return (
            <Group gap="sm">
              <ExtensionIcon idOrExtension={extension} size="sm"/>
              <Stack gap={2}>
                <Text size="sm">{tag.value}</Text>
                <Text size="xs" opacity={0.65}>
                  {extension.manifest.name}
                </Text>
              </Stack>
            </Group>
          );
        }
      }

      return <Text size="sm">{tag.value}</Text>;
    }
    catch
    {
      return <Text size="sm">{option.label}</Text>;
    }
  };

  const currentValue = useMemo(() =>
  {
    if (!value || !Array.isArray(value))
    {
      return [];
    }
    return value.map(item =>
    {
      if (typeof item === "string")
      {
        const matchingTag = tags.find(tagItem => tagItem.value === item);
        if (matchingTag)
        {
          return JSON.stringify({ id: matchingTag.id, value: matchingTag.value });
        }
        return JSON.stringify({ id: "unknown", value: item });
      }
      return JSON.stringify(item);
    });
  }, [ value, tags ]);

  return (
    <MultiSelect
      id={id}
      label={schema.title}
      description={schema.description}
      required={required}
      disabled={disabled || readonly}
      value={currentValue}
      onChange={(values) =>
      {
        const parsedValues = values.map(val =>
        {
          try
          {
            return JSON.parse(val).value;
          }
          catch
          {
            return val;
          }
        });
        const uniqueValues = Array.from(new Set(parsedValues));
        onChange(uniqueValues.length > 0 ? uniqueValues : undefined);
      }}
      onBlur={id && onBlur ? () => onBlur(id, value) : undefined}
      onFocus={id && onFocus ? () => onFocus(id, value) : undefined}
      data={selectData}
      renderOption={renderSelectOption}
      searchable
      placeholder={t("widgets.tagsPlaceHolder")}
      clearable
      mb="md"
    />
  );
}
