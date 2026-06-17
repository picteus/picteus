import { useEffect, useState } from "react";
import { ComboboxItem, ComboboxLikeRenderOptionInput, Select, SelectProps, Stack, Text } from "@mantine/core";
import { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { RepositoriesService } from "app/services";


export default function RepositoryWidget(props: WidgetProps)
{
  const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [t] = useTranslation();

  useEffect(() =>
  {
    RepositoriesService.fetchAll().then((repos) =>
    {
      setRepositories(repos);
    });
  }, []);

  const selectData = repositories.map((repository) => ({
    value: repository.id,
    label: repository.name
  }));

  const renderSelectOption: SelectProps["renderOption"] = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) =>
  {
    const repository = repositories.find((aRepository) => aRepository.id === item.option.value);
    if (!repository)
    {
      return null;
    }
    return (
      <Stack gap={2}>
        <Text size="sm" fw={500}>{repository.name}</Text>
        {repository.comment && (
          <Text size="xs" opacity={0.65}>
            {repository.comment}
          </Text>
        )}
        {repository.url && (
          <Text size="xs" opacity={0.65}>
            {repository.url}
          </Text>
        )}
      </Stack>
    );
  };

  return (
    <Select
      id={id}
      label={schema.title}
      description={schema.description}
      required={required}
      disabled={disabled || readonly}
      value={value || null}
      onChange={(val) => onChange(val === null ? undefined : val)}
      onBlur={id && onBlur ? () => onBlur(id, value) : undefined}
      onFocus={id && onFocus ? () => onFocus(id, value) : undefined}
      data={selectData}
      renderOption={renderSelectOption}
      searchable
      placeholder={t("widgets.repositoryPlaceHolder")}
      clearable
      mb="md"
    />
  );
}
