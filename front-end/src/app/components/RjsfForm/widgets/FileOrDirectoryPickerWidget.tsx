import { ReactElement } from "react";
import { ActionIcon, TextInput } from "@mantine/core";
import { IconFileSearch, IconFolderSearch } from "@tabler/icons-react";
import { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import { useFileOrDirectoryPicker } from "app/hooks";


export type FileOrDirectoryPickerWidgetPropsType = WidgetProps & {
  readonly kind: "file" | "directory";
};

export default function FileOrDirectoryPickerWidget(props: FileOrDirectoryPickerWidgetPropsType): ReactElement
{
  const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema, label, hideLabel, placeholder, options, kind } = props;
  const [ t ] = useTranslation();
  const pickFileOrDirectory = useFileOrDirectoryPicker();

  async function handleOnClickBrowse(): Promise<void>
  {
    const currentPath = typeof value === "string" && value.trim() !== "" ? value : "";
    const selectedPath = await pickFileOrDirectory(kind, currentPath);
    if (selectedPath !== undefined)
    {
      onChange(selectedPath);
    }
  }

  const canBrowse = !disabled && !readonly;

  return (
    <TextInput
      id={id}
      label={hideLabel ? undefined : (schema.title || label)}
      description={schema.description}
      required={required}
      disabled={disabled || readonly}
      readOnly={readonly}
      value={typeof value === "string" ? value : ""}
      placeholder={placeholder || t(`widgets.${kind}PlaceHolder`)}
      onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
      {
        const updatedValue = event.currentTarget.value;
        onChange(updatedValue === "" ? options.emptyValue : updatedValue);
      }}
      onBlur={id && onBlur ? (): void =>
      {
        onBlur(id, value);
      } : undefined}
      onFocus={id && onFocus ? (): void =>
      {
        onFocus(id, value);
      } : undefined}
      rightSection={
        canBrowse ? (
          <ActionIcon
            onClick={(): void =>
            {
              void handleOnClickBrowse();
            }}
            variant="default"
            size="lg"
            aria-label={t(`useFileOrDirectoryPicker.${kind}`)}
            title={t(`useFileOrDirectoryPicker.${kind}`)}
          >
            {kind === "file" ? <IconFileSearch stroke={1.5}/> : <IconFolderSearch stroke={1.5}/>}
          </ActionIcon>
        ) : undefined
      }
      mb="md"
    />
  );
}
