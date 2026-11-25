import { type ReactElement } from "react";
import {
  CheckIcon,
  Combobox,
  type ComboboxItem,
  type ComboboxLikeRenderOptionInput,
  Group,
  Select,
  type SelectProps
} from "@mantine/core";
import { type WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";

import { useRepositories } from "app/hooks";
import RepositoryIcon from "../../RepositoryIcon/RepositoryIcon.tsx";
import RepositoryIdentity from "../../RepositoryIdentity/RepositoryIdentity.tsx";


export default function RepositoryWidget(props: WidgetProps): ReactElement
{
  const [ t ] = useTranslation();
  const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
  const { data: repositories = [] } = useRepositories();

  const selectData = repositories.map((repository) => ({
    value: repository.id,
    label: repository.name
  }));
  const selectedRepository = value
    ? repositories.find((repository) => repository.id === value)
    : undefined;

  const renderSelectOption: SelectProps["renderOption"] = (item: ComboboxLikeRenderOptionInput<ComboboxItem>): ReactElement | null =>
  {
    const repository = repositories.find((aRepository) => aRepository.id === item.option.value);
    if (repository === undefined)
    {
      return null;
    }

    return (
      <Group gap="xs" wrap="nowrap" miw={0} flex={1}>
        {item.checked === true && <CheckIcon className={Combobox.classes.optionsDropdownCheckIcon}/>}
        <RepositoryIdentity
          repository={repository}
          description={repository.comment}
          size="sm"
        />
      </Group>
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
      leftSection={selectedRepository !== undefined ? <RepositoryIcon repository={selectedRepository}/> : undefined}
      onChange={(updatedValue) => onChange(updatedValue === null ? undefined : updatedValue)}
      onBlur={id && onBlur ? () => onBlur(id, value) : undefined}
      onFocus={id && onFocus ? () => onFocus(id, value) : undefined}
      data={selectData}
      renderOption={renderSelectOption}
      withCheckIcon
      withAlignedLabels
      searchable
      nothingFoundMessage={t("filters.noMatching")}
      placeholder={t("widgets.repositoryPlaceHolder")}
      clearable
      scrollAreaProps={{
        scrollbars: "y",
        styles: {
          content: {
            minWidth: 0,
            width: "100%"
          }
        }
      }}
      mb="md"
    />
  );
}
