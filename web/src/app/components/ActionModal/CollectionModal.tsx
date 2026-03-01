import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, Group, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import { Collection, SearchFilter } from "@picteus/ws-client";
import { CollectionService } from "app/services";
import { notifyError, notifySuccess } from "utils";

type CollectionModalProps = {
    collection?: Collection; // If provided, we are editing.
    searchFilter?: SearchFilter; // If not provided but we are editing, we can get it from the collection API
    onSuccess: () => void;
    onClose?: () => void;
};

export default function CollectionModal({
    collection,
    searchFilter,
    onSuccess,
    onClose,
}: CollectionModalProps) {
    const [t] = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);

    const form = useForm({
        initialValues: {
            name: collection?.name || "",
            comment: collection?.comment || "",
        },
        validate: {
            name: (value) => (value.trim().length === 0 ? t("fieldError.empty") : null),
        },
    });

    async function handleOnSubmit(values: typeof form.values) {
        setLoading(true);
        try {
            if (collection) {
                // Update existing collection
                await CollectionService.update(
                    collection.id,
                    values.name,
                    searchFilter,
                    values.comment
                );
                notifySuccess(t("collections.updateSuccess"));
            } else {
                // Create new collection
                await CollectionService.create(
                    values.name,
                    searchFilter,
                    values.comment
                );
                notifySuccess(t("collections.createSuccess"));
            }
            onSuccess();
            onClose?.();
        } catch (error) {
            notifyError((error as Error).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box p="sm">
            <form onSubmit={form.onSubmit(handleOnSubmit)}>
                <TextInput
                    label={t("field.name")}
                    required
                    placeholder={t("collections.namePlaceholder")}
                    {...form.getInputProps("name")}
                    mb="sm"
                />
                <Textarea
                    label={t("field.comment")}
                    placeholder={t("collections.commentPlaceholder")}
                    {...form.getInputProps("comment")}
                    mb="sm"
                />
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose} disabled={loading}>
                        {t("button.cancel")}
                    </Button>
                    <Button type="submit" loading={loading}>
                        {t("button.save")}
                    </Button>
                </Group>
            </form>
        </Box>
    );
}
