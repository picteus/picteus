import { useEffect, useMemo, useState } from "react";
import { Group, Image, MultiSelect, MultiSelectProps, Stack, Text } from "@mantine/core";
import { WidgetProps } from "@rjsf/utils";

import { Extension, ExtensionImageTag } from "@picteus/ws-client";

import { ExtensionsService, RepositoriesService } from "../../../services";
import { t } from "i18next";


export default function TagsWidget(props: WidgetProps) {
    const { id, value, required, disabled, readonly, onChange, onBlur, onFocus, schema } = props;
    const [tags, setTags] = useState<ExtensionImageTag[]>([]);
    const [extensions, setExtensions] = useState<Extension[]>([]);

    useEffect(() => {
        RepositoriesService.getTags().then((remoteTags) => {
            setTags(remoteTags);
        });
        ExtensionsService.fetchAll().then((data) => {
            setExtensions(data.extensions);
        });
    }, []);

    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        tags.forEach(tag => {
            counts[tag.value] = (counts[tag.value] || 0) + 1;
        });
        return counts;
    }, [tags]);

    const selectData = useMemo(() => {
        return tags.map((tag) => ({
            value: JSON.stringify({ id: tag.id, value: tag.value }),
            label: tag.value,
        }));
    }, [tags]);

    const renderSelectOption: MultiSelectProps["renderOption"] = ({ option }) => {
        try {
            const tag: ExtensionImageTag = JSON.parse(option.value);
            const count = tagCounts[tag.value] || 0;

            if (count > 1) {
                const extension = extensions.find(e => e.manifest.id === tag.id);
                if (extension) {
                    const iconUrl = ExtensionsService.getSidebarAnchorIconURL(extension.manifest.id);
                    return (
                        <Group gap="sm">
                            <Image src={iconUrl} width={16} height={16} radius="sm" />
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
        } catch (e) {
            return <Text size="sm">{option.label}</Text>;
        }
    };

    const currentValue = useMemo(() => {
        if (!value || !Array.isArray(value)) return [];
        return value.map(v => {
            if (typeof v === "string") {
                const matchingTag = tags.find(t => t.value === v);
                if (matchingTag) {
                    return JSON.stringify({ id: matchingTag.id, value: matchingTag.value });
                }
                return JSON.stringify({ id: "unknown", value: v });
            }
            return JSON.stringify(v);
        });
    }, [value, tags]);

    return (
        <MultiSelect
            id={id}
            label={schema.title}
            description={schema.description}
            required={required}
            disabled={disabled || readonly}
            value={currentValue}
            onChange={(vals) => {
                const parsedVals = vals.map(v => {
                    try {
                        return JSON.parse(v).value;
                    } catch {
                        return v;
                    }
                });
                const uniqueVals = Array.from(new Set(parsedVals));
                onChange(uniqueVals.length > 0 ? uniqueVals : undefined);
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
