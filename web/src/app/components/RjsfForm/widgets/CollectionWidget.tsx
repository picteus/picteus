import { useEffect, useState } from "react";
import { Select, SelectProps, Stack, Text } from "@mantine/core";
import { WidgetProps } from "@rjsf/utils";

import { Collection } from "@picteus/ws-client";

import { CollectionService } from "../../../services";
import { t } from "i18next";


export default function CollectionWidget(props: WidgetProps) {
    const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
    const [collections, setCollections] = useState<Collection[]>([]);

    useEffect(() => {
        CollectionService.listAll().then((colls) => {
            setCollections(colls);
        });
    }, []);

    const selectData = collections.map((coll) => ({
        value: coll.id?.toString() || "", // Convert to string in case, though id in Select data is generally string
        label: coll.name,
    }));

    const renderSelectOption: SelectProps["renderOption"] = ({ option }) => {
        const item = collections.find((c) => c.id?.toString() === option.value);
        if (!item) return null;
        return (
            <Stack gap={2}>
                <Text size="sm" fw={500}>{item.name}</Text>
                {item.comment && (
                    <Text size="xs" opacity={0.65}>
                        {item.comment}
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
            value={value !== undefined && value !== null ? value.toString() : null}
            onChange={(val) => {
                // Convert value back to number if needed, but Rjsf generally prefers strings for string types
                // or number for number/integer schema properties. If the schama type is integer, we should convert it.
                if (val === null) {
                    onChange(undefined);
                } else {
                    onChange(schema.type === "integer" || schema.type === "number" ? Number(val) : val);
                }
            }}
            onBlur={id && onBlur ? () => onBlur(id, value) : undefined}
            onFocus={id && onFocus ? () => onFocus(id, value) : undefined}
            data={selectData}
            renderOption={renderSelectOption}
            searchable
            placeholder={t("widgets.collectionPlaceHolder")}
            clearable
            mb="md"
        />
    );
}
