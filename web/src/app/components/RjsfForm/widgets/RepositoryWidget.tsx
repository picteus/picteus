import { useEffect, useState } from "react";
import { Select, SelectProps, Stack, Text } from "@mantine/core";
import { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";

import { Repository } from "@picteus/ws-client";

import { RepositoriesService } from "../../../services";


export default function RepositoryWidget(props: WidgetProps) {
    const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [t] = useTranslation();

    useEffect(() => {
        RepositoriesService.fetchAll().then((repos) => {
            setRepositories(repos);
        });
    }, []);

    const selectData = repositories.map((repo) => ({
        value: repo.id,
        label: repo.name,
    }));

    const renderSelectOption: SelectProps["renderOption"] = ({ option }) => {
        const item = repositories.find((r) => r.id === option.value);
        if (!item) return null;
        return (
            <Stack gap={2}>
                <Text size="sm" fw={500}>{item.name}</Text>
                {item.comment && (
                    <Text size="xs" opacity={0.65}>
                        {item.comment}
                    </Text>
                )}
                {item.url && (
                    <Text size="xs" opacity={0.65}>
                        {item.url}
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
