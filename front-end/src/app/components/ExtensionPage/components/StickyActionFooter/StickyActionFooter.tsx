import { ReactElement, ReactNode } from "react";
import { Box, Button, Divider, Flex, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";


type StickyActionFooterPropsType =
  {
    readonly dirtyCount: number;
    readonly isSaving: boolean;
    readonly isSaveDisabled: boolean;
    readonly leftExtra?: ReactNode;
    readonly onCancel: () => void;
    readonly onSave: () => void;
  };

export default function StickyActionFooter({
  dirtyCount,
  isSaving,
  isSaveDisabled,
  leftExtra,
  onCancel,
  onSave
}: StickyActionFooterPropsType): ReactElement
{
  const [ t ] = useTranslation();
  const isDirty = dirtyCount > 0;
  const statusLabel = t("extensionConfiguration.unsavedCount", { count: dirtyCount });

  return (
    <Box flex="0 0 auto" bg="var(--mantine-color-body)">
      <Divider/>
      <Flex px="md" py="sm" justify="space-between" align="center" gap="md" wrap="wrap">
        <Group gap="sm" align="center">
          <Text size="sm" c={isDirty === true ? "orange" : "dimmed"} fw={isDirty === true ? 500 : 400}>
            {statusLabel}
          </Text>
          {leftExtra}
        </Group>
        <Group gap="sm">
          <Button
            variant="subtle"
            disabled={isDirty === false || isSaving === true}
            onClick={onCancel}
          >
            {t("button.cancel")}
          </Button>
          <Button
            loading={isSaving}
            disabled={isSaveDisabled === true || isSaving === true}
            onClick={onSave}
          >
            {t("button.save")}
          </Button>
        </Group>
      </Flex>
    </Box>
  );
}
